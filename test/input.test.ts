import { describe, expect, it, vi } from 'vitest';
import { createViewport, dragPointer, pointer, wheel } from './helpers';

import type { FederatedWheelEvent } from 'pixi.js';

describe('InputManager', () =>
{
    it('emits clicked when the pointer does not move past the threshold', () =>
    {
        const { viewport } = createViewport();
        const clicked = vi.fn();

        viewport.on('clicked', clicked);
        dragPointer(viewport, [[100, 100], [102, 101]]);
        expect(clicked).toHaveBeenCalledTimes(1);
        expect(clicked.mock.calls[0][0].screen.x).toBe(100);
    });

    it('does not emit clicked after a drag', () =>
    {
        const { viewport } = createViewport();
        const clicked = vi.fn();

        viewport.on('clicked', clicked);
        dragPointer(viewport, [[100, 100], [150, 100]]);
        expect(clicked).not.toHaveBeenCalled();
    });

    it('counts touches and the mouse', () =>
    {
        const { viewport } = createViewport();

        viewport.input.down(pointer(0, 0, { pointerType: 'touch', pointerId: 1 }));
        viewport.input.down(pointer(10, 0, { pointerType: 'touch', pointerId: 2, isPrimary: false }));
        expect(viewport.input.count()).toBe(2);

        viewport.input.up(pointer(10, 0, { pointerType: 'touch', pointerId: 2 }));
        expect(viewport.input.count()).toBe(1);
    });

    it('drops stale touches when a new primary touch starts (#494)', () =>
    {
        const { viewport } = createViewport();

        // two touches whose pointerup never arrived (e.g., the app was suspended)
        viewport.input.down(pointer(0, 0, { pointerType: 'touch', pointerId: 1 }));
        viewport.input.down(pointer(10, 0, { pointerType: 'touch', pointerId: 2, isPrimary: false }));

        viewport.input.down(pointer(5, 5, { pointerType: 'touch', pointerId: 7 }));
        expect(viewport.input.touches.map((touch) => touch.id)).toEqual([7]);
    });

    describe('wheel', () =>
    {
        it('zooms when the wheel event is over the viewport', () =>
        {
            const { viewport, canvas } = createViewport();

            viewport.wheel();
            wheel(canvas, { deltaY: -100, clientX: 100, clientY: 100 });
            expect(viewport.scale.x).toBeGreaterThan(1);
        });

        it('ignores wheel events while paused', () =>
        {
            const { viewport, canvas } = createViewport();

            viewport.wheel();
            viewport.pause = true;
            wheel(canvas, { deltaY: -100, clientX: 100, clientY: 100 });
            expect(viewport.scale.x).toBe(1);
        });

        it('handles wheel events from other elements by default (#332, #379)', () =>
        {
            const { viewport, domElement } = createViewport({}, { wrapper: true });
            const overlay = document.createElement('div');

            domElement.appendChild(overlay);
            viewport.wheel();
            wheel(overlay, { deltaY: -100, clientX: 100, clientY: 100 });
            expect(viewport.scale.x).toBeGreaterThan(1);
        });

        it('ignores wheel events from other elements when ignoreWheelFromOtherElements is set (#512)', () =>
        {
            const { viewport, domElement, canvas } = createViewport(
                { ignoreWheelFromOtherElements: true },
                { wrapper: true },
            );
            const overlay = document.createElement('div');

            domElement.appendChild(overlay);
            viewport.wheel();
            wheel(overlay, { deltaY: -100, clientX: 100, clientY: 100 });
            expect(viewport.scale.x).toBe(1);

            wheel(canvas, { deltaY: -100, clientX: 100, clientY: 100 });
            expect(viewport.scale.x).toBeGreaterThan(1);
        });

        it('ignores a wheel event that a child stopped (#519)', () =>
        {
            const { viewport, canvas } = createViewport();

            viewport.wheel();

            // pixi dispatches the federated event before the viewport's DOM listener runs: here it reaches the viewport
            // on the way down, but a child stops it so it never bubbles back up
            const stopped = new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100 });

            viewport.emit('wheelcapture', { nativeEvent: stopped } as unknown as FederatedWheelEvent);
            canvas.dispatchEvent(stopped);
            expect(viewport.scale.x).toBe(1);

            const bubbled = new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100 });

            viewport.emit('wheelcapture', { nativeEvent: bubbled } as unknown as FederatedWheelEvent);
            viewport.emit('wheel', { nativeEvent: bubbled } as unknown as FederatedWheelEvent);
            canvas.dispatchEvent(bubbled);
            expect(viewport.scale.x).toBeGreaterThan(1);
        });

        it('keeps the page from scrolling when a child used the wheel and passiveWheel is false', () =>
        {
            const { viewport, canvas } = createViewport({ passiveWheel: false });

            viewport.wheel();
            const stopped = new WheelEvent('wheel', { deltaY: -100, clientX: 100, clientY: 100, cancelable: true });

            viewport.emit('wheelcapture', { nativeEvent: stopped } as unknown as FederatedWheelEvent);
            canvas.dispatchEvent(stopped);
            expect(viewport.scale.x).toBe(1);
            expect(stopped.defaultPrevented).toBe(true);
        });

        it('calls preventDefault only when passiveWheel is false', () =>
        {
            const passive = createViewport();

            passive.viewport.wheel();
            expect(wheel(passive.canvas, { deltaY: -100, clientX: 100, clientY: 100 }).defaultPrevented).toBe(false);

            const active = createViewport({ passiveWheel: false });

            active.viewport.wheel();
            expect(wheel(active.canvas, { deltaY: -100, clientX: 100, clientY: 100 }).defaultPrevented).toBe(true);
        });
    });
});
