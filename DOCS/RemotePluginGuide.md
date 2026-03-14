# OkDoc Remote Plugin Developer Guide

## Overview

Remote plugins are **self-contained JavaScript bundles** loaded from any URL at runtime. Unlike bundled plugins (which ship inside the host app), remote plugins:

- Can be developed, built, and hosted **independently**
- Use **Web Components** (Custom Elements) as the rendering boundary
- Support **any framework**: Angular, React, Lit, Svelte, vanilla JS
- Register MCP tools with **pre-bound handlers** — no deferred activation needed
- Are loaded via the Plugin Store "Load from URL" button

**Architecture:**
```
┌──────────────────────────────┐
│  Plugin Bundle (plugin.js)   │
│  ┌────────────────────────┐  │
│  │  Custom Element tag    │  │   ← Web Component boundary
│  │  (e.g. <my-widget>)   │  │
│  └────────────────────────┘  │
│  ┌────────────────────────┐  │
│  │  registerRemotePlugin()│  │   ← SDK registration call
│  │  { manifest, tools }   │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
           │  <script src="...">
           ▼
┌──────────────────────────────┐
│  OkDoc Host App              │
│  ┌──────────────┐            │
│  │ RemoteLoader  │ → reads window.__OKDOC_PLUGINS__
│  │ PluginRegistry│ → registers tools with MCP
│  │ PluginOutlet  │ → creates <my-widget> in DOM
│  └──────────────┘            │
└──────────────────────────────┘
```

---

## Quick Start (Angular)

### 1. Create a new Angular project

```bash
ng new my-okdoc-plugin --style=scss --ssr=false --skip-tests
cd my-okdoc-plugin
npm install @angular/elements @okdoc/plugin-sdk
```

### 2. Create your component

```typescript
// src/app/my-widget.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { McpToolResult } from '@okdoc/plugin-sdk';

// Global instance registry for tool handlers
(window as any).__OKDOC_PLUGIN_INSTANCES__ ??= {};

@Component({
  selector: 'okdoc-my-widget',
  standalone: true,
  template: `
    <div class="widget">
      <h3>My Widget</h3>
      <p>{{ message }}</p>
    </div>
  `,
  styles: [`
    .widget {
      padding: 16px;
      border-radius: 12px;
      background: #f0f4ff;
      font-family: sans-serif;
    }
  `]
})
export class MyWidgetComponent implements OnInit, OnDestroy {
  message = 'Hello from remote plugin!';

  ngOnInit(): void {
    // Register this instance so tool handlers can find it
    (window as any).__OKDOC_PLUGIN_INSTANCES__['my-widget'] = this;
  }

  ngOnDestroy(): void {
    delete (window as any).__OKDOC_PLUGIN_INSTANCES__['my-widget'];
  }

  // MCP tool handler
  async handleSetMessage(args: Record<string, unknown>): Promise<McpToolResult> {
    this.message = String(args['message'] ?? '');
    return { content: [{ type: 'text', text: `Message set to: ${this.message}` }] };
  }
}
```

### 3. Bootstrap as Custom Element

Replace `src/main.ts` with:

```typescript
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { registerRemotePlugin, McpToolResult } from '@okdoc/plugin-sdk';
import { MyWidgetComponent } from './app/my-widget.component';

function getInstance(): MyWidgetComponent | null {
  return (window as any).__OKDOC_PLUGIN_INSTANCES__?.['my-widget'] ?? null;
}

(async () => {
  const app = await createApplication({ providers: [] });
  const MyElement = createCustomElement(MyWidgetComponent, { injector: app.injector });
  customElements.define('okdoc-my-widget', MyElement);

  registerRemotePlugin({
    manifest: {
      id: 'my-widget',
      name: 'My Widget',
      description: 'A sample widget plugin',
      version: '1.0.0',
      icon: 'cube-outline',
      namespace: 'my_widget',
      elementTag: 'okdoc-my-widget',
      framework: 'angular',
      tools: [
        {
          name: 'set_message',
          description: 'Set the widget message text',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'The message to display' },
            },
            required: ['message'],
          },
        },
      ],
    },
    toolHandlers: {
      set_message: async (args) => {
        const inst = getInstance();
        if (!inst) {
          return { content: [{ type: 'text', text: 'Widget not visible yet.' }] };
        }
        return inst.handleSetMessage(args);
      },
    },
  });
})();
```

