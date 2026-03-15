# How to Create an Ionic 8 / Angular 20 Web Project

This guide creates a web project that matches OkDoc's technology stack: **Ionic 8** UI components with **Angular 20**. This gives your plugin identical styling, themes, and component library to the host app.

> **This guide is optional.** You can build OkDoc plugins with any technology. Use this if you want matching Ionic styles. After creating the project, continue with:
> - **[IframePluginGuide.md](IframePluginGuide.md)** — Turn it into an iframe plugin
> - **[SampleRemoteComponentDevelopmentGuide.md](SampleRemoteComponentDevelopmentGuide.md)** → **[RemotePluginGuide.md](RemotePluginGuide.md)** — Build a remote plugin

---

## Prerequisites

- **Node.js** 20+ and **npm** 10+
- A terminal (PowerShell, bash, etc.)

---

## 1. Create the Angular Project

```bash
npx @angular/cli@20 new my-okdoc-plugin --style=scss --ssr=false --skip-tests
cd my-okdoc-plugin
```

| Flag | Purpose |
|------|---------|
| `--style=scss` | Use SCSS for styling (matches OkDoc) |
| `--ssr=false` | No server-side rendering (plugins are client-only) |
| `--skip-tests` | Skip test file generation (optional, remove if you want tests) |

> **Version matching:** If OkDoc upgrades to Angular 21, use `@angular/cli@21` instead.

---

## 2. Install Ionic

```bash
npm install @ionic/angular@8 ionicons
```

---

## 3. Add Ionic to Your Angular App

### 3a. Import IonicModule

Edit `src/app/app.ts` (or `app.component.ts`):

```typescript
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonicModule],
  template: `
    <ion-app>
      <ion-content class="ion-padding">
        <ion-card>
          <ion-card-header>
            <ion-card-title>My Plugin</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            Hello from Ionic + Angular!
          </ion-card-content>
        </ion-card>
      </ion-content>
    </ion-app>
  `,
})
export class App {}
```

### 3b. Add Ionic styles

Edit `src/styles.scss` — add these imports at the top:

```scss
/* Ionic core styles */
@import "@ionic/angular/css/core.css";
@import "@ionic/angular/css/normalize.css";
@import "@ionic/angular/css/structure.css";
@import "@ionic/angular/css/typography.css";

/* Ionic utility classes (optional but useful) */
@import "@ionic/angular/css/padding.css";
@import "@ionic/angular/css/float-elements.css";
@import "@ionic/angular/css/text-alignment.css";
@import "@ionic/angular/css/text-transformation.css";
@import "@ionic/angular/css/flex-utils.css";
@import "@ionic/angular/css/display.css";
```

### 3c. Add Ionicons

Edit `src/index.html` — add the ionicons script in `<head>`:

```html
<script type="module" src="https://unpkg.com/ionicons@7/dist/ionicons/ionicons.esm.js"></script>
<script nomodule src="https://unpkg.com/ionicons@7/dist/ionicons/ionicons.js"></script>
```

---

## 4. Run the Dev Server

```bash
ng serve
```

Open `http://localhost:4200` — you should see an Ionic-styled card.

---

## 5. Project Structure

After setup, your project looks like:

```
my-okdoc-plugin/
├── src/
│   ├── app/
│   │   └── app.ts              ← Main component
│   ├── index.html              ← Entry HTML
│   ├── main.ts                 ← Bootstrap
│   └── styles.scss             ← Global Ionic styles
├── angular.json                ← Build config
├── package.json
└── tsconfig.json
```

---

## 6. Useful Ionic Components

Here are commonly used Ionic components for plugins:

```html
<!-- Buttons -->
<ion-button (click)="doSomething()">Click Me</ion-button>
<ion-button fill="outline" size="small">Secondary</ion-button>

<!-- List -->
<ion-list>
  <ion-item *ngFor="let item of items">
    <ion-label>{{ item.name }}</ion-label>
  </ion-item>
</ion-list>

<!-- Input -->
<ion-item>
  <ion-input label="Name" [(ngModel)]="name" placeholder="Enter name"></ion-input>
</ion-item>

<!-- Toggle -->
<ion-item>
  <ion-toggle [(ngModel)]="enabled">Enable feature</ion-toggle>
</ion-item>

<!-- Icons -->
<ion-icon name="play-outline"></ion-icon>
<ion-icon name="settings-outline"></ion-icon>
```

Browse all available icons at [ionic.io/ionicons](https://ionic.io/ionicons).

Browse all components at [ionicframework.com/docs/components](https://ionicframework.com/docs/components).

---

## Next Steps

Your Ionic/Angular project is ready. Choose your plugin type:

| Plugin Type | Best For | Guide |
|-------------|----------|-------|
| **Iframe Plugin** | Any web page (simplest approach) — just add a `<script>` tag | [IframePluginGuide.md](IframePluginGuide.md) |
| **Remote Plugin** | Reusable Angular Web Component — loaded as a JS bundle by URL | [SampleRemoteComponentDevelopmentGuide.md](SampleRemoteComponentDevelopmentGuide.md) → [RemotePluginGuide.md](RemotePluginGuide.md) |
