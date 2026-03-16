// ============================================================================
// @okdoc-ai/plugin-sdk — OpenAI Format Converter
//
// Converts MCP tool declarations to OpenAI function calling format.
// ============================================================================

import { McpStaticToolDeclaration, McpToolInputSchema } from '../types.js';

// ── OpenAI Types ────────────────────────────────────────────────────────────

/** OpenAI function definition (inside a tool object). */
export interface OpenAiFunctionDefinition {
    name: string;
    description?: string;
    parameters?: OpenAiJsonSchema;
    strict?: boolean;
}

/** OpenAI tool object with type "function". */
export interface OpenAiFunctionTool {
    type: 'function';
    function: OpenAiFunctionDefinition;
}

/** JSON Schema as accepted by OpenAI (passthrough — OpenAI uses standard JSON Schema). */
export interface OpenAiJsonSchema {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
}

// ── Conversion ──────────────────────────────────────────────────────────────

function convertInputSchema(schema: McpToolInputSchema): OpenAiJsonSchema {
    const result: OpenAiJsonSchema = { type: 'object' };

    if (schema.properties) {
        result.properties = schema.properties;
    }
    if (schema.required) {
        result.required = schema.required;
    }
    if (schema.additionalProperties !== undefined) {
        result.additionalProperties = typeof schema.additionalProperties === 'boolean'
            ? schema.additionalProperties
            : false;
    }

    return result;
}

/**
 * Convert MCP tool declarations to OpenAI function tool format.
 */
export function toOpenAiFunctions(
    tools: McpStaticToolDeclaration[],
): OpenAiFunctionTool[] {
    return tools.map(tool => {
        const fn: OpenAiFunctionDefinition = { name: tool.name };

        if (tool.description) fn.description = tool.description;

        if (tool.inputSchema) {
            fn.parameters = convertInputSchema(tool.inputSchema);
        }

        return { type: 'function' as const, function: fn };
    });
}