### 4. Configure angular.json for bundling

In `angular.json`, set `outputHashing` to `"none"` so filenames are predictable:

```json
{
  "projects": {
    "my-okdoc-plugin": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "outputHashing": "none"
            }
          }
        }
      }
    }
  }
}
```

### 5. Create a bundle script

Angular's esbuild `application` builder outputs **ESM** (`export` statements).
A classic `<script>` tag cannot parse ESM, so we use **esbuild** to re-bundle
the Angular output into a single **IIFE** file.

Install esbuild as a dev dependency:

```bash
npm install -D esbuild
```

Create `scripts/bundle.mjs`:

```javascript
import { build } from 'esbuild';
import { join } from 'path';
import { stat } from 'fs/promises';

const DIST_BROWSER = join(import.meta.dirname, '..', 'dist', 'browser');
const OUTPUT = join(import.meta.dirname, '..', 'dist', 'plugin.js');

await build({
  entryPoints: [join(DIST_BROWSER, 'main.js')],
  bundle: true,
  format: 'iife',      // ← critical: wraps everything in an IIFE
  outfile: OUTPUT,
  minify: true,
  logLevel: 'info',
});

const { size } = await stat(OUTPUT);
console.log(`✓ Bundled into dist/plugin.js (${(size / 1024).toFixed(1)} KB)`);
```

### 6. Add a `postbuild` hook and build

In `package.json`, add a `postbuild` script so the IIFE step runs **automatically** after every build:

```json
"scripts": {
  "build": "ng build --configuration production",
  "postbuild": "node scripts/bundle.mjs",
  "serve": "npx http-server dist --cors -p 8787"
}
```

Now just run:

```bash
# Build Angular + auto-rebundle as IIFE (postbuild runs automatically)
npm run build

# Serve locally for testing
npm run serve
```

### 7. Load in OkDoc

1. Open OkDoc → Settings → Plugin Store
2. Paste `http://localhost:8787/plugin.js` in the URL input
3. Click **Load**
4. The plugin appears with a "Remote" badge
5. Toggle it on — the widget renders in the Plugin Outlet
6. The AI can now call `my_widget_set_message`

---

## Quick Start (React)

### 1. Create a Vite + React project

```bash
npm create vite@latest my-okdoc-react-plugin -- --template react-ts
cd my-okdoc-react-plugin
npm install @okdoc/plugin-sdk r2wc-react-to-web-component
```

### 2. Create your component

```tsx
// src/MyCounter.tsx
import React, { useState, useEffect } from 'react';

// Global instance for tool handlers
let currentInstance: { count: number; setCount: (n: number) => void } | null = null;
export function getInstance() { return currentInstance; }

export default function MyCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    currentInstance = { count, setCount };
    return () => { currentInstance = null; };
  });

  return (
    <div style={{ padding: 16, background: '#f0f0f0', borderRadius: 12, textAlign: 'center' }}>
      <h3>React Counter Plugin</h3>
      <p style={{ fontSize: 48, fontWeight: 'bold' }}>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <button onClick={() => setCount(c => c - 1)}>−</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

### 3. Wrap as Web Component and register

```tsx
// src/main.tsx
import r2wc from 'r2wc-react-to-web-component';
import { registerRemotePlugin } from '@okdoc/plugin-sdk';
import MyCounter, { getInstance } from './MyCounter';

// Convert React component to Web Component
const CounterElement = r2wc(MyCounter, { props: {} });
customElements.define('okdoc-react-counter', CounterElement);

