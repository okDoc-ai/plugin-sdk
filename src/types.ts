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
