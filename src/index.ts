// ============================================================================
// @okdoc/plugin-sdk — Public API
//
// This is the main entry point. Angular-specific exports are in ./angular.
// Host-side handler & converters are in ./handler.
// ============================================================================

// Version constants
export {
    OKDOC_MCP_PROTOCOL_VERSION,
    OKDOC_SDK_VERSION,
    OKDOC_IFRAME_PROTOCOL_VERSION,
} from './types.js';

// Core types
export type {
    JsonSchemaProperty,
    McpToolInputSchema,
    McpAnnotations,
    McpTextContent,
    McpImageContent,
    McpAudioContent,
    McpEmbeddedResource,
    McpResourceLink,
    McpContentBlock,
    McpToolAnnotations,
    McpToolResult,
    McpStaticToolDeclaration,
    McpToolMetadata,
    OkDocPluginMetadata,
    OkDocPluginManifest,
    RemotePluginManifest,
    RemotePluginBundle,
    OkDocPluginGlobal,
    // Iframe plugin types
    IframePluginManifest,
    OkDocIframeHandshake,
    OkDocIframeManifestMessage,
    OkDocIframeCallMessage,
    OkDocIframeResultMessage,
    OkDocIframeNotifyMessage,
    OkDocIframePortMessage,
    // Host-side types
    McpToolProvider,
    McpToolDefinition,
    McpComponentConfig,
} from './types.js';

// Symbols
export { OKDOC_PLUGIN_KEY, MCP_TOOLS_KEY } from './symbols.js';

// Decorators
export { OkDocPlugin, McpTool } from './decorators.js';
export type { McpToolOptions } from './decorators.js';

// Metadata readers
export { readPluginMetadata, readToolMetadata, readStaticToolDeclarations, enrichPluginMetadata } from './metadata.js';

// Remote plugin registration
export { registerRemotePlugin } from './register-remote.js';
export type { RemotePluginBundleInput } from './register-remote.js';
