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
const REQUIRED_MANIFEST_FIELDS: (keyof RemotePluginManifest)[] = ['id', 'name', 'namespace', 'version', 'elementTag'];

/** Namespace prefix automatically applied to packaged community plugins. */
const PACKAGED_NAMESPACE_PREFIX = 'odcp_';

function validateManifest(m: Partial<RemotePluginManifest>): void {
    for (const field of REQUIRED_MANIFEST_FIELDS) {
        const value = (m as Record<string, unknown>)[field];
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            throw new Error(`[OkDoc SDK] registerRemotePlugin: manifest.${field} is required and must be a non-empty string.`);
        }
    }
    // Validate author
    const a = (m as Record<string, unknown>).author as Record<string, unknown> | undefined;
    if (!a || typeof a !== 'object') {
        throw new Error('[OkDoc SDK] registerRemotePlugin: manifest.author is required with at least "name" and either "email" or "url".');
    }
    if (!a.name || typeof a.name !== 'string' || (a.name as string).trim() === '') {
        throw new Error('[OkDoc SDK] registerRemotePlugin: manifest.author.name is required and must be a non-empty string.');
    }
    if ((!a.email || (a.email as string).trim() === '') && (!a.url || (a.url as string).trim() === '')) {
        throw new Error('[OkDoc SDK] registerRemotePlugin: manifest.author requires either "email" or "url".');
    }
}

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

    validateManifest(m as Partial<RemotePluginManifest>);

    if (!ELEMENT_TAG_RE.test(m.elementTag)) {
        throw new Error(
            `[OkDoc SDK] registerRemotePlugin: elementTag "${m.elementTag}" must be a valid custom element name (lowercase, must contain a hyphen)`,
        );
    }
    // Normalize namespace (hyphens → underscores) before validation
    m.namespace = m.namespace.replace(/-/g, '_');
    if (!NAMESPACE_RE.test(m.namespace)) {
        throw new Error(
            `[OkDoc SDK] registerRemotePlugin: namespace "${m.namespace}" must be lowercase alphanumeric with underscores`,
        );
    }
    // Auto-prefix namespace for packaged community plugins
    m.namespace = PACKAGED_NAMESPACE_PREFIX + m.namespace;

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
