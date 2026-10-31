import type { FederatedEvent, Point } from 'pixi.js';
import type { Viewport } from './Viewport.js';

/**
 * Passed to `drag-start` and `drag-end` listeners.
 *
 * @category Events
 */
export type DragEvent = {
    event: FederatedEvent,
    screen: Point,
    world: Point,
    viewport: Viewport
};

/**
 * Passed to `clicked` listeners: where the pointer was pressed, in screen and world coordinates.
 *
 * @category Events
 */
export type ClickedEvent = DragEvent;

/**
 * Passed to `moved` listeners. `type` says what moved the viewport.
 *
 * @category Events
 */
export type MovedEvent = {
    viewport: Viewport,
    type:
    | 'wheel'
    | 'pinch'
    | 'animate'
    | 'ensureVisible'
    | 'snap'
    | 'mouse-edges'
    | 'edge-scroll'
    | 'follow'
    | 'drag'
    | 'decelerate'
    | 'clamp-x'
    | 'clamp-y'
    | 'bounce-x'
    | 'bounce-y',
    original?: Point,
};

/**
 * Passed to `zoomed` listeners. `type` says what zoomed the viewport.
 *
 * @category Events
 */
export type ZoomedEvent = {
    viewport: Viewport,
    type: 'wheel' | 'pinch' | 'animate' | 'ensureVisible' | 'clamp-zoom',
    center?: Point,
    original?: Point,
};

/**
 * Passed to `wheel-start` listeners.
 *
 * @category Events
 */
export type WheelStartEvent = { event: WheelEvent, viewport: Viewport };

/**
 * @category Events
 * @internal
 */
export type Events = {
    wheel: [{
        event: FederatedEvent,
        screen: Point,
        world: Point,
        viewport: Viewport
    }],
};
