# How to create a component

## 1. Create the Workspace (Root Project)
This creates the Angular workspace but skips creating a default application inside it.

```bash
npx @angular/cli@20 new okdoc-plugin-simple-audio-player-angular \
  --create-application=false \
  --package-manager=npm

cd okdoc-plugin-simple-audio-player-angular
```

> **Note:** For angular versions <20 also add the flag `--standalone` above.

**Note:** Ensure the Angular version matches with the version used in the app. If your app uses Angular 21, use `@angular/cli@21` instead of `@angular/cli@20` in the command above.

## 2. Install Required Dependencies at the ROOT Level

If you use Ionic components, the Angular compiler needs to know about Ionic at the workspace level.

```bash
npm install @ionic/angular@8
```

## 3. Generate the Actual Library

This creates the `projects/simple-audio-player` folder where your component will live.

```bash
npx @angular/cli@20 generate library simple-audio-player --prefix=okdoc
```

## 4. Update the Library's `package.json`

Edit `projects/simple-audio-player/package.json`. 
This tells the final consumer of your package what dependencies they need installed.

⚠️ **Crucial Rule:** Never run `npm install` inside the `projects/` folder after doing this!

```json
{
  "name": "simple-audio-player",
  "version": "0.0.1",
  "peerDependencies": {
    "@angular/common": "^20.3.0",
    "@angular/core": "^20.3.0",
    "@ionic/angular": "^8.0.0",
    "ionicons": "^7.0.0"
  },
  "dependencies": {
    "tslib": "^2.3.0"
  },
  "sideEffects": false
}

```

## 5. Write Your Component Code

Make your necessary code changes in `projects/simple-audio-player/src/lib/`. 

## 6. Build and Pack the Library

Run the build command from the **root folder** of your workspace.

```bash
npx ng build simple-audio-player --configuration production
cd dist/simple-audio-player
npm pack
cd ../..

```

*Note: This will generate a `simple-audio-player-0.0.1.tgz` file in your `dist/simple-audio-player` directory.*

## 7. Install in Your Consumer Project

Copy the `.tgz` file to your target project and install it:

```bash
npm install ./path-to/simple-audio-player-0.0.1.tgz
```

Then import and use the component in your app:

```typescript
import { SimpleAudioPlayer } from 'simple-audio-player';
```

```html
<okdoc-simple-audio-player [url]="'https://example.com/audio.mp3'" />
```


# How to update the component
## 1. Make your code changes in `projects/simple-audio-player/src/lib/`.
## 2. Run the build and pack commands again from the root folder of your workspace.

Open your library's package.json (projects/simple-audio-player/package.json) and increase the version number.
```
{
  "name": "simple-audio-player",
  "version": "0.0.2",  // ← Change this from 0.0.1
  "peerDependencies": { ... }
}
```
Note: You can do this manually in your editor. No need for complex scripts.

## 3. Rebuild and repack the library.

Follow Step 1.6 above to build and pack the library again. This will generate a new `.tgz` file with the updated version number, e.g., `simple-audio-player-0.0.2.tgz`.

## 4. Reinstall in Your Consumer Project

In your consumer project, reinstall the updated package:

```bash
npm install ./path-to/simple-audio-player-0.0.2.tgz
```