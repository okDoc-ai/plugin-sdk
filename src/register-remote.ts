// ============================================================================
// @okdoc-ai/plugin-sdk — Remote Plugin Registration
//
// Call registerRemotePlugin() at the end of your plugin bundle's entry point
// to make it discoverable by the OkDoc host application.
// ============================================================================

import { RemotePluginBundle, RemotePluginManifest, McpStaticToolDeclaration, OkDocPluginGlobal, OKDOC_SDK_VERSION, OKDOC_MCP_PROTOCOL_VERSION } from './types.js';

/**
 * Input type for registerRemotePlugin — tools are optional because the SDK
 * can derive them from toolHandlers keys. After registration the manifest
 * is guaranteed to have tools populated.
 */
export type RemotePluginBundleInput = {
    manifest: Omit<RemotePluginManifest, 'tools'> & { tools?: McpStaticToolDeclaration[] };
    toolHandlers: RemotePluginBundle['toolHandlers'];
};

declare global {
    interface Window {
        __OKDOC_PLUGINS__?: OkDocPluginGlobal;
    }
}

const ELEMENT_TAG_RE = /^[a-z][a-z0-9]*-[a-z0-9-]*$/;
const NAMESPACE_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Register a remote plugin so the OkDoc host app can discover it.
 *
 * Call this at the end of your plugin bundle after calling
 * `customElements.define(...)`. The host reads the registered bundle
 * to obtain the manifest (identity + tool declarations) and tool handlers.
 *
 * @example
 * ```ts
 * import { registerRemotePlugin } from '@okdoc-ai/plugin-sdk';
 *
 * customElements.define('okdoc-my-plugin', MyPluginElement);
 *
 * registerRemotePlugin({
 *   manifest: {
 *     id: 'my-plugin',
 *     name: 'My Plugin',
 *     description: 'Does cool stuff',
 *     version: '1.0.0',
 *     icon: 'sparkles-outline',
 *     namespace: 'my_plugin',
 *     elementTag: 'okdoc-my-plugin',
 *   },
 *   toolHandlers: {
 *     do_something: async (args) => ({
 *       content: [{ type: 'text', text: 'Done!' }],
 *     }),
 *   },
 * });
 * ```
 */
export function registerRemotePlugin(bundle: RemotePluginBundleInput): void {
    const m = bundle.manifest;

    if (!m?.id) {
        throw new Error('[OkDoc SDK] registerRemotePlugin: manifest.id is required');
    }
    if (!m.elementTag) {
        throw new Error('[OkDoc SDK] registerRemotePlugin: manifest.elementTag is required');
    }
    if (!ELEMENT_TAG_RE.test(m.elementTag)) {
        throw new Error(
            `[OkDoc SDK] registerRemotePlugin: elementTag "${m.elementTag}" must be a valid custom element name (lowercase, must contain a hyphen)`,
        );
    }
    if (m.namespace && !NAMESPACE_RE.test(m.namespace)) {
        throw new Error(
            `[OkDoc SDK] registerRemotePlugin: namespace "${m.namespace}" must be lowercase alphanumeric with underscores`,
        );
    }

    // Auto-populate SDK version info
    if (!m.sdkVersion) m.sdkVersion = OKDOC_SDK_VERSION;
    if (!m.mcpProtocolVersion) m.mcpProtocolVersion = OKDOC_MCP_PROTOCOL_VERSION;

    // Auto-populate tools from handler keys if not declared
    if (!m.tools || m.tools.length === 0) {
        m.tools = Object.keys(bundle.toolHandlers).map(name => ({
            name,
            description: `Tool "${name}" from ${m.name}`,
        }));
    }

    // Warn if toolHandlers don't match declared tools
    if (m.tools && m.tools.length > 0) {
        const declaredNames = new Set(m.tools.map(t => t.name));
        for (const handlerName of Object.keys(bundle.toolHandlers)) {
            if (!declaredNames.has(handlerName)) {
                console.warn(
                    `[OkDoc SDK] registerRemotePlugin: toolHandler "${handlerName}" has no matching tool declaration in manifest.tools`,
                );
            }
        }
    }

    if (!window.__OKDOC_PLUGINS__) {
        window.__OKDOC_PLUGINS__ = {};
    }

    if (window.__OKDOC_PLUGINS__[m.id]) {
        console.warn(`[OkDoc SDK] registerRemotePlugin: plugin "${m.id}" is already registered, overwriting`);
    }

    window.__OKDOC_PLUGINS__[m.id] = bundle as RemotePluginBundle;
}
