# OkDoc Remote Plugin Developer Guide

Remote plugins are **self-contained JavaScript bundles** loaded by URL at runtime. Unlike iframe plugins, remote plugins render as **Web Components** (Custom Elements) directly inside the host app's DOM — giving full integration with no iframe sandbox.

> **Prerequisites:**
> - Familiarity with building a Custom Element from your framework
> - For Angular components, see [SampleRemoteComponentDevelopmentGuide.md](SampleRemoteComponentDevelopmentGuide.md) first
> - For matching Ionic/Angular styles, see [IonicAngularProjectSetup.md](IonicAngularProjectSetup.md)

---

## How It Works

```
┌──────────────────────────────────────┐
│  Your Plugin Bundle  (plugin.js)     │
│  ┌────────────────────────────────┐  │
│  │ Custom Element  <my-widget>    │  │  ← Web Component boundary
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ registerRemotePlugin({         │  │  ← SDK registration
│  │   manifest, toolHandlers       │  │
│  │ })                             │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
           │  <script src="...plugin.js">
           ▼
┌──────────────────────────────────────┐
│  OkDoc Host App                      │
│  • Reads window.__OKDOC_PLUGINS__    │
│  • Registers MCP tools               │
│  • Creates <my-widget> in DOM        │
│  • Routes AI tool calls to handlers  │
└──────────────────────────────────────┘
```

**Key differences from iframe plugins:**

| | Iframe Plugin | Remote Plugin |
|---|---|---|
| Isolation | `<iframe>` sandbox | Same DOM (Custom Element) |
| SDK delivery | `<script>` tag (standalone JS) | `npm install @okdoc/plugin-sdk` |
| Framework | Any (HTML page) | Any (must output Web Component) |
| Bundle format | N/A (it's a page) | Single IIFE `.js` file |
| Loading | URL to a web page | URL to a `.js` bundle |

---

## Quick Start (Angular)

### 1. Create a new Angular project

```bash
npx @angular/cli@20 new my-okdoc-plugin --style=scss --ssr=false --skip-tests
cd my-okdoc-plugin
npm install @angular/elements @okdoc/plugin-sdk
```

### 2. Create your component

```typescript
// src/app/my-widget.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';

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
      background: var(--ion-color-light, #f0f4ff);
      font-family: sans-serif;
    }
  `]
})
export class MyWidgetComponent implements OnInit, OnDestroy {
  message = 'Hello from remote plugin!';

  ngOnInit(): void {
    (window as any).__OKDOC_PLUGIN_INSTANCES__['my-widget'] = this;
  }

  ngOnDestroy(): void {
    delete (window as any).__OKDOC_PLUGIN_INSTANCES__['my-widget'];
  }

  async handleSetMessage(args: Record<string, unknown>) {
    this.message = String(args['message'] ?? '');
    return { content: [{ type: 'text' as const, text: `Message set to: ${this.message}` }] };
  }
}
```

### 3. Bootstrap as Custom Element and register

Replace `src/main.ts`:

```typescript
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { registerRemotePlugin } from '@okdoc/plugin-sdk';
import { MyWidgetComponent } from './app/my-widget.component';

function getInstance(): MyWidgetComponent | null {
  return (window as any).__OKDOC_PLUGIN_INSTANCES__?.['my-widget'] ?? null;
}

(async () => {
  // 1. Bootstrap Angular
  const app = await createApplication({ providers: [] });

  // 2. Define Custom Element
  const MyElement = createCustomElement(MyWidgetComponent, { injector: app.injector });
  customElements.define('okdoc-my-widget', MyElement);

  // 3. Register with OkDoc
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

### 4. Set deterministic output filenames

In `angular.json`, under `projects > my-okdoc-plugin > architect > build > configurations > production`:

```json
"outputHashing": "none"
```

### 5. Create the IIFE bundle script

Angular's builder outputs ESM — a classic `<script>` tag can't load ESM, so we re-bundle into IIFE with esbuild:

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
  format: 'iife',
  outfile: OUTPUT,
  minify: true,
  logLevel: 'info',
});

const { size } = await stat(OUTPUT);
console.log(`\u2713 Bundled into dist/plugin.js (${(size / 1024).toFixed(1)} KB)`);
```

### 6. Add build scripts and build

In `package.json`:

```json
"scripts": {
  "build": "ng build --configuration production",
  "postbuild": "node scripts/bundle.mjs",
  "serve": "npx http-server dist --cors -p 8787"
}
```

```bash
npm run build    # Builds Angular + auto-rebundles as IIFE
npm run serve    # Serve for testing
```

### 7. Load in OkDoc

1. Open OkDoc → Settings → Plugin Store
2. Paste `http://localhost:8787/plugin.js`
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
import { useState, useEffect } from 'react';

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
      <button onClick={() => setCount(c => c - 1)}>&minus;</button>
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

