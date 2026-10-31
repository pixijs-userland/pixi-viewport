import { describe, expect, it, vi } from 'vitest';
import { createViewport, dragPointer, pointer, wheel } from './helpers';

describe('Drag', () =>
{
    it('moves the viewport with the pointer', () =>
    {
        const { viewport } = createViewport();

        viewport.drag();
        dragPointer(viewport, [[100, 100], [110, 100], [150, 130]]);
        expect(viewport.x).toBe(50);
        expect(viewport.y).toBe(30);
    });

    it('ignores movement under the threshold', () =>
    {
        const { viewport } = createViewport();

        viewport.drag();
        dragPointer(viewport, [[100, 100], [103, 102]]);
        expect(viewport.x).toBe(0);
        expect(viewport.y).toBe(0);
    });

    it('drags along one direction only', () =>
    {
        const { viewport } = createViewport();

        viewport.drag({ direction: 'x' });
        dragPointer(viewport, [[100, 100], [150, 150]]);
        expect(viewport.x).toBe(50);
        expect(viewport.y).toBe(0);
    });

    it('applies the factor', () =>
    {
        const { viewport } = createViewport();

        viewport.drag({ factor: 2 });
        dragPointer(viewport, [[100, 100], [110, 100], [130, 100]]);
        expect(viewport.x).toBe(60);
    });

    it('emits drag-start and drag-end with screen coordinates', () =>
    {
        const { viewport, stage } = createViewport();
        const start = vi.fn();
        const end = vi.fn();

        stage.position.set(10, 10);
        viewport.on('drag-start', start);
        viewport.on('drag-end', end);
        viewport.drag();
        dragPointer(viewport, [[100, 100], [120, 100]]);

        expect(start).toHaveBeenCalledTimes(1);
        expect(start.mock.calls[0][0].screen.x).toBe(120);
        expect(end).toHaveBeenCalledTimes(1);
        expect(end.mock.calls[0][0].screen.x).toBe(120);
    });

    it('only drags with the configured mouse buttons', () =>
    {
        const { viewport } = createViewport();

        viewport.drag({ mouseButtons: 'right' });
        dragPointer(viewport, [[100, 100], [150, 100]], { button: 0 });
        expect(viewport.x).toBe(0);

        dragPointer(viewport, [[100, 100], [150, 100]], { button: 2 });
        expect(viewport.x).toBe(50);
    });

    it('ignores one-finger touch drags with disableOneFingerDrag (#520)', () =>
    {
        const { viewport } = createViewport();

        viewport.drag({ disableOneFingerDrag: true });
        dragPointer(viewport, [[100, 100], [150, 100]], { pointerType: 'touch' });
        expect(viewport.x).toBe(0);

        dragPointer(viewport, [[100, 100], [150, 100]], { pointerType: 'mouse' });
        expect(viewport.x).toBe(50);
    });

    it('requires keyToPress when set', () =>
    {
        const { viewport } = createViewport();

        viewport.drag({ keyToPress: ['ShiftLeft'] });
        dragPointer(viewport, [[100, 100], [150, 100]]);
        expect(viewport.x).toBe(0);

        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
        dragPointer(viewport, [[100, 100], [150, 100]]);
        expect(viewport.x).toBe(50);
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
        viewport.plugins.remove('drag');
    });

    it('scrolls with the wheel when the wheel plugin is not zooming', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.drag();
        wheel(canvas, { deltaX: 10, deltaY: 20, clientX: 100, clientY: 100 });
        expect(viewport.x).toBe(-10);
        expect(viewport.y).toBe(-20);
    });

    it('does not drag while paused', () =>
    {
        const { viewport } = createViewport();

        viewport.drag();
        viewport.plugins.pause('drag');
        viewport.input.down(pointer(100, 100, { buttons: 1 }));
        viewport.input.move(pointer(150, 100, { buttons: 1 }));
        expect(viewport.x).toBe(0);
    });
});
