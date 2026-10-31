import { describe, expect, it, vi } from 'vitest';
import { createViewport, frames, pointer, wheel } from './helpers';

describe('Wheel', () =>
{
    it('zooms by the documented amount and keeps the point under the pointer', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel();
        const before = viewport.toWorld(200, 150);

        wheel(canvas, { deltaY: -100, clientX: 200, clientY: 150 });

        // default percent 0.1: 2 ^ ((1 + 0.1) * 100 / 500), about 16.5% per notch (see IWheelOptions.percent)
        expect(viewport.scale.x).toBeCloseTo(Math.pow(2, 1.1 * 0.2));
        const after = viewport.toWorld(200, 150);

        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
    });

    it('zooms slower with a negative percent (#515)', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel({ percent: -0.5 });
        wheel(canvas, { deltaY: -100, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBeCloseTo(Math.pow(2, 0.5 * 0.2));
    });

    it('zooms out and reverses', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel();
        wheel(canvas, { deltaY: 100, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBeLessThan(1);

        viewport.scale.set(1);
        viewport.wheel({ reverse: true });
        wheel(canvas, { deltaY: 100, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBeGreaterThan(1);
    });

    it('zooms along one axis', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel({ axis: 'x' });
        wheel(canvas, { deltaY: -100, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBeGreaterThan(1);
        expect(viewport.scale.y).toBe(1);
    });

    it('spreads the zoom over frames with smooth', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel({ smooth: 5 });
        wheel(canvas, { deltaY: -100, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBe(1);

        frames(viewport, 5);
        expect(viewport.scale.x).toBeCloseTo(Math.pow(2, 1.1 * 0.2));
    });

    it('respects clampZoom', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel().clampZoom({ maxScale: 1.1 });
        wheel(canvas, { deltaY: -500, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBe(1.1);
    });

    it('only zooms with trackpad pinch (ctrl + wheel) when wheelZoom is false', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel({ wheelZoom: false, trackpadPinch: true });
        wheel(canvas, { deltaY: -10, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBe(1);

        wheel(canvas, { deltaY: -10, ctrlKey: true, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBeCloseTo(Math.pow(2, 1.1 * (10 / 200)));
    });

    it('speeds up trackpad pinch with trackpadPinchSpeed without changing mouse wheel zoom', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel({ trackpadPinch: true, trackpadPinchSpeed: 2.5 });
        wheel(canvas, { deltaY: -5, ctrlKey: true, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBeCloseTo(Math.pow(2, 1.1 * 2.5 * (5 / 200)));

        viewport.scale.set(1);
        wheel(canvas, { deltaY: -100, clientX: 200, clientY: 150 });
        expect(viewport.scale.x).toBeCloseTo(Math.pow(2, 1.1 * 0.2));
    });

    it('lets the page scroll when it has nothing to zoom', () =>
    {
        const { viewport, canvas } = createViewport({ passiveWheel: false });

        viewport.wheel({ wheelZoom: false, trackpadPinch: true });

        // plain wheel: not handled, so the page can scroll
        expect(wheel(canvas, { deltaY: 100, clientX: 200, clientY: 150 }).defaultPrevented).toBe(false);

        // pinch (ctrl + wheel): zooms, so the page must not zoom too
        expect(wheel(canvas, { deltaY: -10, ctrlKey: true, clientX: 200, clientY: 150 }).defaultPrevented).toBe(true);
        expect(viewport.scale.x).toBeGreaterThan(1);
    });

    it('removes its key listeners when removed', () =>
    {
        const { viewport } = createViewport();
        const remove = vi.spyOn(window, 'removeEventListener');

        viewport.wheel({ keyToPress: ['ControlLeft'] });
        viewport.plugins.remove('wheel');
        expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(remove).toHaveBeenCalledWith('keyup', expect.any(Function));
        remove.mockRestore();
    });
});

describe('Pinch', () =>
{
    function touch(viewport: ReturnType<typeof createViewport>['viewport'], id: number, x: number, y: number)
    {
        viewport.input.move(pointer(x, y, { pointerType: 'touch', pointerId: id, isPrimary: id === 1 }));
    }

    it('zooms with two fingers and emits pinch-start and pinch-end', () =>
    {
        const { viewport } = createViewport();
        const start = vi.fn();
        const end = vi.fn();

        viewport.on('pinch-start', start);
        viewport.on('pinch-end', end);
        viewport.pinch();

        viewport.input.down(pointer(100, 100, { pointerType: 'touch', pointerId: 1 }));
        viewport.input.down(pointer(200, 100, { pointerType: 'touch', pointerId: 2, isPrimary: false }));
        touch(viewport, 1, 100, 100);
        touch(viewport, 2, 200, 100);
        expect(start).toHaveBeenCalledTimes(1);

        // fingers spread from 100px to 200px apart: scale grows by (1 - 100 / 200)
        touch(viewport, 2, 300, 100);
        expect(viewport.scale.x).toBeCloseTo(1.5);

        viewport.input.up(pointer(300, 100, { pointerType: 'touch', pointerId: 2 }));
        expect(end).toHaveBeenCalledTimes(1);
    });
});
