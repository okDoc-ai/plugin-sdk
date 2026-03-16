// ============================================================================
// @okdoc-ai/plugin-sdk — Iframe SDK Type Definitions (single source of truth)
//
// These interfaces define the public API available to iframe plugin developers
// via the global `OkDoc` object.
//
// ★ The build script auto-generates `dist/okdoc-iframe-sdk-global.d.ts` from
//   the tsc-emitted declarations of this file. It strips `export`, adds the
//   `OkDoc` prefix to all type names, and appends `declare var OkDoc: ...`.
//
// ★ To update the global d.ts: edit THIS file, then run `npm run build:all`.
//   Never edit the generated d.ts manually.
// ============================================================================

// ── JSON Schema ─────────────────────────────────────────────────────────────

export interface JsonSchemaProperty {
    type?: string | string[];
    description?: string;
    enum?: unknown[];
    const?: unknown;
    default?: unknown;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;
    minimum?: number;
    maximum?: number;
    items?: JsonSchemaProperty | JsonSchemaProperty[];
    minItems?: number;
    maxItems?: number;
    properties?: Record<string, JsonSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean | JsonSchemaProperty;
    oneOf?: JsonSchemaProperty[];
    anyOf?: JsonSchemaProperty[];
    allOf?: JsonSchemaProperty[];
    not?: JsonSchemaProperty;
    [key: string]: unknown;
}

export interface ToolInputSchema {
    type: 'object';
    properties?: Record<string, JsonSchemaProperty>;
    required?: string[];
}

// ── Content & Results ───────────────────────────────────────────────────────

export interface Annotations {
    audience?: ('user' | 'assistant')[];
    priority?: number;
    lastModified?: string;
}

export interface ToolAnnotations {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
}

export interface ContentBlock {
    type: 'text' | 'image' | 'audio' | 'resource' | 'resource_link';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
    name?: string;
    description?: string;
    resource?: { uri: string; mimeType?: string; text?: string; blob?: string };
    annotations?: Annotations;
}

export interface ToolResult {
    content: ContentBlock[];
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
}

// ── Tool & Plugin Config ────────────────────────────────────────────────────

export interface ToolConfig {
    description: string;
    inputSchema?: ToolInputSchema;
    annotations?: ToolAnnotations;
    handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface InitOptions {
    /** Unique plugin identifier */
    id: string;
    /** Display name shown in the Plugin Store */
    name: string;
    /** Short description */
    description?: string;
    /** Semver version of the plugin */
    version: string;
    /** Ionicon name for the store card */
    icon?: string;
    /** MCP namespace prefix for all tools */
    namespace: string;
    /** Display mode: foreground (visible UI) or background (hidden) */
    mode?: 'foreground' | 'background';
    /** Allowed origins for the host handshake. If omitted, any origin is accepted. */
    allowedOrigins?: string[];
}

// ── OkDoc Global API ────────────────────────────────────────────────────────

export interface IframeSDK {
    /** Initialize the plugin with its manifest. Must be called before registerTool(). */
    init(options: InitOptions): void;

    /** Register a tool that the host app (AI) can call. */
    registerTool(name: string, config: ToolConfig): void;

    /**
     * Send a notification message to the AI.
     * Only works after the host has connected via handshake.
     */
    notify(message: string): void;

    /** Clean up the SDK: remove event listeners, close port, clear state. */
    destroy(): void;

    /** Current iframe protocol version */
    readonly version: number;

    /** MCP protocol version this SDK targets */
    readonly mcpProtocolVersion: string;
}
