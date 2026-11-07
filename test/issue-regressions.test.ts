import { describe, expect, it } from 'vitest';
import { createViewport, dragPointer, frames, pointer, wheel } from './helpers';

import type { Container } from 'pixi.js';
import type { Viewport } from '../src/index';

type Setup = (viewport: Viewport, stage: Container) => void;

function fingers(viewport: Viewport, spread: number)
{
    viewport.input.move(pointer(300 - spread, 200, { pointerType: 'touch', pointerId: 1 }));
    viewport.input.move(pointer(300 + spread, 200, { pointerType: 'touch', pointerId: 2 }));
}

const cases: Array<[string, Setup]> = [
    ['a normal parent', () => { /* the default */ }],
    ['a scaled and moved parent (#49, #329)', (_viewport, stage) =>
    {
        stage.scale.set(2);
        stage.position.set(100, 50);
    }],
    ['no parent (#507)', (viewport, stage) => { stage.removeChild(viewport); }],
    ['no parent, zoomed out (#507)', (viewport, stage) =>
    {
        stage.removeChild(viewport);
        viewport.scale.set(0.5);
    }],
    ['no parent, zoomed in and moved (#507)', (viewport, stage) =>
    {
        stage.removeChild(viewport);
        viewport.scale.set(3);
        viewport.position.set(-40, -30);
    }],
];

describe.each(cases)('with %s', (_name, setup) =>
{
    it('keeps the world point under the pointer while dragging', () =>
    {
        const { viewport, stage } = createViewport();

        setup(viewport, stage);
        viewport.drag();
        const before = viewport.toWorld(200, 200);

        dragPointer(viewport, [[200, 200], [230, 215], [300, 260], [320, 290]]);
        const after = viewport.toWorld(320, 290);

        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
    });

    it('zooms around the pointer with the wheel', () =>
    {
        const { viewport, stage, canvas } = createViewport();

        setup(viewport, stage);
        const scale = viewport.scale.x;

        viewport.wheel();
        const before = viewport.toWorld(300, 200);

        wheel(canvas, { deltaY: -100, clientX: 300, clientY: 200 });
        const after = viewport.toWorld(300, 200);

        expect(viewport.scale.x).toBeCloseTo(scale * Math.pow(2, 1.1 * 0.2));
        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
    });

    it('zooms around the pointer with a smooth wheel', () =>
    {
        const { viewport, stage, canvas } = createViewport();

        setup(viewport, stage);
        viewport.wheel({ smooth: 5 });
        const before = viewport.toWorld(300, 200);

        wheel(canvas, { deltaY: -100, clientX: 300, clientY: 200 });
        frames(viewport, 8);
        const after = viewport.toWorld(300, 200);

        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
    });

    it('zooms around the fingers with a pinch, by the amount they spread', () =>
    {
        const { viewport, stage } = createViewport();

        setup(viewport, stage);
        viewport.pinch({ noDrag: true });
        const scale = viewport.scale.x;
        const before = viewport.toWorld(300, 200);

        viewport.input.down(pointer(250, 200, { pointerType: 'touch', pointerId: 1, isPrimary: true }));
        viewport.input.down(pointer(350, 200, { pointerType: 'touch', pointerId: 2, isPrimary: false }));
        fingers(viewport, 50);
        for (let spread = 50; spread <= 80; spread += 3)
        {
            fingers(viewport, spread);
        }
        const after = viewport.toWorld(300, 200);
        const change = viewport.scale.x / scale;

        // 160px apart from 100px, pinch's steps come out a little under the 1.6 ratio
        expect(change).toBeGreaterThan(1.5);
        expect(change).toBeLessThan(1.7);
        expect(Math.abs(after.x - before.x)).toBeLessThan(1);
        expect(Math.abs(after.y - before.y)).toBeLessThan(1);
    });

    it('follows the midpoint when dragging with a pinch', () =>
    {
        const { viewport, stage } = createViewport();

        setup(viewport, stage);
        viewport.pinch();
        const before = viewport.toWorld(300, 200);

        viewport.input.down(pointer(250, 200, { pointerType: 'touch', pointerId: 1, isPrimary: true }));
        viewport.input.down(pointer(350, 200, { pointerType: 'touch', pointerId: 2, isPrimary: false }));
        viewport.input.move(pointer(250, 200, { pointerType: 'touch', pointerId: 1 }));
        viewport.input.move(pointer(350, 200, { pointerType: 'touch', pointerId: 2 }));
        for (let i = 1; i <= 10; i++)
        {
            viewport.input.move(pointer(250 + (i * 4), 200 + (i * 2), { pointerType: 'touch', pointerId: 1 }));
            viewport.input.move(pointer(350 + (i * 4), 200 + (i * 2), { pointerType: 'touch', pointerId: 2 }));
        }
        const after = viewport.toWorld(340, 220);

        // pinch skips the midpoint's first small move, so allow for that in screen pixels
        expect(Math.abs(after.x - before.x) * viewport.scale.x).toBeLessThan(3);
        expect(Math.abs(after.y - before.y) * viewport.scale.y).toBeLessThan(3);
    });
});

