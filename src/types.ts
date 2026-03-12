// ============================================================================
// @okdoc/plugin-sdk — Types
// ============================================================================

/** JSON Schema for tool parameters */
export interface McpToolParameters {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: readonly string[] | string[];
}

/** Content item within a tool result */
export interface McpContent {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
}

/** Result returned by a tool handler */
export interface McpToolResult {
    content: McpContent[];
    isError?: boolean;
}

/** Metadata stored by @OkDocPlugin on the class constructor */
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
    icon: string;
    /** MCP namespace prefix for all tools (e.g. 'audio_player') */
    namespace: string;
}

/** Metadata stored by @McpTool on each method */
export interface McpToolMetadata {
    /** Method name on the class (set by the decorator) */
    methodName: string;
    /** Tool name override. Defaults to methodName. */
    name?: string;
    /** Human-readable description for the AI */
    description: string;
    /** JSON Schema for tool arguments */
    parameters?: McpToolParameters;
}

/** Static tool declaration (no handler) — derived from @McpTool metadata */
export interface McpStaticToolDeclaration {
    name: string;
    description: string;
    parameters?: McpToolParameters;
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
export interface RemotePluginManifest extends OkDocPluginMetadata {
    /** Custom element tag name (must contain a hyphen, e.g. 'okdoc-timer') */
    elementTag: string;
    /** Framework used to build the plugin (informational) */
    framework?: 'angular' | 'react' | 'vanilla';
    /** Static tool declarations. If omitted, derived from toolHandlers keys. */
    tools?: McpStaticToolDeclaration[];
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

/** Shape of the global plugin registry on `window` */
export interface OkDocPluginGlobal {
    [pluginId: string]: RemotePluginBundle;
}
