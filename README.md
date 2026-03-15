# @okdoc/plugin-sdk

[![CI](https://github.com/okDoc-ai/okdoc-ai-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/okDoc-ai/okdoc-ai-sdk/actions/workflows/ci.yml)
[![GitHub Release](https://img.shields.io/github/v/release/okDoc-ai/okdoc-ai-sdk)](https://github.com/okDoc-ai/okdoc-ai-sdk/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

SDK for building **okDoc AI-powered plugins**. Provides MCP-aligned types, decorators, AI format converters, and a standalone iframe SDK for creating plugins that integrate with the okDoc voice assistant.

## Plugin types

| Type | Runtime | Best for |
|------|---------|----------|
| **Iframe plugin** | Standalone HTML page in an `<iframe>` | Third-party developers, any tech stack, full isolation |
| **Remote plugin** | Angular web component loaded at runtime | First-party / trusted plugins, deep host integration |

## Quick start — Iframe plugin (no npm required)

Add a single `<script>` tag and declare your tools:

```html
<script src="https://cdn.jsdelivr.net/gh/okDoc-ai/okdoc-ai-sdk@1.0.0/cdn/okdoc-iframe-sdk.js"></script>
<script>
  const sdk = OkDocIframeSDK.create({
    pluginId: 'my-plugin',
    displayName: 'My Plugin',
    tools: [
      {
        name: 'greet',
        description: 'Say hello',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string', description: 'Name to greet' } },
          required: ['name'],
        },
        handler: async ({ name }) => ({
          content: [{ type: 'text', text: `Hello, ${name}!` }],
        }),
      },
    ],
  });
</script>
```

> **TypeScript support:** Drop [`okdoc-iframe-sdk-global.d.ts`](cdn/okdoc-iframe-sdk-global.d.ts) into your project for full autocompletion.

See the full guide: [DOCS/IframePluginGuide.md](DOCS/IframePluginGuide.md)

## Quick start — Remote plugin (Angular)

```bash
npm install @okdoc/plugin-sdk
```

```typescript
import { OkDocPlugin, McpTool } from '@okdoc/plugin-sdk';

@OkDocPlugin({
  pluginId: 'weather',
  displayName: 'Weather Plugin',
  version: '1.0.0',
})
class WeatherPlugin {
  @McpTool({
    name: 'get_weather',
    description: 'Get the current weather for a city',
    inputSchema: {
      type: 'object',
      properties: { city: { type: 'string', description: 'City name' } },
      required: ['city'],
    },
  })
  async getWeather({ city }: { city: string }) {
    return { content: [{ type: 'text', text: `Weather in ${city}: Sunny, 25°C` }] };
  }
}
```

See the full guide: [DOCS/RemotePluginGuide.md](DOCS/RemotePluginGuide.md)

## Exports

| Import path | Purpose |
|-------------|---------|
| `@okdoc/plugin-sdk` | Core types, decorators (`@OkDocPlugin`, `@McpTool`), metadata readers, registration |
| `@okdoc/plugin-sdk/angular` | Angular integration (`OkDocNotifier`, `OKDOC_NOTIFIER_TOKEN`) |
| `@okdoc/plugin-sdk/handler` | Host-side AI format converters (`toGeminiFunctionDeclarations`, `toOpenAiFunctions`) |

## CDN / jsdelivr

The standalone iframe SDK is served via [jsdelivr](https://www.jsdelivr.com/):

```
https://cdn.jsdelivr.net/gh/okDoc-ai/okdoc-ai-sdk@<version>/cdn/okdoc-iframe-sdk.js
```

Replace `<version>` with a specific tag (e.g. `1.0.0`) or use semver ranges (`@1`, `@1.0`).

## Documentation

| Guide | Description |
|-------|-------------|
| [Iframe Plugin Guide](DOCS/IframePluginGuide.md) | Build iframe plugins (any tech stack, no npm) |
| [Remote Plugin Guide](DOCS/RemotePluginGuide.md) | Build Angular remote plugins |
| [Sample Remote Component Guide](DOCS/SampleRemoteComponentDevelopmentGuide.md) | Step-by-step sample remote component |
| [Ionic Angular Project Setup](DOCS/IonicAngularProjectSetup.md) | Host app project setup reference |

## Building from source

```bash
npm install
npm run build:all    # TypeScript compilation + iframe SDK bundle
```

Build outputs:
- `dist/` — ES module library (main SDK)
- `dist/okdoc-iframe-sdk.js` — Standalone IIFE bundle for `<script>` tags
- `cdn/` — jsdelivr-ready copies of the iframe SDK files

## Releasing

Releases are created automatically when a version tag is pushed:

```bash
# 1. Bump version in package.json, src/types.ts, and src/iframe-sdk.ts
# 2. Build and commit
npm run build:all
git add -A
git commit -m "release: v1.1.0"
git tag v1.1.0
git push origin main --tags
```

The CI pipeline will:
- Verify the tag version matches `package.json`
- Build and type-check the project
- Create a GitHub Release with the SDK zip and standalone iframe files

## License

[Apache License 2.0](LICENSE) — Copyright 2025 okDoc AI