describe('zoom level', () =>
{
    it.each([1, 8, 25, 100])('pinches by the same amount at scale %d (#431)', (scale) =>
    {
        const { viewport } = createViewport();

        viewport.drag().pinch();
        viewport.scale.set(scale);
        viewport.input.down(pointer(300, 300, { pointerType: 'touch', pointerId: 1, isPrimary: true }));
        viewport.input.down(pointer(400, 300, { pointerType: 'touch', pointerId: 2, isPrimary: false }));
        viewport.input.move(pointer(300, 300, { pointerType: 'touch', pointerId: 1 }));
        viewport.input.move(pointer(400, 300, { pointerType: 'touch', pointerId: 2 }));
        for (let x = 410; x <= 440; x += 10)
        {
            viewport.input.move(pointer(x, 300, { pointerType: 'touch', pointerId: 2 }));
        }

        expect(viewport.scale.x / scale).toBeCloseTo(1.364, 2);
    });
});

describe('clamp with bounce (#262)', () =>
{
    it.each([
        ['direction y', { direction: 'y' }],
        ['a negative top', { top: -50, bottom: 2000 }],
        ['top 0', { top: 0, bottom: 2000 }],
    ] as const)('settles and stops with %s', (_name, options) =>
    {
        const { viewport } = createViewport();

        viewport.drag().bounce().clamp(options as any);
        dragPointer(viewport, [[400, 300], [430, 300], [600, 400]]);
        frames(viewport, 300);
        const { x, y } = viewport;

        frames(viewport, 60);
        expect(viewport.x).toBe(x);
        expect(viewport.y).toBe(y);
        expect(x).toBeCloseTo(0);
    });
});

describe('mouseEdges after resizing and zooming (#263)', () =>
{
    it('scrolls at all four edges and not inside them', () =>
    {
        const { viewport } = createViewport();

        viewport.mouseEdges({ distance: 20 });
        viewport.moveCenter(1000, 1000);
        const check = () =>
        {
            const w = viewport.screenWidth;
            const h = viewport.screenHeight;
            const moves = (x: number, y: number) =>
            {
                const before = viewport.center;

                viewport.input.move(pointer(x, y));
                frames(viewport, 1);
                const after = viewport.center;

                viewport.input.move(pointer(w / 2, h / 2));
                frames(viewport, 1);

                return after.x !== before.x || after.y !== before.y;
            };

            for (const [x, y] of [[10, h / 2], [w - 10, h / 2], [w / 2, 10], [w / 2, h - 10]])
            {
                expect(moves(x, y)).toBe(true);
            }
            for (const [x, y] of [[25, h / 2], [w - 25, h / 2], [w / 2, 25], [w / 2, h - 25]])
            {
                expect(moves(x, y)).toBe(false);
            }
        };

        check();
        viewport.resize(1000, 800);
        check();
        viewport.setZoom(4);
        check();
        viewport.resize(500, 400, 3000, 3000);
        check();
    });
});

describe('wheel events from other elements', () =>
{
    it('zooms from an overlay inside the wrapper by default (#332)', () =>
    {
        const { viewport, domElement } = createViewport({}, { wrapper: true });
        const overlay = document.createElement('div');

        domElement.appendChild(overlay);
        viewport.wheel();
        wheel(overlay, { deltaY: -100, clientX: 300, clientY: 200 });
        expect(viewport.scale.x).toBeGreaterThan(1);
    });

    it('zooms from an element elsewhere when forwarded to handleWheel (#379)', () =>
    {
        const { viewport } = createViewport();
        const element = document.createElement('div');

        document.body.appendChild(element);
        element.addEventListener('wheel', (e) => viewport.input.handleWheel(e));
        viewport.wheel();
        wheel(element, { deltaY: -100, clientX: 300, clientY: 200 });
        expect(viewport.scale.x).toBeGreaterThan(1);
    });
});