// Register with OkDoc
registerRemotePlugin({
  manifest: {
    id: 'react-counter',
    name: 'React Counter',
    description: 'A counter widget built with React',
    version: '1.0.0',
    icon: 'logo-react',
    namespace: 'react_counter',
    elementTag: 'okdoc-react-counter',
    framework: 'react',
    tools: [
      { name: 'get_count', description: 'Get current count' },
      { name: 'increment', description: 'Increment by 1' },
      { name: 'set', description: 'Set to value', parameters: {
        type: 'object',
        properties: { value: { type: 'number', description: 'Value to set' } },
        required: ['value'],
      }},
    ],
  },
  toolHandlers: {
    get_count: async () => {
      const inst = getInstance();
      return { content: [{ type: 'text', text: `Count: ${inst?.count ?? 'N/A'}` }] };
    },
    increment: async () => {
      const inst = getInstance();
      inst?.setCount(inst.count + 1);
      return { content: [{ type: 'text', text: `Incremented to ${(inst?.count ?? 0) + 1}` }] };
    },
    set: async (args) => {
      const inst = getInstance();
      const val = Number(args.value);
      inst?.setCount(val);
      return { content: [{ type: 'text', text: `Set to ${val}` }] };
    },
  },
});
```

### 4. Configure Vite for single-file IIFE output

The host loads plugins via a classic `<script>` tag, so the output **must** be IIFE (not ESM).

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'plugin.js',
        format: 'iife',  // ← critical: classic <script> can't load ESM
      },
    },
    cssCodeSplit: false,
  },
});
```

### 5. Build and serve

```bash
npm run build
npx http-server dist --cors -p 8788
```

Load URL: `http://localhost:8788/plugin.js`

---

## Manifest Reference

The manifest describes your plugin to the OkDoc host. Pass it to `registerRemotePlugin()`.

```typescript
interface RemotePluginManifest {
  id: string;           // Unique plugin ID (e.g. 'my-widget')
  name: string;         // Display name in Plugin Store
  description: string;  // Short description
  version: string;      // Semver (e.g. '1.0.0')
  icon: string;         // Ionicon name (e.g. 'cube-outline')
  namespace: string;    // MCP tool name prefix (e.g. 'my_widget')
  elementTag: string;   // Custom Element tag (must contain a hyphen)
  framework?: string;   // 'angular' | 'react' | 'vanilla' (informational)
  tools?: McpStaticToolDeclaration[];  // Tool declarations (see below)
}
```

### Tool Declarations

Each tool in the `tools` array:

```typescript
interface McpStaticToolDeclaration {
  name: string;                // Tool name (without namespace prefix)
  description: string;         // Human-readable description for AI
  parameters?: {               // JSON Schema for arguments (omit for no-arg tools)
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
    }>;
    required?: string[];
  };
}
```

**Tool naming:** The host auto-prefixes tool names with `{namespace}_`. So a tool named `increment` in namespace `my_counter` becomes `my_counter_increment` when the AI sees it.

### Tool Handlers

Tool handlers are async functions that receive arguments and return `McpToolResult`:

```typescript
toolHandlers: {
  tool_name: async (args: Record<string, unknown>) => {
    // Do something...
    return {
      content: [{ type: 'text', text: 'Result message' }],
      isError: false,  // optional, default false
    };
  },
}
```

Every tool in `manifest.tools` must have a corresponding handler in `toolHandlers`.

---

## Instance Access Pattern

Since your component runs inside a Custom Element (Shadow DOM boundary), tool handlers need a way to access the live component instance. The recommended pattern:

### Angular

```typescript
// In component:
(window as any).__OKDOC_PLUGIN_INSTANCES__ ??= {};

@Component({ ... })
export class MyComponent implements OnInit, OnDestroy {
  ngOnInit() {
    (window as any).__OKDOC_PLUGIN_INSTANCES__['my-plugin'] = this;
  }
  ngOnDestroy() {
    delete (window as any).__OKDOC_PLUGIN_INSTANCES__['my-plugin'];
  }
}

// In main.ts:
function getInstance() {
  return (window as any).__OKDOC_PLUGIN_INSTANCES__?.['my-plugin'] ?? null;
}
```

### React

