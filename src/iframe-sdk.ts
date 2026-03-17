// ============================================================================
// @okdoc-ai/plugin-sdk — Iframe SDK (standalone, no dependencies)
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
//       inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
//       handler: async (args) => ({ content: [{ type: 'text', text: 'Done!' }] })
//     });
//   </script>
// ============================================================================

import type {
    JsonSchemaProperty,
    ToolInputSchema,
    Annotations,
    ToolAnnotations,
    ContentBlock,
    ToolResult,
    ToolConfig,
    InitOptions,
    PluginAuthor,
} from './iframe-sdk-types.js';

/** Iframe protocol version this SDK implements */
const SDK_VERSION = 2;

/** MCP protocol version this SDK targets */
const MCP_PROTOCOL_VERSION = '2025-03-26';

/** SDK package version — injected at build time by esbuild from package.json */
declare const __OKDOC_SDK_VERSION__: string;

// ── Internal types (not exposed to plugin developers) ───────────────────────

type ManifestData = Omit<InitOptions, 'allowedOrigins'>;

interface ToolDeclaration {
    name: string;
    description: string;
    inputSchema?: ToolInputSchema;
    annotations?: ToolAnnotations;
}

// ── Internal state ──────────────────────────────────────────────────────────

let manifest: ManifestData | null = null;
let allowedOrigins: string[] | null = null;
const tools = new Map<string, ToolConfig>();
let port: MessagePort | null = null;
let sendTimer: ReturnType<typeof setTimeout> | null = null;

// ── Validation ──────────────────────────────────────────────────────────────

const REQUIRED_INIT_FIELDS: (keyof InitOptions)[] = ['id', 'name', 'namespace', 'version'];

/** Namespace prefix automatically applied to iframe plugins. */
const IFRAME_NAMESPACE_PREFIX = 'odci_';

function validateInitOptions(options: InitOptions): void {
    if (!options || typeof options !== 'object') {
        throw new Error('[OkDoc SDK] init() requires an options object.');
    }
    for (const field of REQUIRED_INIT_FIELDS) {
        const value = options[field];
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            throw new Error(`[OkDoc SDK] init() requires "${field}" to be a non-empty string.`);
        }
    }
    // Validate author
    const a = options.author;
    if (!a || typeof a !== 'object') {
        throw new Error('[OkDoc SDK] init() requires "author" with at least "name" and either "email" or "url".');
    }
    if (!a.name || typeof a.name !== 'string' || a.name.trim() === '') {
        throw new Error('[OkDoc SDK] init() requires "author.name" to be a non-empty string.');
    }
    if ((!a.email || a.email.trim() === '') && (!a.url || a.url.trim() === '')) {
        throw new Error('[OkDoc SDK] init() requires either "author.email" or "author.url" to be provided.');
    }
}

function buildToolDeclarations(): ToolDeclaration[] {
    const declarations: ToolDeclaration[] = [];
    tools.forEach((config, name) => {
        const decl: ToolDeclaration = { name, description: config.description };
        if (config.inputSchema) {
            decl.inputSchema = config.inputSchema;
        }
        if (config.annotations) {
            decl.annotations = config.annotations;
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
            sdkVersion: __OKDOC_SDK_VERSION__,
            mcpProtocolVersion: MCP_PROTOCOL_VERSION,
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

    // Origin validation
    if (allowedOrigins) {
        if (!allowedOrigins.includes(event.origin)) {
            console.warn(`[OkDoc SDK] Rejected handshake from untrusted origin: ${event.origin}`);
            return;
        }
    } else {
        console.warn(
            '[OkDoc SDK] No allowedOrigins configured — accepting handshake from any origin. ' +
            'Set allowedOrigins in OkDoc.init() for production use.',
        );
    }

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
    init(options: InitOptions): void {
        validateInitOptions(options);
        const { allowedOrigins: origins, ...m } = options;
        // Normalize namespace (hyphens → underscores) and auto-prefix for iframe plugins
        m.namespace = IFRAME_NAMESPACE_PREFIX + m.namespace.replace(/-/g, '_');
        manifest = m;
        allowedOrigins = origins ?? null;
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
            console.log('[OkDoc SDK] Sending notification to host:', message);
            port.postMessage({ type: 'okdoc:notify', message });
        } else {
            console.warn('[OkDoc SDK] notify() called but no port connected — handshake not completed yet.');
        }
    },

    /**
     * Clean up the SDK: remove event listeners, close port, clear state.
     */
    destroy(): void {
        window.removeEventListener('message', onHandshake);
        if (sendTimer !== null) {
            clearTimeout(sendTimer);
            sendTimer = null;
        }
        if (port) {
            port.close();
            port = null;
        }
        manifest = null;
        allowedOrigins = null;
        tools.clear();
    },

    /** Current iframe protocol version */
    version: SDK_VERSION,

    /** MCP protocol version this SDK targets */
    mcpProtocolVersion: MCP_PROTOCOL_VERSION,
};

// Expose globally (frozen, non-writable)
Object.defineProperty(window, 'OkDoc', {
    value: Object.freeze(OkDoc),
    writable: false,
    configurable: false,
});
