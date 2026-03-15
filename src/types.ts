// ============================================================================
// @okdoc/plugin-sdk — Types
//
// Aligned with MCP spec 2025-03-26 (baseline) with forward hooks
// for 2025-11-25 features (outputSchema, structuredContent, resource_link).
// ============================================================================

// ── Version Constants ───────────────────────────────────────────────────────

/** The MCP protocol version this SDK targets */
export const OKDOC_MCP_PROTOCOL_VERSION = '2025-03-26';

/** The OkDoc SDK version (semver) — keep in sync with package.json and iframe-sdk.ts SDK_PACKAGE_VERSION */
export const OKDOC_SDK_VERSION = '1.0.0';

/**
 * Current protocol version for iframe plugin communication.
 * Bumped (integer) only on breaking changes to the message format.
 */
export const OKDOC_IFRAME_PROTOCOL_VERSION = 2;

// ── JSON Schema ─────────────────────────────────────────────────────────────

/** A JSON Schema property definition (subset of JSON Schema 2020-12). */
export interface JsonSchemaProperty {
    type?: string | string[];
    description?: string;
    enum?: unknown[];
    const?: unknown;
    default?: unknown;
    // String
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;
    // Number
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
    // Array
    items?: JsonSchemaProperty | JsonSchemaProperty[];
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
    // Object (nested)
    properties?: Record<string, JsonSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean | JsonSchemaProperty;
    // Composition
    oneOf?: JsonSchemaProperty[];
    anyOf?: JsonSchemaProperty[];
    allOf?: JsonSchemaProperty[];
    not?: JsonSchemaProperty;
    // Extension
    [key: string]: unknown;
}

/**
 * JSON Schema for MCP tool input parameters.
 * Must be `type: 'object'` at the root level per MCP spec.
 */
export interface McpToolInputSchema {
    type: 'object';
    properties?: Record<string, JsonSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean | JsonSchemaProperty;
    $schema?: string;
}

// ── MCP Content Types (aligned with MCP ContentBlock) ───────────────────────

/** Optional annotations on content blocks and resources. */
export interface McpAnnotations {
    /** Intended audience(s) for the content. */
    audience?: ('user' | 'assistant')[];
    /** Importance hint, 0 (least) to 1 (most). */
    priority?: number;
    /** ISO 8601 timestamp for the most recent modification. */
    lastModified?: string;
}

/** Text provided to or from the LLM. */
export interface McpTextContent {
    type: 'text';
    text: string;
    annotations?: McpAnnotations;
}

/** An image (base64-encoded). */
export interface McpImageContent {
    type: 'image';
    data: string;
    /** MIME type of the image (required per MCP spec). */
    mimeType: string;
    annotations?: McpAnnotations;
}

/** Audio data (base64-encoded). */
export interface McpAudioContent {
    type: 'audio';
    data: string;
    /** MIME type of the audio (required per MCP spec). */
    mimeType: string;
    annotations?: McpAnnotations;
}

/** The contents of a resource, embedded into a tool result. */
export interface McpEmbeddedResource {
    type: 'resource';
    resource: {
        uri: string;
        mimeType?: string;
        text?: string;
        blob?: string;
    };
    annotations?: McpAnnotations;
}

/** A resource link (2025-11-25). */
export interface McpResourceLink {
    type: 'resource_link';
    uri: string;
    name: string;
    description?: string;
    mimeType?: string;
    annotations?: McpAnnotations;
}

/** Union of all MCP content block types. */
export type McpContentBlock =
    | McpTextContent
    | McpImageContent
    | McpAudioContent
    | McpEmbeddedResource
    | McpResourceLink;

// ── Tool Annotations ────────────────────────────────────────────────────────

/**
 * Additional properties describing a Tool to clients.
 * All properties are **hints** — not guaranteed to be faithful.
 */