```tsx
let instance = null;

function MyComponent() {
  const [state, setState] = useState(...);
  useEffect(() => {
    instance = { state, setState };
    return () => { instance = null; };
  });
  return <div>...</div>;
}

export function getInstance() { return instance; }
```

### Vanilla / Lit

```javascript
class MyElement extends HTMLElement {
  connectedCallback() {
    window.__OKDOC_PLUGIN_INSTANCES__['my-plugin'] = this;
  }
  disconnectedCallback() {
    delete window.__OKDOC_PLUGIN_INSTANCES__['my-plugin'];
  }
}
```

---

## Lifecycle

1. **Load**: User pastes URL → host injects `<script>` tag → bundle executes
2. **Register**: Bundle calls `registerRemotePlugin()` → host reads `window.__OKDOC_PLUGINS__[id]`
3. **Verify**: Host validates manifest + checks `customElements.get(tag)` succeeds
4. **Enable**: Host registers MCP tools → AI can now call them
5. **Render**: Plugin Outlet creates `<your-tag>` in DOM → component renders
6. **Tool Call**: AI calls tool → host finds pre-bound handler → handler uses instance
7. **Disable**: Host removes element from DOM, unregisters tools
8. **Remove**: Host deletes the plugin entirely, untracks URL

Remote plugin URLs are **persisted** — they reload automatically when the app restarts.

---

## Custom Element Tag Rules

- Must contain a hyphen (`-`) — W3C requirement
- Must be globally unique across all loaded plugins
- Convention: prefix with `okdoc-` (e.g. `okdoc-my-widget`)
- Tag is registered via `customElements.define('okdoc-my-widget', MyElement)`

---

## Hosting Your Plugin

The bundle (`plugin.js`) can be hosted anywhere that serves static files with CORS headers:

| Option | Example URL |
|--------|-------------|
| Local dev | `http://localhost:8787/plugin.js` |
| GitHub Pages | `https://user.github.io/my-plugin/plugin.js` |
| CDN | `https://cdn.example.com/plugins/my-plugin/v1.0.0/plugin.js` |
| S3 / GCS / Azure Blob | `https://my-bucket.s3.amazonaws.com/plugin.js` |

**CORS requirement:** The server must allow cross-origin requests. For local dev, use `--cors` flag with `http-server`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No plugin was registered" | Your bundle must call `registerRemotePlugin()`. Check console for errors in the bundle. |
| `Unexpected token 'export'` | Your bundle contains ESM `export` statements. Use esbuild with `format: 'iife'` (see step 5). |
| "Custom Element not defined" | Make sure `customElements.define(tag, Element)` is called before `registerRemotePlugin()`. |
| "Plugin already loaded" | Same URL can't be loaded twice. Remove the existing plugin first. |
| "ID already exists" | Another plugin (bundled or remote) has the same `id`. Change your manifest `id`. |
| Tools not working | Make sure `toolHandlers` keys match `tools[].name` exactly. |
| Component not rendering | Check that your Custom Element tag matches `manifest.elementTag`. |
| CORS error | Your server must send `Access-Control-Allow-Origin: *` headers. |

---

## SDK Exports for Remote Plugins

| Export | Purpose |
|--------|---------|
| `registerRemotePlugin()` | Register your plugin with the OkDoc host |
| `RemotePluginManifest` | Type — manifest shape |
| `RemotePluginBundle` | Type — manifest + toolHandlers |
| `McpToolResult` | Type — what tool handlers return |
| `McpContent` | Type — content item in a result |
| `McpStaticToolDeclaration` | Type — tool declaration |

---

## Example: Full Angular Elements Plugin

See the working example at:
`okdoc-community-plugins/okdoc-plugin-angular-elements-sample/`

This includes:
- `src/app/sample-counter.component.ts` — Counter widget with 5 MCP tools
- `src/main.ts` — Custom Element bootstrap + registration
- `scripts/bundle.mjs` — esbuild IIFE bundler script
- `package.json` — Dependencies and build scripts

Build it: `npm run build` → the `postbuild` hook auto-produces `dist/plugin.js`

---

<!-- TODO: Add offline caching support for remote plugin bundles -->
