// ============================================================================
// @okdoc/plugin-sdk — Iframe SDK (standalone, no dependencies)
//
// This file is compiled into a self-contained IIFE (okdoc-iframe-sdk.js)
// that site owners include on their pages via <script> tag.
//
// Usage:
//   <script src="okdoc-iframe-sdk.js"></script>
//   <script>
//     OkDoc.init({ id: 'my-plugin', name: 'My Plugin', namespace: 'my', version: '1.0.0' });
//     OkDoc.registerTool('doSomething', {
//       description: 'Does something useful',
//       parameters: { type: 'object', properties: { input: { type: 'string' } } },
//       handler: async (args) => ({ content: [{ type: 'text', text: 'Done!' }] })
//     });
//   </script>
// ============================================================================

/** Protocol version this SDK implements */
const SDK_VERSION = 1;

interface ToolParameters {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
}

interface ToolResult {
    content: Array<{ type: 'text' | 'image' | 'resource'; text?: string; data?: string; mimeType?: string }>;
    isError?: boolean;
}

interface ToolConfig {
    description: string;
    parameters?: ToolParameters;
    handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

interface PluginManifest {
    id: string;
    name: string;
    description?: string;
    version: string;
    icon?: string;
    namespace: string;
    mode?: 'foreground' | 'background';
}

interface ToolDeclaration {
    name: string;
    description: string;
    parameters?: ToolParameters;
}

// Internal state
let manifest: PluginManifest | null = null;
const tools = new Map<string, ToolConfig>();
let port: MessagePort | null = null;
let sendTimer: ReturnType<typeof setTimeout> | null = null;

function buildToolDeclarations(): ToolDeclaration[] {
    const declarations: ToolDeclaration[] = [];
    tools.forEach((config, name) => {
        const decl: ToolDeclaration = { name, description: config.description };
        if (config.parameters) {
            decl.parameters = config.parameters;
        }
        declarations.push(decl);
    });
    return declarations;
}

function sendManifest(p: MessagePort): void {
    if (!manifest) return;
    p.postMessage({
        type: 'okdoc:manifest',
        sdkVersion: SDK_VERSION,
        manifest: {
            ...manifest,
            description: manifest.description ?? '',
            tools: buildToolDeclarations(),
        },
    });
}

/**
 * Schedule a manifest send after a short debounce (150ms).
 * This ensures that rapid init() + registerTool() calls in the same
 * tick produce a single manifest message with all tools included.
 */
function scheduleSendManifest(): void {
    if (!port || !manifest) return;
    if (sendTimer !== null) {
        clearTimeout(sendTimer);
    }
    sendTimer = setTimeout(() => {
        sendTimer = null;
        if (port && manifest) {
            sendManifest(port);
        }
    }, 150);
}

async function handleToolCall(
    p: MessagePort,
    id: string,
    toolName: string,
    args: Record<string, unknown>,
): Promise<void> {
    const tool = tools.get(toolName);
    if (!tool) {
        p.postMessage({
            type: 'okdoc:result',
            id,
            result: {
                content: [{ type: 'text', text: `Tool "${toolName}" not found in this plugin.` }],
                isError: true,
            },
        });
        return;
    }

    try {
        const result = await tool.handler(args);
        p.postMessage({ type: 'okdoc:result', id, result });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        p.postMessage({
            type: 'okdoc:result',
            id,
            result: {
                content: [{ type: 'text', text: `Tool "${toolName}" error: ${message}` }],
                isError: true,
            },
        });
    }
}

function onPortMessage(event: MessageEvent): void {
    const data = event.data;
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'okdoc:call') {
        handleToolCall(port!, data.id, data.tool, data.args ?? {});
    }
}

function onHandshake(event: MessageEvent): void {
    const data = event.data;
    if (!data || data.type !== 'okdoc:handshake') return;
    if (!event.ports || event.ports.length === 0) return;

    // Accept the port from the host
    port = event.ports[0];
    port.onmessage = onPortMessage;

    // Respond with manifest
    sendManifest(port);
}

// Listen for the handshake message from the host
window.addEventListener('message', onHandshake);

// ============================================================================
// Public API — exposed as window.OkDoc
// ============================================================================

const OkDoc = {
    /**
     * Initialize the plugin with its manifest.
     * Must be called before registerTool().
     */
    init(m: PluginManifest): void {
        manifest = m;
        // If the handshake already arrived before init(), schedule manifest send
        scheduleSendManifest();
    },

    /**
     * Register a tool that the host app (AI) can call.
     */
    registerTool(name: string, config: ToolConfig): void {
        tools.set(name, config);
        // Schedule manifest re-send so host sees updated tools (debounced)
        scheduleSendManifest();
    },

    /**
     * Send a notification message to the AI.
     * Only works after the host has connected via handshake.
     */
    notify(message: string): void {
        if (port) {
            port.postMessage({ type: 'okdoc:notify', message });
        }
    },

    /** Current SDK protocol version */
    version: SDK_VERSION,
};

// Expose globally
(window as any).OkDoc = OkDoc;