export interface McpToolAnnotations {
    /** A human-readable title for the tool. */
    title?: string;
    /** If true, the tool does not modify its environment. Default: false. */
    readOnlyHint?: boolean;
    /** If true, the tool may perform destructive updates. Default: true. */
    destructiveHint?: boolean;
    /** If true, calling repeatedly with same args has no additional effect. Default: false. */
    idempotentHint?: boolean;
    /** If true, the tool may interact with an open world of external entities. Default: true. */
    openWorldHint?: boolean;
}

// ── Tool Result ─────────────────────────────────────────────────────────────

/** Result returned by a tool handler. */
export interface McpToolResult {
    content: McpContentBlock[];
    /** Structured output matching `outputSchema`, if declared (2025-11-25). */
    structuredContent?: Record<string, unknown>;
    /** Whether the tool call ended in an error. */
    isError?: boolean;
}

// ── Tool Declaration & Metadata ─────────────────────────────────────────────

/** Metadata stored by @OkDocPlugin on the class constructor. */
export interface OkDocPluginMetadata {
    /** Unique plugin identifier (e.g. 'simple-audio-player') */
    id: string;
    /** Display name shown in the Plugin Store */
    name: string;
    /** Short description shown in the Plugin Store */
    description: string;
    /** Semver version string */
    version: string;
    /** Ionicon name for the store card (e.g. 'musical-notes-outline') */
    icon?: string;
    /** MCP namespace prefix for all tools (e.g. 'audio_player') */
    namespace: string;
    /** Semver of the @okdoc/plugin-sdk this plugin was built with */
    sdkVersion?: string;
    /** MCP protocol version this plugin conforms to (e.g. '2025-03-26') */
    mcpProtocolVersion?: string;
}

/** Metadata stored by @McpTool on each method. */
export interface McpToolMetadata {
    /** Method name on the class (set by the decorator) */
    methodName: string;
    /** Tool name override. Defaults to methodName. */
    name?: string;
    /** Human-readable description for the AI */
    description: string;
    /** JSON Schema for tool arguments */
    inputSchema?: McpToolInputSchema;
    /** Additional tool annotations (hints for clients) */
    annotations?: McpToolAnnotations;
}

/** Static tool declaration (no handler) — derived from @McpTool metadata. */
export interface McpStaticToolDeclaration {
    name: string;
    description: string;
    inputSchema?: McpToolInputSchema;
    /** Output schema for typed results (2025-11-25). */
    outputSchema?: McpToolInputSchema;
    /** Additional tool annotations (hints for clients). */
    annotations?: McpToolAnnotations;
}

// ── Plugin Manifest (resolved identity + tools) ─────────────────────────────

/**
 * A resolved plugin manifest: identity metadata + tool declarations.
 *
 * This is the base for all concrete manifest types (remote, iframe, host-side).
 * Unlike `OkDocPluginMetadata` (which is the decorator config and has no tools),
 * a manifest always carries its tool declarations.
 */
export interface OkDocPluginManifest extends OkDocPluginMetadata {
    /** Static tool declarations for this plugin */
    tools: McpStaticToolDeclaration[];
}

// ============================================================================
// Remote Plugin Types — for dynamically-loaded Web Component plugins
// ============================================================================

/**
 * Manifest for a remotely-loaded plugin (Web Component boundary).
 *
 * Unlike bundled plugins (which use @OkDocPlugin decorator on an Angular class),
 * remote plugins register via `window.__OKDOC_PLUGINS__[id]` and render as
 * Custom Elements. This manifest describes the plugin for the host app.
 */
export interface RemotePluginManifest extends OkDocPluginManifest {
    /** Custom element tag name (must contain a hyphen, e.g. 'okdoc-timer') */
    elementTag: string;
    /** Framework used to build the plugin (informational) */
    framework?: 'angular' | 'react' | 'vanilla';
}

/**
 * The bundle object that a remote plugin registers on `window.__OKDOC_PLUGINS__`.
 *
 * Plugin developers call `registerRemotePlugin(bundle)` at the end of their
 * bundle's entry point.
 */
export interface RemotePluginBundle {
    /** Plugin manifest with identity, tools, and element tag */
    manifest: RemotePluginManifest;
    /** Map of tool name → handler function. Tool names must match manifest tool names. */
    toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<McpToolResult>>;
}

