// ============================================================================
// @okdoc/plugin-sdk — Metadata Readers
//
// Read decorator metadata from a class WITHOUT instantiating it.
// Used by the host framework to discover plugin identity and tools statically.
// ============================================================================

import { OkDocPluginMetadata, McpToolMetadata, McpStaticToolDeclaration } from './types';
import { OKDOC_PLUGIN_KEY, MCP_TOOLS_KEY } from './symbols';

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
        if (meta.parameters != null) {
            decl.parameters = meta.parameters;
        }
        return decl;
    });
}
