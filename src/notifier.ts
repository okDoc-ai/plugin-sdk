// ============================================================================
// @okdoc/plugin-sdk — OkDocNotifier
//
// Abstract class that plugins inject to send notifications back to the AI.
// The host app provides a concrete implementation via Angular DI.
// ============================================================================

import { InjectionToken } from '@angular/core';

/**
 * Abstract notifier that plugins inject to send bidirectional messages to the AI.
 *
 * Usage in a plugin:
 * ```typescript
 * import { OkDocNotifier } from '@okdoc/plugin-sdk';
 *
 * export class MyPluginComponent {
 *   private notifier = inject(OkDocNotifier);
 *
 *   onTrackFinished() {
 *     this.notifier.notify('Track finished playing', 'audio_player');
 *   }
 * }
 * ```
 *
 * The host app provides the implementation:
 * ```typescript
 * provideOkDocNotifier(() => inject(McpRegistryService))
 * ```
 */
export abstract class OkDocNotifier {
    /**
     * Send a notification message to the AI.
     * @param message Human-readable message describing the event
     * @param namespace Plugin namespace (e.g. 'audio_player')
     */
    abstract notify(message: string, namespace?: string): void;
}

/**
 * InjectionToken for providing OkDocNotifier.
 * Host app must provide this; plugins inject OkDocNotifier directly.
 */
export const OKDOC_NOTIFIER_TOKEN = new InjectionToken<OkDocNotifier>('OkDocNotifier');
