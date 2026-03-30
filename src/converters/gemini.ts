// ============================================================================
// @okdoc-ai/plugin-sdk — Gemini Format Converter
//
// Converts MCP tool declarations to Google Gemini FunctionDeclaration format.
// ============================================================================

import { McpStaticToolDeclaration, JsonSchemaProperty } from '../types.js';

// ── Gemini Types ────────────────────────────────────────────────────────────

/**
 * Gemini Schema type enum.
 * @see https://ai.google.dev/api/rest/v1beta/Schema#Type
 */
export type GeminiSchemaType = 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';

/** Gemini Schema (subset matching FunctionDeclaration.parameters). */
export interface GeminiSchema {
    type: GeminiSchemaType;
    description?: string;
    enum?: string[];
    items?: GeminiSchema;
    properties?: Record<string, GeminiSchema>;
    required?: string[];
}

/** Gemini FunctionDeclaration. */
export interface GeminiFunctionDeclaration {
    name: string;
    description: string;
    parameters?: GeminiSchema;
}

// ── Conversion ──────────────────────────────────────────────────────────────

const TYPE_MAP: Record<string, GeminiSchemaType> = {
    string: 'STRING',
    number: 'NUMBER',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    array: 'ARRAY',
    object: 'OBJECT',
};

function mapType(jsonType?: string | string[]): GeminiSchemaType {
    if (!jsonType) return 'STRING';
    const t = Array.isArray(jsonType) ? jsonType[0] : jsonType;
    return TYPE_MAP[t] ?? 'STRING';
}

function convertProperty(prop: JsonSchemaProperty): GeminiSchema {
    const schema: GeminiSchema = { type: mapType(prop.type) };

    if (prop.description) schema.description = prop.description;

    if (prop.enum && prop.enum.every(v => typeof v === 'string')) {
        schema.enum = prop.enum as string[];
    }

    if (prop.items && !Array.isArray(prop.items)) {
        schema.items = convertProperty(prop.items);
    }

    if (prop.properties) {
        schema.properties = {};
        for (const [key, val] of Object.entries(prop.properties)) {
            schema.properties[key] = convertProperty(val);
        }
    }

    if (prop.required) schema.required = prop.required;

    return schema;
}

/**
 * Convert MCP tool declarations to Gemini FunctionDeclaration format.
 */
export function toGeminiFunctionDeclarations(
    tools: McpStaticToolDeclaration[],
): GeminiFunctionDeclaration[] {
    return tools.map(tool => {
        const decl: GeminiFunctionDeclaration = {
            name: tool.name,
            description: tool.description,
        };

        if (tool.inputSchema) {
            const params: GeminiSchema = { type: 'OBJECT' };
            if (tool.inputSchema.properties) {
                params.properties = {};
                for (const [key, val] of Object.entries(tool.inputSchema.properties)) {
                    params.properties[key] = convertProperty(val);
                }
            }
            if (tool.inputSchema.required) {
                params.required = tool.inputSchema.required;
            }
            decl.parameters = params;
        } else {
            // Gemini Live API requires a parameters field even for no-arg tools,
            // otherwise it returns 1008 "Operation not implemented" errors.
            decl.parameters = { type: 'OBJECT' };
        }

        return decl;
    });
}
