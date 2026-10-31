import { describe, expect, it, vi } from 'vitest';
import { createViewport, frames, pointer, SCREEN_HEIGHT, SCREEN_WIDTH } from './helpers';

import type { Viewport } from '../src/index';

const FRAME = 1000 / 60;

function hover(viewport: Viewport, x: number, y: number, buttons = 0): void
{
    viewport.input.move(pointer(x, y, { buttons }));
}

describe('EdgeScroll', () =>
{
    it('scrolls toward the edge at speed screen pixels per second', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ distance: 20, speed: 600 });
        viewport.moveCenter(1000, 1000);
        hover(viewport, SCREEN_WIDTH - 5, 300);
        frames(viewport, 1, 1000);
        expect(viewport.center.x).toBeCloseTo(1600);
        expect(viewport.center.y).toBeCloseTo(1000);

        hover(viewport, 5, 5);
        frames(viewport, 1, 500);
        expect(viewport.center.x).toBeCloseTo(1300);
        expect(viewport.center.y).toBeCloseTo(700);
    });

    it('scrolls the same distance on screen at any zoom', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ distance: 20, speed: 600 });
        viewport.setZoom(2);
        viewport.moveCenter(1000, 1000);
        hover(viewport, SCREEN_WIDTH - 5, 300);
        frames(viewport, 1, 1000);

        // 600 screen pixels at scale 2 is 300 world pixels
        expect(viewport.center.x).toBeCloseTo(1300);
    });

    it('scrolls the same distance at any frame rate', () =>
    {
        const a = createViewport().viewport;
        const b = createViewport().viewport;

        for (const viewport of [a, b])
        {
            viewport.edgeScroll({ distance: 20 });
            hover(viewport, SCREEN_WIDTH - 5, 300);
        }
        frames(a, 60, FRAME);
        frames(b, 30, FRAME * 2);
        expect(a.center.x).toBeCloseTo(b.center.x);
    });

    it('uses separate insets for each side', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ left: 50, speed: 600 });
        viewport.moveCenter(1000, 1000);
        hover(viewport, SCREEN_WIDTH - 5, SCREEN_HEIGHT - 5);
        frames(viewport, 1, 1000);
        expect(viewport.center.x).toBeCloseTo(1000);

        hover(viewport, 40, 300);
        frames(viewport, 1, 1000);
        expect(viewport.center.x).toBeCloseTo(400);
    });

    it('scrolls toward the pointer outside a radius', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ radius: 100, speed: 600 });
        viewport.moveCenter(1000, 1000);
        hover(viewport, (SCREEN_WIDTH / 2) + 50, SCREEN_HEIGHT / 2);
        frames(viewport, 1, 1000);
        expect(viewport.center.x).toBeCloseTo(1000);

        hover(viewport, (SCREEN_WIDTH / 2) + 200, SCREEN_HEIGHT / 2);
        frames(viewport, 1, 1000);
        expect(viewport.center.x).toBeCloseTo(1600);
        expect(viewport.center.y).toBeCloseTo(1000);
    });

    it('reverses', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ distance: 20, speed: 600, reverse: true });
        viewport.moveCenter(1000, 1000);
        hover(viewport, SCREEN_WIDTH - 5, 300);
        frames(viewport, 1, 1000);
        expect(viewport.center.x).toBeCloseTo(400);
    });

    it('emits edge-scroll-start and edge-scroll-end', () =>
    {
        const { viewport } = createViewport();
        const start = vi.fn();
        const end = vi.fn();
        const moved = vi.fn();

        viewport.on('edge-scroll-start', start);
        viewport.on('edge-scroll-end', end);
        viewport.on('moved', moved);
        viewport.edgeScroll({ distance: 20 });

        hover(viewport, 5, 300);
        frames(viewport, 3);
        hover(viewport, 400, 300);
        frames(viewport, 3);

        expect(start).toHaveBeenCalledTimes(1);
        expect(end).toHaveBeenCalledTimes(1);
        expect(moved).toHaveBeenCalledWith(expect.objectContaining({ type: 'edge-scroll' }));
    });

    it('ignores the pointer while a button is pressed unless allowButtons is set', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ distance: 20 });
        hover(viewport, 5, 300, 1);
        frames(viewport, 1, 1000);
        expect(viewport.x).toBe(0);

        viewport.edgeScroll({ distance: 20, allowButtons: true });
        hover(viewport, 5, 300, 1);
        frames(viewport, 1, 1000);
        expect(viewport.x).not.toBe(0);
    });

    it('hands its speed to decelerate when it stops', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ distance: 20, speed: 600 }).decelerate();
        hover(viewport, SCREEN_WIDTH - 5, 300);
        frames(viewport);
        hover(viewport, 400, 300);

        // scrolling right moves the viewport container left at 600 px/s, which is 0.6 px/ms
        expect(viewport.plugins.get('decelerate')!.x).toBeCloseTo(-0.6);
    });

    it('does not hand off with noDecelerate', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ distance: 20, noDecelerate: true }).decelerate();
        hover(viewport, SCREEN_WIDTH - 5, 300);
        frames(viewport);
        hover(viewport, 400, 300);
        expect(viewport.plugins.get('decelerate')!.isActive()).toBe(false);
    });

    it('stops when the pointer is released or leaves', () =>
    {
        const { viewport } = createViewport();

        viewport.edgeScroll({ distance: 20 });
        hover(viewport, 5, 300);
        viewport.input.up(pointer(5, 300));
        frames(viewport, 1, 1000);
        expect(viewport.x).toBe(0);
    });
});

describe('MouseEdges (deprecated)', () =>
{
    it('keeps its documented speed: speed * speed * 0.06 world pixels per update', () =>
    {
        const { viewport } = createViewport();

        viewport.mouseEdges({ distance: 20, speed: 8 });
        viewport.moveCenter(1000, 1000);
        hover(viewport, 5, 300);
        frames(viewport, 1, 1000);
        expect(viewport.center.x).toBeCloseTo(1000 - (8 * 8 * 0.06));
    });

    it('emits mouse-edge-start and mouse-edge-end (#416)', () =>
    {
        const { viewport } = createViewport();
        const start = vi.fn();
        const end = vi.fn();

        viewport.on('mouse-edge-start', start);
        viewport.on('mouse-edge-end', end);
        viewport.mouseEdges({ distance: 20 });
        hover(viewport, 5, 300);
        frames(viewport, 2);
        hover(viewport, 400, 300);
        frames(viewport, 2);
        expect(start).toHaveBeenCalledTimes(1);
        expect(end).toHaveBeenCalledTimes(1);
    });
});
