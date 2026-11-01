import { Container, Point } from 'pixi.js';
import { Viewport } from '../src/index';

import type { EventSystem, FederatedPointerEvent } from 'pixi.js';
import type { IViewportOptions } from '../src/index';

export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 600;
export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 2000;

export interface TestViewport
{
    viewport: Viewport;
    stage: Container;
    canvas: HTMLCanvasElement;
    domElement: HTMLElement;
}

/**
 * Creates a viewport inside a stage with a minimal stand-in for pixi's EventSystem. The canvas sits at the page's
 * top-left, so client coordinates equal screen coordinates.
 */
export function createViewport(
    options: Partial<IViewportOptions> = {},
    { wrapper = false }: { wrapper?: boolean } = {},
): TestViewport
{
    const canvas = document.createElement('canvas');
    let domElement: HTMLElement = canvas;

    if (wrapper)
    {
        domElement = document.createElement('div');
        domElement.appendChild(canvas);
    }
    document.body.appendChild(domElement);

    const events = {
        domElement,
        renderer: { canvas },
        mapPositionToPoint(point: Point, x: number, y: number)
        {
            point.set(x, y);
        },
    } as unknown as EventSystem;

    const stage = new Container();
    const viewport = new Viewport({
        screenWidth: SCREEN_WIDTH,
        screenHeight: SCREEN_HEIGHT,
        worldWidth: WORLD_WIDTH,
        worldHeight: WORLD_HEIGHT,
        noTicker: true,
        events,
        ...options,
    });

    stage.addChild(viewport);

    return { viewport, stage, canvas, domElement };
}

export interface PointerOptions
{
    pointerType?: 'mouse' | 'touch' | 'pen';
    pointerId?: number;
    button?: number;
    buttons?: number;
    isPrimary?: boolean;
}

/** Creates the parts of a FederatedPointerEvent that the viewport reads */
export function pointer(x: number, y: number, options: PointerOptions = {}): FederatedPointerEvent
{
    return {
        pointerType: options.pointerType ?? 'mouse',
        pointerId: options.pointerId ?? 1,
        button: options.button ?? 0,
        buttons: options.buttons ?? 0,
        isPrimary: options.isPrimary ?? true,
        global: new Point(x, y),
        stopPropagation() { /* noop */ },
    } as unknown as FederatedPointerEvent;
}

/** Presses, moves through each point, and releases a pointer */
export function dragPointer(viewport: Viewport, points: Array<[number, number]>, options: PointerOptions = {}): void
{
    const [first, ...rest] = points;

    viewport.input.down(pointer(first[0], first[1], { buttons: 1, ...options }));
    for (const [x, y] of rest)
    {
        viewport.input.move(pointer(x, y, { buttons: 1, ...options }));
    }
    const last = points[points.length - 1];

    viewport.input.up(pointer(last[0], last[1], options));
}

/** Dispatches a native wheel event on an element */
export function wheel(target: Element, init: WheelEventInit): WheelEvent
{
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init });

    target.dispatchEvent(event);

    return event;
}

/** Runs the viewport's update loop for a number of frames */
export function frames(viewport: Viewport, count = 1, elapsed = 16): void
{
    for (let i = 0; i < count; i++)
    {
        viewport.update(elapsed);
    }
}
