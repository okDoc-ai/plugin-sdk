// ============================================================================
// @okdoc/plugin-sdk — Public API
// ============================================================================

// Types
export {
    McpToolParameters,
    McpContent,
    McpToolResult,
    McpStaticToolDeclaration,
    McpToolMetadata,
    OkDocPluginMetadata,
    RemotePluginManifest,
    RemotePluginBundle,
    OkDocPluginGlobal,
    // Iframe plugin types
    OKDOC_IFRAME_PROTOCOL_VERSION,
    IframePluginManifest,
    OkDocIframeHandshake,
    OkDocIframeManifestMessage,
    OkDocIframeCallMessage,
    OkDocIframeResultMessage,
    OkDocIframeNotifyMessage,
    OkDocIframePortMessage,
} from './types';

// Symbols
export { OKDOC_PLUGIN_KEY, MCP_TOOLS_KEY } from './symbols';

// Decorators
export { OkDocPlugin, McpTool, McpToolOptions } from './decorators';

// Metadata readers
export { readPluginMetadata, readToolMetadata, readStaticToolDeclarations } from './metadata';

// Notifier
export { OkDocNotifier, OKDOC_NOTIFIER_TOKEN } from './notifier';

// Remote plugin registration
export { registerRemotePlugin } from './register-remote';
