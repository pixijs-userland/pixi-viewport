import type { FederatedEvent, Point } from 'pixi.js';
import type { Viewport } from './Viewport.js';

export type DragEvent = {
    event: FederatedEvent,
    screen: Point,
    world: Point,
    viewport: Viewport
};

export type ClickedEvent = DragEvent;

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

export type ZoomedEvent = {
    viewport: Viewport,
    type: 'wheel' | 'pinch' | 'animate' | 'ensureVisible' | 'clamp-zoom',
    center?: Point,
    original?: Point,
};

export type WheelStartEvent = { event: WheelEvent, viewport: Viewport };

export type Events = {
    wheel: [{
        event: FederatedEvent,
        screen: Point,
        world: Point,
        viewport: Viewport
    }],
};
