import { Container } from 'pixi.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createViewport, frames, pointer } from './helpers';

afterEach(() =>
{
    vi.restoreAllMocks();
});

describe('Decelerate', () =>
{
    it('keeps moving after a drag is released', () =>
    {
        const { viewport } = createViewport();
        let now = 1000;

        vi.spyOn(performance, 'now').mockImplementation(() => now);
        viewport.drag().decelerate();

        viewport.input.down(pointer(100, 100, { buttons: 1 }));
        viewport.input.move(pointer(110, 100, { buttons: 1 }));
        now += 16;
        viewport.input.move(pointer(150, 100, { buttons: 1 }));
        viewport.input.up(pointer(150, 100));

        const decelerate = viewport.plugins.get('decelerate')!;

        expect(decelerate.x).toBeCloseTo(40 / 16);
        const released = viewport.x;

        frames(viewport, 10);
        expect(viewport.x).toBeGreaterThan(released);
    });

    it('slows to a stop', () =>
    {
        const { viewport } = createViewport();

        viewport.decelerate();
        viewport.plugins.get('decelerate')!.activate({ x: 1 });
        frames(viewport, 500);
        expect(viewport.plugins.get('decelerate')!.isActive()).toBe(false);
    });

    it('removes its moved listener when removed', () =>
    {
        const { viewport } = createViewport();
        const before = viewport.listenerCount('moved');

        viewport.decelerate();
        viewport.decelerate();
        expect(viewport.listenerCount('moved')).toBe(before + 1);

        viewport.plugins.remove('decelerate');
        expect(viewport.listenerCount('moved')).toBe(before);
    });
});

describe('Bounce', () =>
{
    it('bounces back inside the world', () =>
    {
        const { viewport } = createViewport();
        const start = vi.fn();
        const end = vi.fn();

        viewport.on('bounce-x-start', start);
        viewport.on('bounce-x-end', end);
        viewport.bounce({ time: 100 });
        viewport.moveCorner(-200, 0);
        frames(viewport, 20);

        expect(viewport.left).toBeCloseTo(0);
        expect(start).toHaveBeenCalled();
        expect(end).toHaveBeenCalled();
    });
});

describe('Follow', () =>
{
    it('centers on the target', () =>
    {
        const { viewport } = createViewport();
        const target = viewport.addChild(new Container());

        target.position.set(700, 900);
        viewport.follow(target);
        frames(viewport);
        expect(viewport.center.x).toBeCloseTo(700);
        expect(viewport.center.y).toBeCloseTo(900);
    });

    it('follows a target nested in another container (#448)', () =>
    {
        const { viewport } = createViewport();
        const group = viewport.addChild(new Container());
        const target = group.addChild(new Container());

        group.position.set(100, 100);
        target.position.set(50, 50);
        viewport.follow(target);
        frames(viewport);
        expect(viewport.center.x).toBeCloseTo(150);
        expect(viewport.center.y).toBeCloseTo(150);
    });

    it('moves at most speed per frame', () =>
    {
        const { viewport } = createViewport();
        const target = viewport.addChild(new Container());

        viewport.moveCenter(0, 0);
        target.position.set(1000, 0);
        viewport.follow(target, { speed: 5 });
        frames(viewport);
        expect(viewport.center.x).toBeCloseTo(5);
    });

    it('never exceeds speed when accelerating (#131)', () =>
    {
        const { viewport } = createViewport();
        const target = viewport.addChild(new Container());

        viewport.moveCenter(0, 0);
        target.position.set(10000, 0);
        viewport.follow(target, { speed: 5, acceleration: 0.01 });

        let last = viewport.center.x;

        for (let i = 0; i < 200; i++)
        {
            frames(viewport);
            expect(viewport.center.x - last).toBeLessThanOrEqual(5 + 1e-9);
            last = viewport.center.x;
        }
        expect(last).toBeGreaterThan(0);
    });

    it('waits until the target leaves the radius', () =>
    {
        const { viewport } = createViewport();
        const target = viewport.addChild(new Container());

        viewport.moveCenter(500, 500);
        target.position.set(550, 500);
        viewport.follow(target, { radius: 100 });
        frames(viewport);
        expect(viewport.center.x).toBeCloseTo(500);

        target.position.set(700, 500);
        frames(viewport);
        expect(viewport.center.x).toBeCloseTo(600);
    });
});

describe('Animate', () =>
{
    it('animates position and scale, then calls back', () =>
    {
        const { viewport } = createViewport();
        const callback = vi.fn();
        const end = vi.fn();

        viewport.on('animate-end', end);
        viewport.animate({ time: 100, position: { x: 1000, y: 1000 } as any, scale: 2, callbackOnComplete: callback });
        frames(viewport, 3);
        expect(viewport.scale.x).toBeGreaterThan(1);
        expect(viewport.scale.x).toBeLessThan(2);

        frames(viewport, 10);
        expect(viewport.scale.x).toBeCloseTo(2);
        expect(viewport.center.x).toBeCloseTo(1000);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(end).toHaveBeenCalledTimes(1);
        expect(viewport.plugins.get('animate')).toBeUndefined();
    });

    it('stops on user input with removeOnInterrupt, including the wheel (#524)', () =>
    {
        const { viewport, canvas } = createViewport();

        viewport.wheel();
        viewport.animate({ time: 1000, scale: 3, removeOnInterrupt: true });
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, clientX: 10, clientY: 10 }));
        expect(viewport.plugins.get('animate')).toBeUndefined();

        viewport.animate({ time: 1000, scale: 3, removeOnInterrupt: true });
        viewport.input.down(pointer(10, 10));
        expect(viewport.plugins.get('animate')).toBeUndefined();
    });
});

describe('Snap', () =>
{
    it('snaps the center to a point', () =>
    {
        const { viewport } = createViewport();
        const end = vi.fn();

        viewport.on('snap-end', end);
        viewport.snap(1000, 800, { time: 100, removeOnComplete: true });
        frames(viewport, 10);
        expect(viewport.center.x).toBeCloseTo(1000);
        expect(viewport.center.y).toBeCloseTo(800);
        expect(end).toHaveBeenCalled();
        expect(viewport.plugins.get('snap')).toBeUndefined();
    });

    it('snaps the zoom', () =>
    {
        const { viewport } = createViewport();

        viewport.snapZoom({ width: 400, time: 100 });
        frames(viewport, 10);
        expect(viewport.worldScreenWidth).toBeCloseTo(400);
    });

    it('snaps the zoom immediately with time 0', () =>
    {
        const { viewport } = createViewport();

        expect(() => viewport.snapZoom({ width: 400, time: 0 })).not.toThrow();
        expect(viewport.scale.x).toBeCloseTo(2);
    });
});
