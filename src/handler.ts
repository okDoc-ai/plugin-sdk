// ============================================================================
// @okdoc/plugin-sdk/handler — Host-side AI format converters
//
// Import from '@okdoc/plugin-sdk/handler'.
// ============================================================================

export { toGeminiFunctionDeclarations } from './converters/gemini.js';
export type { GeminiFunctionDeclaration, GeminiSchema, GeminiSchemaType } from './converters/gemini.js';

export { toOpenAiFunctions } from './converters/openai.js';
export type { OpenAiFunctionTool, OpenAiFunctionDefinition, OpenAiJsonSchema } from './converters/openai.js';
