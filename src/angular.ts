// ============================================================================
// @okdoc-ai/plugin-sdk/angular — Angular-specific exports
//
// This subpath export isolates @angular/core dependency so non-Angular
// consumers can use the SDK without peer dependency warnings.
//
// Import from '@okdoc-ai/plugin-sdk/angular' instead of '@okdoc-ai/plugin-sdk'.
// ============================================================================

import { InjectionToken } from '@angular/core';

/**
 * Abstract notifier that plugins inject to send bidirectional messages to the AI.
 *
 * The host provides a **scoped** implementation per plugin component, so
 * the notifier already knows the plugin's namespace and display name.
 * Callers only need to pass the message itself.
 *
 * Usage in a plugin:
 * ```typescript
 * import { OkDocNotifier } from '@okdoc-ai/plugin-sdk/angular';
 *
 * export class MyPluginComponent {
 *   private notifier = inject(OkDocNotifier);
 *
 *   onTrackFinished() {
 *     this.notifier.notify('Track finished playing');
 *   }
 * }
 * ```
 */
export abstract class OkDocNotifier {
    /**
     * Send a notification message to the AI.
     * @param message Human-readable message describing the event
     */
    abstract notify(message: string): void;
}

/**
 * InjectionToken for providing OkDocNotifier.
 * Host app must provide this; plugins inject OkDocNotifier directly.
 */
export const OKDOC_NOTIFIER_TOKEN = new InjectionToken<OkDocNotifier>('OkDocNotifier');