const CounterElement = r2wc(MyCounter, { props: {} });
customElements.define('okdoc-react-counter', CounterElement);

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
      { name: 'get_count', description: 'Get the current count value' },
      { name: 'increment', description: 'Increment the counter by 1' },
      {
        name: 'set',
        description: 'Set the counter to a specific value',
        parameters: {
          type: 'object',
          properties: { value: { type: 'number', description: 'Value to set' } },
          required: ['value'],
        },
      },
    ],
  },
  toolHandlers: {
    get_count: async () => {
      const inst = getInstance();
      return { content: [{ type: 'text', text: `Count: ${inst?.count ?? 'N/A'}` }] };
    },
    increment: async () => {
      const inst = getInstance();
      inst?.setCount((inst.count) + 1);
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

## Quick Start (Vanilla JS)

No framework needed — just a Custom Element and the SDK:

```html
<!-- index.html — for development/testing only -->
<script type="module">
import { registerRemotePlugin } from './node_modules/@okdoc/plugin-sdk/dist/index.js';

class OkdocTimer extends HTMLElement {
  #seconds = 0;
  #interval = null;

  connectedCallback() {
    this.innerHTML = `<div style="padding:16px;font-family:sans-serif">
      <h3>Timer</h3><p id="display">0s</p>
    </div>`;
    window.__OKDOC_PLUGIN_INSTANCES__ ??= {};
    window.__OKDOC_PLUGIN_INSTANCES__['timer'] = this;
  }

  disconnectedCallback() {
    this.stop();
    delete window.__OKDOC_PLUGIN_INSTANCES__['timer'];
  }

  start() {
    if (this.#interval) return;
    this.#interval = setInterval(() => {
      this.#seconds++;
      this.querySelector('#display').textContent = `${this.#seconds}s`;
    }, 1000);
  }

  stop() {
    clearInterval(this.#interval);
    this.#interval = null;
  }

  reset() { this.stop(); this.#seconds = 0; this.querySelector('#display').textContent = '0s'; }
  getSeconds() { return this.#seconds; }
}

customElements.define('okdoc-timer', OkdocTimer);

function getInstance() {
  return window.__OKDOC_PLUGIN_INSTANCES__?.['timer'] ?? null;
}

registerRemotePlugin({
  manifest: {
    id: 'timer',
    name: 'Timer',
    description: 'A simple stopwatch timer',
    version: '1.0.0',
    icon: 'timer-outline',
    namespace: 'timer',
    elementTag: 'okdoc-timer',
    framework: 'vanilla',
    tools: [
      { name: 'start', description: 'Start the timer' },
      { name: 'stop', description: 'Stop the timer' },
      { name: 'reset', description: 'Reset the timer to 0' },
      { name: 'get_time', description: 'Get elapsed seconds' },
    ],
  },
  toolHandlers: {
    start: async () => { getInstance()?.start(); return { content: [{ type: 'text', text: 'Timer started.' }] }; },
    stop: async () => { getInstance()?.stop(); return { content: [{ type: 'text', text: 'Timer stopped.' }] }; },
    reset: async () => { getInstance()?.reset(); return { content: [{ type: 'text', text: 'Timer reset.' }] }; },
    get_time: async () => {
      const s = getInstance()?.getSeconds() ?? 0;
      return { content: [{ type: 'text', text: `Elapsed: ${s}s` }] };
    },
  },
});
</script>
```

> For production, bundle this with esbuild or rollup into a single IIFE `plugin.js` file.

---

## Manifest Reference

```typescript
interface RemotePluginManifest {
  id: string;            // Unique plugin ID (e.g. 'my-widget')
  name: string;          // Display name in Plugin Store
  description: string;   // Short description
  version: string;       // Semver (e.g. '1.0.0')
  icon: string;          // Ionicon name (e.g. 'cube-outline')
  namespace: string;     // MCP tool name prefix (e.g. 'my_widget')
  elementTag: string;    // Custom Element tag (must contain a hyphen)
  framework?: string;    // 'angular' | 'react' | 'vanilla' (informational)
  tools?: ToolDeclaration[];
}
```

### Tool Declarations

```typescript
interface ToolDeclaration {
  name: string;                // Tool name without namespace prefix
  description: string;         // Human-readable description for AI
  parameters?: {               // JSON Schema for arguments (omit for no-arg tools)
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: unknown[];
    }>;
    required?: string[];
  };
  annotations?: {              // Optional tool hints
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
}
```

**Tool naming:** The host auto-prefixes tool names with `{namespace}_`. A tool named `set_message` in namespace `my_widget` becomes `my_widget_set_message` when the AI sees it.

### Tool Handlers

```typescript
toolHandlers: {
  tool_name: async (args: Record<string, unknown>) => {
    return {
      content: [{ type: 'text', text: 'Result' }],
      isError: false,  // optional, default false
    };
  },
}
```

Every tool declared in `manifest.tools` must have a corresponding handler in `toolHandlers`. If you provide handlers without declarations, the SDK auto-generates minimal tool declarations from the handler keys.

---

## Instance Access Pattern

Tool handlers are defined outside your component (in `main.ts`), but they need access to the live component instance. The recommended pattern uses a global registry:

### Angular

```typescript
// In your component:
(window as any).__OKDOC_PLUGIN_INSTANCES__ ??= {};

ngOnInit() {
  (window as any).__OKDOC_PLUGIN_INSTANCES__['my-plugin'] = this;
}
ngOnDestroy() {
  delete (window as any).__OKDOC_PLUGIN_INSTANCES__['my-plugin'];
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

### Vanilla JS

```javascript
class MyElement extends HTMLElement {
  connectedCallback() {
    window.__OKDOC_PLUGIN_INSTANCES__ ??= {};
    window.__OKDOC_PLUGIN_INSTANCES__['my-plugin'] = this;
  }
  disconnectedCallback() {
    delete window.__OKDOC_PLUGIN_INSTANCES__['my-plugin'];
  }
}
```

---

## Lifecycle

1. **Load** — User pastes URL → host injects `<script>` → bundle executes
2. **Register** — Bundle calls `registerRemotePlugin()` → host reads `window.__OKDOC_PLUGINS__[id]`
3. **Verify** — Host validates manifest + checks `customElements.get(tag)` succeeds
4. **Enable** — Host registers MCP tools → AI can call them
5. **Render** — Plugin Outlet creates `<your-tag>` in DOM → component renders
6. **Tool Call** — AI calls tool → host finds pre-bound handler → handler accesses instance
7. **Disable** — Host removes element from DOM, unregisters tools
8. **Remove** — Host deletes the plugin entirely, forgets URL

Remote plugin URLs are **persisted** — they reload automatically on app restart.

---

## Custom Element Tag Rules

- Must contain a hyphen (`-`) — W3C Custom Elements requirement
- Must be globally unique across all loaded plugins
- Convention: prefix with `okdoc-` (e.g. `okdoc-my-widget`)
- Must be registered via `customElements.define(tag, Element)` **before** calling `registerRemotePlugin()`

---

## Hosting Your Plugin

The bundle (`plugin.js`) can be hosted anywhere that serves static files with CORS headers:

| Option | Example URL |
|--------|-------------|
| Local dev | `http://localhost:8787/plugin.js` |
| GitHub Pages | `https://user.github.io/my-plugin/plugin.js` |
| CDN | `https://cdn.example.com/plugins/my-plugin/v1.0.0/plugin.js` |
| S3 / GCS / Azure Blob | `https://my-bucket.s3.amazonaws.com/plugin.js` |

**CORS requirement:** The server must send `Access-Control-Allow-Origin: *` headers. For local dev, use `--cors` flag with `http-server`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "No plugin was registered" | Your bundle must call `registerRemotePlugin()`. Check console for errors. |
| `Unexpected token 'export'` | Bundle contains ESM. Use esbuild with `format: 'iife'` to re-bundle. |
| "Custom Element not defined" | `customElements.define(tag, ...)` must be called **before** `registerRemotePlugin()`. |
| "Plugin already loaded" | Same URL can't be loaded twice. Remove the existing plugin first. |
| "ID already exists" | Another plugin has the same `id`. Choose a unique manifest `id`. |
| Tools not working | `toolHandlers` keys must match `tools[].name` exactly. |
| Component not rendering | `manifest.elementTag` must match the tag in `customElements.define()`. |
| CORS error | Server must send `Access-Control-Allow-Origin: *`. Use `--cors` for local dev. |

---

## SDK Exports for Remote Plugins

Install with `npm install @okdoc/plugin-sdk`, then import:

```typescript
import { registerRemotePlugin } from '@okdoc/plugin-sdk';
```

| Export | Purpose |
|--------|---------|
| `registerRemotePlugin()` | Register your plugin with the OkDoc host |
| `RemotePluginManifest` | Type — manifest shape |
| `RemotePluginBundle` | Type — manifest + toolHandlers |
| `McpToolResult` | Type — what tool handlers return |
| `McpContent` | Type — content item in a result |
| `McpStaticToolDeclaration` | Type — tool declaration |

---

## Related Guides

- **[IonicAngularProjectSetup.md](IonicAngularProjectSetup.md)** — Create an Ionic 8 / Angular 20 project with matching styles
- **[SampleRemoteComponentDevelopmentGuide.md](SampleRemoteComponentDevelopmentGuide.md)** — Create a reusable Angular library component
- **[IframePluginGuide.md](IframePluginGuide.md)** — Simpler alternative: turn any web page into a plugin
