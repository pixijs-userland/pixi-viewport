import { Point, Ticker } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import { createViewport, frames, SCREEN_HEIGHT, SCREEN_WIDTH, WORLD_HEIGHT, WORLD_WIDTH } from './helpers';

describe('Viewport', () =>
{
    it('uses default options', () =>
    {
        const { viewport } = createViewport();

        expect(viewport.screenWidth).toBe(SCREEN_WIDTH);
        expect(viewport.screenHeight).toBe(SCREEN_HEIGHT);
        expect(viewport.worldWidth).toBe(WORLD_WIDTH);
        expect(viewport.worldHeight).toBe(WORLD_HEIGHT);
        expect(viewport.threshold).toBe(5);
        expect(viewport.options.passiveWheel).toBe(true);
        expect(viewport.options.stopPropagation).toBe(false);
        expect(viewport.options.ignoreWheelFromOtherElements).toBe(false);
        expect(viewport.eventMode).toBe('static');
    });

    it('adds and removes its ticker listener', () =>
    {
        const ticker = new Ticker();
        const before = ticker.count;
        const { viewport } = createViewport({ noTicker: false, ticker });

        expect(ticker.count).toBe(before + 1);
        viewport.destroy();
        expect(ticker.count).toBe(before);
        ticker.destroy();
    });

    it('removes its wheel listener on destroy', () =>
    {
        const { viewport, canvas } = createViewport();
        const remove = vi.spyOn(canvas, 'removeEventListener');

        viewport.destroy();
        expect(remove).toHaveBeenCalledWith('wheel', expect.any(Function));
    });

    it('converts between screen and world coordinates', () =>
    {
        const { viewport, stage } = createViewport();

        stage.position.set(10, 20);
        viewport.scale.set(2);
        viewport.position.set(-100, -50);

        const world = viewport.toWorld(110, 70);

        expect(world.x).toBeCloseTo(100);
        expect(world.y).toBeCloseTo(50);

        const screen = viewport.toScreen(world);

        expect(screen.x).toBeCloseTo(110);
        expect(screen.y).toBeCloseTo(70);
    });

    it('moves the center and corner', () =>
    {
        const { viewport } = createViewport();

        viewport.setZoom(2);
        viewport.moveCenter(500, 400);
        expect(viewport.center.x).toBeCloseTo(500);
        expect(viewport.center.y).toBeCloseTo(400);

        viewport.moveCorner(100, 200);
        expect(viewport.corner.x).toBeCloseTo(100);
        expect(viewport.corner.y).toBeCloseTo(200);
        expect(viewport.left).toBeCloseTo(100);
        expect(viewport.top).toBeCloseTo(200);
        expect(viewport.right).toBeCloseTo(100 + (SCREEN_WIDTH / 2));
        expect(viewport.bottom).toBeCloseTo(200 + (SCREEN_HEIGHT / 2));
    });

    it('fits widths, heights, and the world', () =>
    {
        const { viewport } = createViewport();

        viewport.fitWidth(400);
        expect(viewport.scale.x).toBeCloseTo(2);
        expect(viewport.scale.y).toBeCloseTo(2);

        viewport.fitHeight(1200);
        expect(viewport.scale.y).toBeCloseTo(0.5);
        expect(viewport.scale.x).toBeCloseTo(0.5);

        viewport.fitWorld();
        expect(viewport.scale.x).toBeCloseTo(Math.min(SCREEN_WIDTH / WORLD_WIDTH, SCREEN_HEIGHT / WORLD_HEIGHT));

        viewport.fit(false, 1600, 600);
        expect(viewport.scale.x).toBeCloseTo(0.5);
    });

    it('keeps the center when zooming with center=true', () =>
    {
        const { viewport } = createViewport();

        viewport.moveCenter(700, 300);
        viewport.setZoom(3, true);
        expect(viewport.scale.x).toBe(3);
        expect(viewport.center.x).toBeCloseTo(700);
        expect(viewport.center.y).toBeCloseTo(300);

        viewport.zoomPercent(0.5, true);
        expect(viewport.scale.x).toBeCloseTo(4.5);
        expect(viewport.center.x).toBeCloseTo(700);
    });

    it('moves so a box is visible with ensureVisible', () =>
    {
        const { viewport } = createViewport();
        const moved = vi.fn();

        viewport.on('moved', moved);
        viewport.ensureVisible(1500, 1500, 100, 100);
        expect(viewport.right).toBeCloseTo(1600);
        expect(viewport.bottom).toBeCloseTo(1600);
        expect(moved).toHaveBeenCalledWith(expect.objectContaining({ type: 'ensureVisible' }));
    });

    it('keeps a positive hit area with negative scale (#500)', () =>
    {
        const { viewport } = createViewport();

        viewport.scale.set(1, -1);
        viewport.position.set(0, SCREEN_HEIGHT);
        frames(viewport);

        const bounds = viewport.getVisibleBounds();

        expect(bounds.width).toBe(SCREEN_WIDTH);
        expect(bounds.height).toBe(SCREEN_HEIGHT);
        expect(viewport.hitArea?.contains(100, 300)).toBe(true);
    });

    it('updates the hit area to the visible bounds, reusing one rectangle', () =>
    {
        const { viewport } = createViewport();

        frames(viewport);
        const hitArea = viewport.hitArea;

        viewport.moveCorner(300, 400);
        frames(viewport);
        expect(viewport.hitArea).toBe(hitArea);
        expect(viewport.hitArea?.contains(310, 410)).toBe(true);
        expect(viewport.hitArea?.contains(290, 410)).toBe(false);
    });

    it('emits moved-end and zoomed-end once changes stop', () =>
    {
        const { viewport } = createViewport();
        const movedEnd = vi.fn();
        const zoomedEnd = vi.fn();

        viewport.on('moved-end', movedEnd);
        viewport.on('zoomed-end', zoomedEnd);
        frames(viewport);
        viewport.position.set(-10, -10);
        viewport.scale.set(1.5);
        frames(viewport);
        expect(movedEnd).not.toHaveBeenCalled();
        frames(viewport);
        expect(movedEnd).toHaveBeenCalledTimes(1);
        expect(zoomedEnd).toHaveBeenCalledTimes(1);
    });

    it('does not update plugins while paused', () =>
    {
        const { viewport } = createViewport();

        viewport.decelerate();
        const decelerate = viewport.plugins.get('decelerate')!;

        decelerate.activate({ x: 1 });
        viewport.pause = true;
        frames(viewport, 5);
        expect(viewport.x).toBe(0);

        viewport.pause = false;
        frames(viewport, 5);
        expect(viewport.x).toBeGreaterThan(0);
    });

    it('accepts a point for center and corner setters', () =>
    {
        const { viewport } = createViewport();

        viewport.center = new Point(1000, 1000);
        expect(viewport.center.x).toBeCloseTo(1000);
        viewport.corner = new Point(50, 60);
        expect(viewport.left).toBeCloseTo(50);
        expect(viewport.top).toBeCloseTo(60);
    });
});
