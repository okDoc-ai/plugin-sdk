// ============================================================================
// @okdoc/plugin-sdk — Remote Plugin Registration
//
// Call registerRemotePlugin() at the end of your plugin bundle's entry point
// to make it discoverable by the OkDoc host application.
// ============================================================================

import { RemotePluginBundle, OkDocPluginGlobal } from './types';

declare global {
    interface Window {
        __OKDOC_PLUGINS__?: OkDocPluginGlobal;
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
 * import { registerRemotePlugin } from '@okdoc/plugin-sdk';
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
export function registerRemotePlugin(bundle: RemotePluginBundle): void {
    if (!bundle.manifest?.id) {
        throw new Error('[OkDoc SDK] registerRemotePlugin: manifest.id is required');
    }
    if (!bundle.manifest?.elementTag) {
        throw new Error('[OkDoc SDK] registerRemotePlugin: manifest.elementTag is required');
    }

    if (!window.__OKDOC_PLUGINS__) {
        window.__OKDOC_PLUGINS__ = {};
    }
    window.__OKDOC_PLUGINS__[bundle.manifest.id] = bundle;
}
