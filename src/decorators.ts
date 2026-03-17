// ============================================================================
// @okdoc-ai/plugin-sdk — Decorators
// ============================================================================

import { OkDocPluginMetadata, McpToolMetadata, McpToolInputSchema, McpToolAnnotations } from './types.js';
import { OKDOC_PLUGIN_KEY, MCP_TOOLS_KEY } from './symbols.js';

// ── @OkDocPlugin ────────────────────────────────────────────────────────────

/** Namespace prefix automatically applied to packaged community plugins. */
const PACKAGED_NAMESPACE_PREFIX = 'odcp_';

/**
 * Class decorator that marks an Angular component as an OkDoc plugin.
 *
 * Stores manifest metadata on the class constructor so the host framework
 * can discover plugin identity, namespace, and icon without instantiation.
 *
 * The SDK automatically:
 * - Normalizes the namespace (hyphens → underscores)
 * - Prepends `odcp_` to the namespace (packaged community plugin prefix)
 * - Validates that `author` is provided with `name` and either `email` or `url`
 *
 * ```typescript
 * @OkDocPlugin({
 *   id: 'audio-player',
 *   name: 'Audio Player',
 *   description: 'Plays audio files via URL',
 *   version: '1.0.0',
 *   icon: 'musical-notes-outline',
 *   namespace: 'audio_player',
 *   author: { name: 'Your Company', url: 'https://example.com' },
 * })
 * @Component({ selector: 'okdoc-audio-player', standalone: true, ... })
 * export class AudioPlayerComponent { ... }
 * ```
 */
export function OkDocPlugin(metadata: OkDocPluginMetadata): ClassDecorator {
    // Validate author at decoration time
    const a = metadata.author;
    if (!a || typeof a !== 'object') {
        throw new Error('[OkDoc SDK] @OkDocPlugin requires "author" with at least "name" and either "email" or "url".');
    }
    if (!a.name || a.name.trim() === '') {
        throw new Error('[OkDoc SDK] @OkDocPlugin requires "author.name" to be a non-empty string.');
    }
    if ((!a.email || a.email.trim() === '') && (!a.url || a.url.trim() === '')) {
        throw new Error('[OkDoc SDK] @OkDocPlugin requires either "author.email" or "author.url".');
    }

    return function (target: Function) {
        // Normalize namespace and auto-prefix for packaged community plugins
        const resolved = {
            ...metadata,
            namespace: PACKAGED_NAMESPACE_PREFIX + metadata.namespace.replace(/-/g, '_'),
        };
        Object.defineProperty(target, OKDOC_PLUGIN_KEY, {
            value: resolved,
            writable: false,
            enumerable: false,
            configurable: false,
        });
    };
}

// ── @McpTool ────────────────────────────────────────────────────────────────

export interface McpToolOptions {
    /** Tool name override. Defaults to the method name. */
    name?: string;
    /** Human-readable description of this tool. */
    description: string;
    /** JSON Schema for tool arguments. Omit if the tool takes no arguments. */
    inputSchema?: McpToolInputSchema;
    /** Additional tool annotations (hints for clients). */
    annotations?: McpToolAnnotations;
}

/**
 * Method decorator that marks a method as an MCP-callable tool.
 *
 * Stores metadata on the class prototype under MCP_TOOLS_KEY so the host
 * framework can discover tool declarations without instantiation.
 *
 * The method becomes the tool handler when the component is live.
 * It receives parsed arguments and must return `Promise<McpToolResult>`.
 *
 * ```typescript
 * @McpTool({ description: 'Start audio playback' })
 * async play(): Promise<McpToolResult> {
 *   this.audioRef.nativeElement.play();
 *   return { content: [{ type: 'text', text: 'Playing' }] };
 * }
 * ```
 */
export function McpTool(options: McpToolOptions): MethodDecorator {
    return function (_target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor) {
        const proto = _target as Record<symbol, McpToolMetadata[]>;
        const existing: McpToolMetadata[] = proto[MCP_TOOLS_KEY] ? [...proto[MCP_TOOLS_KEY]] : [];

        const metadata: McpToolMetadata = {
            methodName: String(propertyKey),
            description: options.description,
        };
        if (options.name != null) {
            metadata.name = options.name;
        }
        if (options.inputSchema != null) {
            metadata.inputSchema = options.inputSchema;
        }
        if (options.annotations != null) {
            metadata.annotations = options.annotations;
        }

        existing.push(metadata);

        Object.defineProperty(proto, MCP_TOOLS_KEY, {
            value: existing,
            writable: true,
            enumerable: false,
            configurable: true,
        });
    };
}
