// ============================================================================
// @okdoc/plugin-sdk — Metadata Readers
//
// Read decorator metadata from a class WITHOUT instantiating it.
// Used by the host framework to discover plugin identity and tools statically.
// ============================================================================

import { OkDocPluginMetadata, McpToolMetadata, McpStaticToolDeclaration, OKDOC_SDK_VERSION, OKDOC_MCP_PROTOCOL_VERSION } from './types.js';
import { OKDOC_PLUGIN_KEY, MCP_TOOLS_KEY } from './symbols.js';

/**
 * Read @OkDocPlugin metadata from a component class.
 * Returns `null` if the class is not decorated.
 */
export function readPluginMetadata(componentClass: Function): OkDocPluginMetadata | null {
    return (componentClass as any)[OKDOC_PLUGIN_KEY] ?? null;
}

/**
 * Read @McpTool metadata from a component class prototype.
 * Returns an empty array if no methods are decorated.
 */
export function readToolMetadata(componentClass: Function): McpToolMetadata[] {
    return (componentClass.prototype as any)[MCP_TOOLS_KEY] ?? [];
}

/**
 * Read @McpTool metadata and convert to static tool declarations
 * (name + description + parameters, no handler).
 */
export function readStaticToolDeclarations(componentClass: Function): McpStaticToolDeclaration[] {
    return readToolMetadata(componentClass).map(meta => {
        const decl: McpStaticToolDeclaration = {
            name: meta.name ?? meta.methodName,
            description: meta.description,
        };
        if (meta.inputSchema != null) {
            decl.inputSchema = meta.inputSchema;
        }
        if (meta.annotations != null) {
            decl.annotations = meta.annotations;
        }
        return decl;
    });
}

/**
 * Auto-populate `sdkVersion` and `mcpProtocolVersion` on plugin metadata
 * if not already set. Call during plugin registration.
 */
export function enrichPluginMetadata(metadata: OkDocPluginMetadata): OkDocPluginMetadata {
    return {
        ...metadata,
        sdkVersion: metadata.sdkVersion ?? OKDOC_SDK_VERSION,
        mcpProtocolVersion: metadata.mcpProtocolVersion ?? OKDOC_MCP_PROTOCOL_VERSION,
    };
}
