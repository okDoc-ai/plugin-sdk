# How to Create an Angular Web Component

Build a reusable Angular component as an **npm library package** (`.tgz`). This component can be used standalone in any Angular app, or turned into an OkDoc remote plugin (see [RemotePluginGuide.md](RemotePluginGuide.md)).

> **Matching OkDoc's stack?** See [IonicAngularProjectSetup.md](IonicAngularProjectSetup.md) for Ionic 8 + Angular 20 setup details.

---

## Overview

Angular libraries are built in a **workspace** (a root project that contains one or more library projects). The workflow:

1. Create a workspace (no app — library only)
2. Generate a library project
3. Write your component
4. Build → pack → `.tgz` file
5. Install the `.tgz` in any consumer project

```
my-library-workspace/           ← workspace root
├── projects/
│   └── my-component/           ← your library lives here
│       ├── src/lib/
│       │   └── my-component.component.ts
│       └── package.json        ← library metadata + peerDependencies
├── angular.json
├── package.json                ← workspace-level deps (Ionic, etc.)
└── tsconfig.json
```

---

## 1. Create the Workspace

Create an Angular workspace **without** a default application:

```bash
npx @angular/cli@20 new my-component-workspace \
  --create-application=false \
  --package-manager=npm

cd my-component-workspace
```

> **Version matching:** Use the Angular CLI version that matches your target consumer. If the consumer uses Angular 21, use `@angular/cli@21`.

---

## 2. Install Root-Level Dependencies

If your component uses **Ionic** components, install Ionic at the workspace root. The Angular compiler needs to know about Ionic at build time.

```bash
npm install @ionic/angular@8 ionicons
```

> Skip this step if your component doesn't use Ionic.

---

## 3. Generate the Library

```bash
npx @angular/cli@20 generate library my-component --prefix=okdoc
```

This creates `projects/my-component/` with the standard Angular library structure.

---

## 4. Update the Library's `package.json`

Edit `projects/my-component/package.json` to declare **peer dependencies** — these tell the consumer what they need installed.

```json
{
  "name": "my-component",
  "version": "0.0.1",
  "peerDependencies": {
    "@angular/common": "^20.0.0",
    "@angular/core": "^20.0.0",
    "@ionic/angular": "^8.0.0",
    "ionicons": "^7.0.0"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  },
  "sideEffects": false
}
```

> Remove the `@ionic/angular` and `ionicons` peer dependencies if your component doesn't use Ionic.

⚠️ **Never run `npm install` inside `projects/my-component/`.** Dependencies are resolved from the workspace root.

---

## 5. Write Your Component

Edit `projects/my-component/src/lib/my-component.component.ts`:

```typescript
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'okdoc-my-component',
  standalone: true,
  imports: [IonicModule],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ title }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>{{ description }}</p>
        <ion-button (click)="onAction()">
          <ion-icon name="play-outline" slot="start"></ion-icon>
          Do Something
        </ion-button>
      </ion-card-content>
    </ion-card>
  `,
})
export class MyComponentComponent {
  @Input() title = 'My Component';
  @Input() description = 'A reusable Angular component.';

  onAction(): void {
    console.log('Action triggered!');
  }
}
```

Export the component from the library's public API. Edit `projects/my-component/src/public-api.ts`:

```typescript
export * from './lib/my-component.component';
```

---

## 6. Build and Pack

Run from the **workspace root**:

```bash
npx ng build my-component --configuration production
cd dist/my-component
npm pack
cd ../..
```

This produces: `dist/my-component/my-component-0.0.1.tgz`

---

## 7. Install in a Consumer Project

Copy the `.tgz` file to your consumer project and install:

```bash
npm install ./path-to/my-component-0.0.1.tgz
```

Then use it in any Angular component:

```typescript
import { MyComponentComponent } from 'my-component';

@Component({
  imports: [MyComponentComponent],
  template: `<okdoc-my-component title="Hello" description="From consumer app" />`,
})
export class SomePageComponent {}
```

---

## Updating the Component

### 1. Make your code changes

Edit files in `projects/my-component/src/lib/`.

### 2. Bump the version

Edit `projects/my-component/package.json`:

```json
{
  "version": "0.0.2"
}
```

### 3. Rebuild and repack

```bash
npx ng build my-component --configuration production
cd dist/my-component
npm pack
cd ../..
```

### 4. Reinstall in consumer

```bash
npm install ./path-to/my-component-0.0.2.tgz
```

---

## Next Steps

| Goal | Guide |
|------|-------|
| Turn this component into an OkDoc **remote plugin** | [RemotePluginGuide.md](RemotePluginGuide.md) |
| Build a simpler **iframe plugin** instead | [IframePluginGuide.md](IframePluginGuide.md) |