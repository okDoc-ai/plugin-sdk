/**
 * Build the standalone iframe SDK as a self-contained IIFE.
 * Output: dist/okdoc-iframe-sdk.js
 *
 * Usage: node scripts/build-iframe-sdk.mjs
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
    entryPoints: [resolve(__dirname, '../src/iframe-sdk.ts')],
    bundle: true,
    format: 'iife',
    globalName: '_okdocIframeSDK',
    outfile: resolve(__dirname, '../dist/okdoc-iframe-sdk.js'),
    target: 'es2020',
    minify: true,
    sourcemap: false,
    platform: 'browser',
    logLevel: 'info',
});

console.log('✅ okdoc-iframe-sdk.js built successfully');
