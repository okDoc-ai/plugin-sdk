# Iframe Plugin Developer Guide

This guide explains how site owners can turn any web page into an OkDoc iframe plugin.
Iframe plugins run inside a sandboxed `<iframe>` — no build tools, no Angular, no npm required.
Just include the SDK script, declare your tools, and you're done.

---

## Quick Start

### 1. Include the Iframe SDK

Add the OkDoc iframe SDK to your page:

```html
<script src="okdoc-iframe-sdk.js"></script>
```

> The SDK is a tiny standalone JavaScript file (~2 KB) with no dependencies.
> You can host it yourself, copy-paste it inline, or load it from a CDN.

### 2. Initialize Your Plugin

```html
<script>
  OkDoc.init({
    id: 'my-weather-plugin',
    name: 'Weather Tools',
    namespace: 'weather',
    version: '1.0.0',
    description: 'Provides real-time weather data',
    icon: 'cloud-outline',       // optional — Ionicon name
    mode: 'background',          // optional — 'background' (default) or 'foreground'
  });
</script>
```

### 3. Register Tools

```html
<script>
  OkDoc.registerTool('getWeather', {
    description: 'Get current weather for a city',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name' },
        units: { type: 'string', description: 'celsius or fahrenheit', enum: ['celsius', 'fahrenheit'] },
      },
      required: ['city'],
    },
    handler: async (args) => {
      const response = await fetch(`/api/weather?city=${encodeURIComponent(args.city)}`);
      const data = await response.json();
      return {
        content: [{ type: 'text', text: `Weather in ${args.city}: ${data.temp}° ${data.condition}` }],
      };
    },
  });

  OkDoc.registerTool('getForecast', {
    description: 'Get 5-day forecast for a city',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name' },
      },
      required: ['city'],
    },
    handler: async (args) => {
      const response = await fetch(`/api/forecast?city=${encodeURIComponent(args.city)}`);
      const data = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(data.forecast) }],
      };
    },
  });
</script>
```

### 4. Test

Serve your page on any HTTP server and enter the URL in the OkDoc Plugin Store
(select **Web Page** mode). The app will:

1. Open the page in a hidden iframe
2. Discover your tools via a handshake
3. Destroy the iframe (tools are registered as metadata only)
4. When the AI calls a tool, re-create the iframe and execute the handler
5. Keep the iframe alive for subsequent calls

---

## Full API Reference

### `OkDoc.init(manifest)`

Initialize the plugin. Must be called before `registerTool()`.

| Field         | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `id`          | string   | ✅       | Unique plugin ID |
| `name`        | string   | ✅       | Display name |
| `namespace`   | string   | ✅       | MCP namespace prefix for tools |
| `version`     | string   | ✅       | Semver version of your plugin |
| `description` | string   | ❌       | Short description |
| `icon`        | string   | ❌       | Ionicon name (e.g. `'globe-outline'`) |
| `mode`        | string   | ❌       | `'background'` (default) or `'foreground'` |

### `OkDoc.registerTool(name, config)`

Register a tool that the AI can call.

| Field         | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `name`        | string   | ✅       | Tool name within namespace |
| `config.description` | string | ✅  | Description for the AI |
| `config.parameters`  | object | ❌  | JSON Schema for arguments |
| `config.handler`     | function | ✅ | `async (args) => McpToolResult` |

**Handler return format:**

```typescript
{
  content: Array<{ type: 'text' | 'image' | 'resource'; text?: string; data?: string; mimeType?: string }>;
  isError?: boolean;
}
```

### `OkDoc.notify(message)`

Send a notification to the AI (only works after the host has connected).

```javascript
OkDoc.notify('Weather alert: Storm incoming for New York!');
```

### `OkDoc.version`

The protocol version this SDK implements (currently `1`).

---

## Plugin Modes

| Mode | Description | Iframe Visibility |
|------|-------------|-------------------|
| `background` | Tool-only — iframe is hidden | Hidden (default) |
| `foreground` | Tools + visible UI | Shown in plugin outlet area |

**Background plugins** appear in the Plugin Store with a **"Running"** badge
and a stop (■) button when active. Stopping destroys the iframe but keeps
tools registered — they'll re-activate on the next call.

**Foreground plugins** are shown in the main app area when active.
The iframe is rendered with default dimensions (100% width, 300px height).

---

## Protocol Version

The iframe SDK declares its protocol version during the handshake.
The host app checks this version for compatibility:

- **SDK version ≤ Host version**: Works. The host applies backward-compatible adapters if needed.
- **SDK version > Host version**: Rejected with a clear error asking the user to update the app.

Current protocol version: **1**

When you include the SDK, it automatically reports `sdkVersion: 1` during the handshake.
You don't need to set this manually.

---

## Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                        DISCOVERY                                  │
│  1. User pastes URL in Plugin Store (Web Page mode)              │
│  2. Host creates hidden iframe → loads your page                 │
│  3. Host sends handshake with MessageChannel port                │
│  4. SDK responds with manifest + tool declarations               │
│  5. Host registers tools (metadata only) → destroys iframe       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      ACTIVATION (on first tool call)             │
│  1. AI calls a tool → handler proxy triggers activation          │
│  2. Host re-creates iframe → re-does handshake                   │
│  3. Host sends tool call via MessageChannel port                 │
│  4. SDK routes to registered handler → returns result            │
│  5. Iframe stays alive for subsequent calls                      │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        STOP / DISABLE                            │
│  • Stop: Iframe destroyed, tools stay registered (deferred)      │
│  • Disable: Iframe destroyed, tools unregistered                 │
│  • Remove: Everything cleaned up                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Communication Protocol (Advanced)

The host and iframe communicate via **MessageChannel** — a private port pair
that prevents cross-talk between multiple plugins.

| Direction | Message Type | When |
|-----------|-------------|------|
| Host → iframe | `okdoc:handshake` (via `postMessage` with `port2`) | On iframe load |
| iframe → Host | `okdoc:manifest` (via port) | Response to handshake |
| Host → iframe | `okdoc:call` (via port) | AI calls a tool |
| iframe → Host | `okdoc:result` (via port) | Tool execution result |
| iframe → Host | `okdoc:notify` (via port) | Push notification to AI |

Each `okdoc:call` includes a unique `id` that the `okdoc:result` echoes back
for correlation (supports concurrent tool calls).

---

## Troubleshooting

### Plugin not discovered

- Make sure `OkDoc.init()` and `OkDoc.registerTool()` run synchronously
  during page load (before the handshake timeout of 10 seconds).
- Check browser console for errors in your page.
- Ensure the page loads without authentication redirects.

### Tool call times out

- Tool handlers have a 30-second timeout.
- If your handler needs longer, consider returning a "processing" message
  and using `OkDoc.notify()` to send the result when ready.

### CORS issues

- The iframe loads your page as-is. Your page must be accessible from the
  app's origin. For local development, serve on `localhost` with CORS headers.

### Mobile (Capacitor)

- iOS WKWebView and Android WebView support cross-origin iframes.
- If your page uses features requiring HTTPS, ensure your dev server uses HTTPS.

---

## Example

See `okdoc-community-plugins/okdoc-plugin-iframe-sample/index.html` for a
complete working example with two sample tools.