/** Shape of the global plugin registry on `window`. */
export interface OkDocPluginGlobal {
    [pluginId: string]: RemotePluginBundle;
}

// ============================================================================
// Iframe Plugin Types — for cross-origin iframe-based plugins
// ============================================================================

/**
 * Manifest for an iframe-based plugin.
 *
 * Iframe plugins run inside a cross-origin `<iframe>`. The host discovers
 * tools via a MessageChannel handshake, then destroys the iframe. On tool
 * call the iframe is re-created and the tool is invoked via the port.
 */
export interface IframePluginManifest extends OkDocPluginManifest {
    /** Display mode: foreground (visible UI) or background (hidden) */
    mode?: 'foreground' | 'background';
}

// ---- Iframe protocol messages ----

/** Host → iframe: initial handshake (sent via window.postMessage with port2). */
export interface OkDocIframeHandshake {
    type: 'okdoc:handshake';
    /** Iframe protocol version the host supports */
    version: number;
    /** MCP protocol version the host supports */
    mcpProtocolVersion?: string;
    /** SDK version the host is running */
    hostSdkVersion?: string;
}

/** iframe → host: manifest response (sent on the MessageChannel port). */
export interface OkDocIframeManifestMessage {
    type: 'okdoc:manifest';
    /** Protocol version the iframe SDK implements */
    sdkVersion: number;
    /** Plugin manifest with tool declarations */
    manifest: IframePluginManifest;
}

/** host → iframe: tool call request (sent on the MessageChannel port). */
export interface OkDocIframeCallMessage {
    type: 'okdoc:call';
    /** Unique call ID for correlating the response */
    id: string;
    /** Tool name (within namespace, e.g. 'getWeather') */
    tool: string;
    /** Tool arguments */
    args: Record<string, unknown>;
}

/** iframe → host: tool call result (sent on the MessageChannel port). */
export interface OkDocIframeResultMessage {
    type: 'okdoc:result';
    /** Correlates with the call ID */
    id: string;
    /** Tool execution result */
    result: McpToolResult;
}

/** iframe → host: push notification to AI (sent on the MessageChannel port). */
export interface OkDocIframeNotifyMessage {
    type: 'okdoc:notify';
    /** Notification text for the AI */
    message: string;
}

/** Union of all messages that flow over the MessageChannel port. */
export type OkDocIframePortMessage =
    | OkDocIframeManifestMessage
    | OkDocIframeCallMessage
    | OkDocIframeResultMessage
    | OkDocIframeNotifyMessage;

// ============================================================================
// Host-Side Types — for host applications that manage MCP tool registries
// ============================================================================

/**
 * Contract that plugin components/services implement to expose MCP tools.
 * The host registry reads tools from this interface during registration.
 */
export interface McpToolProvider {
    getMcpTools(): McpToolDefinition[];
}

/**
 * A single tool definition exposed by a plugin at runtime.
 *
 * Extends the static declaration with host-side fields: a namespace,
 * a fully-qualified name, and an optional live handler.
 */
export interface McpToolDefinition {
    /** Tool name within namespace (e.g. 'play') */
    name: string;
    /** Fully qualified name (e.g. 'audio_player_play'). Set by the host registry. */
    fullName?: string;
    /** Namespace this tool belongs to. Set by the host registry. */
    namespace?: string;
    /** Human-readable description for the AI */
    description: string;
    /** JSON Schema describing input parameters (omit for no-arg tools) */
    inputSchema?: McpToolInputSchema;
    /** Tool annotations — hints for AI clients (readOnlyHint, destructiveHint, etc.) */
    annotations?: McpToolAnnotations;
    /** The handler function invoked when the AI calls this tool. Absent for deferred (manifest-only) tools. */
    handler?: (args: Record<string, unknown>) => Promise<McpToolResult>;
}

/** Configuration passed when registering a plugin component with the host registry. */
export interface McpComponentConfig {
    /** Namespace prefix for tool names (e.g. 'audio_player') */
    namespace: string;
}
