import { describe, expect, it } from 'vitest';
import { createViewport, frames, SCREEN_HEIGHT, SCREEN_WIDTH, WORLD_WIDTH } from './helpers';

describe('Clamp', () =>
{
    it('clamps to the world with direction "all"', () =>
    {
        const { viewport } = createViewport();

        viewport.clamp({ direction: 'all' });
        viewport.moveCorner(-100, -100);
        frames(viewport);
        expect(viewport.left).toBe(0);
        expect(viewport.top).toBe(0);

        viewport.moveCorner(5000, 5000);
        frames(viewport);
        expect(viewport.right).toBe(WORLD_WIDTH);
    });

    it('clamps only one direction', () =>
    {
        const { viewport } = createViewport();

        viewport.clamp({ direction: 'x' });
        viewport.moveCorner(-100, -100);
        frames(viewport);
        expect(viewport.left).toBe(0);
        expect(viewport.top).toBe(-100);
    });

    it('does nothing when called without options (#451)', () =>
    {
        const { viewport } = createViewport();

        viewport.clamp();
        viewport.moveCorner(-500, -500);
        frames(viewport);
        expect(viewport.left).toBe(-500);
        expect(viewport.top).toBe(-500);
    });

    it('clamps to numeric boundaries', () =>
    {
        const { viewport } = createViewport();

        viewport.clamp({ left: -100, top: 50 });
        viewport.moveCorner(-500, 0);
        frames(viewport);
        expect(viewport.left).toBe(-100);
        expect(viewport.top).toBe(50);
    });

    it('centers a world smaller than the screen', () =>
    {
        const { viewport } = createViewport({ worldWidth: 400, worldHeight: 300 });

        viewport.clamp({ direction: 'all' });
        frames(viewport);
        expect(viewport.x).toBe((SCREEN_WIDTH - 400) / 2);
        expect(viewport.y).toBe((SCREEN_HEIGHT - 300) / 2);
    });

    it('sticks a small world to the top-left with underflow', () =>
    {
        const { viewport } = createViewport({ worldWidth: 400, worldHeight: 300 });

        viewport.clamp({ direction: 'all', underflow: 'top-left' });
        viewport.position.set(100, 100);
        frames(viewport);
        expect(viewport.x).toBe(0);
        expect(viewport.y).toBe(0);
    });

    it('stops deceleration at the edge (#180, #340)', () =>
    {
        const { viewport } = createViewport();

        viewport.decelerate().clamp({ direction: 'all' });
        const decelerate = viewport.plugins.get('decelerate')!;

        decelerate.activate({ x: 5 });
        frames(viewport, 3);
        expect(viewport.left).toBe(0);
        expect(decelerate.x).toBe(0);
    });

    it('re-clamps when only the screen size changes (#517)', () =>
    {
        const { viewport } = createViewport();

        viewport.clamp({ direction: 'all' });
        viewport.moveCorner(WORLD_WIDTH - SCREEN_WIDTH, 0);
        frames(viewport);
        expect(viewport.right).toBe(WORLD_WIDTH);

        viewport.resize(SCREEN_WIDTH * 2, SCREEN_HEIGHT);
        frames(viewport);
        expect(viewport.right).toBe(WORLD_WIDTH);
    });
});

describe('ClampZoom', () =>
{
    it('clamps by width', () =>
    {
        const { viewport } = createViewport();

        viewport.clampZoom({ minWidth: 400, maxWidth: 1600 });
        viewport.setZoom(10);
        expect(viewport.worldScreenWidth).toBeCloseTo(400);

        viewport.setZoom(0.1);
        expect(viewport.worldScreenWidth).toBeCloseTo(1600);
    });

    it('clamps with only a minimum', () =>
    {
        const { viewport } = createViewport();

        viewport.clampZoom({ minWidth: 400 });
        viewport.setZoom(10);
        expect(viewport.worldScreenWidth).toBeCloseTo(400);
        viewport.setZoom(0.1);
        expect(viewport.scale.x).toBeCloseTo(0.1);
    });

    it('clamps by scale, including per axis', () =>
    {
        const { viewport } = createViewport();

        viewport.clampZoom({ minScale: 0.5, maxScale: 4 });
        viewport.setZoom(10);
        expect(viewport.scale.x).toBe(4);
        viewport.setZoom(0.1);
        expect(viewport.scale.x).toBe(0.5);

        viewport.clampZoom({ maxScale: { x: 2, y: 3 } });
        viewport.setZoom(10);
        expect(viewport.scale.x).toBe(2);
        expect(viewport.scale.y).toBe(3);
    });

    it('keeps the aspect ratio by default', () =>
    {
        const { viewport } = createViewport();

        viewport.clampZoom({ minWidth: 1600 });
        expect(viewport.scale.x).toBeCloseTo(0.5);
        expect(viewport.scale.y).toBeCloseTo(0.5);
    });

    it('scales only the clamped axis with keepAspectRatio: false (#470)', () =>
    {
        const { viewport } = createViewport();

        viewport.clampZoom({ minWidth: 1600, keepAspectRatio: false });
        expect(viewport.scale.x).toBeCloseTo(0.5);
        expect(viewport.scale.y).toBe(1);
    });
});
