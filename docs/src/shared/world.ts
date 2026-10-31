import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { PALETTE, Random } from './random';

import type { Ticker } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';

/** Grid and label colors that read on both light and dark page backgrounds */
const GRID_COLOR = 0x8892a6;

function isDark(): boolean
{
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function labelColor(): number
{
    return isDark() ? 0xcbd5e1 : 0x334155;
}

/** Draws a grid with minor and major lines plus coordinate labels on the major lines */
function grid(width: number, height: number, minor: number, major: number): Container
{
    const container = new Container();
    const lines = new Graphics();

    for (let x = 0; x <= width; x += minor)
    {
        lines.moveTo(x, 0).lineTo(x, height);
    }
    for (let y = 0; y <= height; y += minor)
    {
        lines.moveTo(0, y).lineTo(width, y);
    }
    lines.stroke({ width: 1, color: GRID_COLOR, alpha: 0.18 });

    for (let x = 0; x <= width; x += major)
    {
        lines.moveTo(x, 0).lineTo(x, height);
    }
    for (let y = 0; y <= height; y += major)
    {
        lines.moveTo(0, y).lineTo(width, y);
    }
    lines.stroke({ width: 2, color: GRID_COLOR, alpha: 0.35 });
    container.addChild(lines);

    const style = { fontFamily: 'system-ui, sans-serif', fontSize: 22, fill: labelColor() };

    for (let x = 0; x < width; x += major)
    {
        for (let y = 0; y < height; y += major)
        {
            const label = new Text({ text: `${x}, ${y}`, style });

            label.alpha = 0.6;
            label.position.set(x + 8, y + 6);
            container.addChild(label);
        }
    }

    return container;
}

/** Draws the world boundary */
function border(width: number, height: number): Graphics
{
    return new Graphics().rect(0, 0, width, height).stroke({ width: 8, color: 0xe91e63, alignment: 0 });
}

export interface MapWorld
{
    /** Object that wanders around the world (used by the follow preset) */
    target: Container;
}

/** A large map: grid, scattered squares, a border, and an object that wanders around */
export function buildMap(viewport: Viewport, ticker: Ticker, width: number, height: number): MapWorld
{
    const random = new Random(7);

    viewport.addChild(grid(width, height, 100, 500));

    const count = Math.round((width * height) / 25000);

    for (let i = 0; i < count; i++)
    {
        const size = random.range(12, 44);
        const square = new Sprite(Texture.WHITE);

        square.anchor.set(0.5);
        square.width = square.height = size;
        square.tint = random.pick(PALETTE);
        square.alpha = random.range(0.35, 0.95);
        square.rotation = random.range(0, Math.PI);
        square.position.set(random.range(size, width - size), random.range(size, height - size));
        viewport.addChild(square);
    }

    viewport.addChild(border(width, height));

    const target = wanderer(ticker, random, width, height);

    viewport.addChild(target);

    return { target };
}

/** A shape that drifts toward random points in the world */
function wanderer(ticker: Ticker, random: Random, width: number, height: number): Container
{
    const target = new Container();
    const body = new Graphics()
        .star(0, 0, 5, 36, 16)
        .fill(0xffc107)
        .stroke({ width: 4, color: 0x0f172a });

    target.addChild(body);
    target.position.set(width / 2, height / 2);

    const margin = 200;
    let goal = { x: target.x, y: target.y };
    let wait = 0;
    const speed = 0.25; // world pixels per millisecond

    const update = (t: Ticker): void =>
    {
        if (target.destroyed)
        {
            ticker.remove(update);

            return;
        }
        body.rotation += t.deltaMS * 0.002;
        if (wait > 0)
        {
            wait -= t.deltaMS;

            return;
        }

        const dx = goal.x - target.x;
        const dy = goal.y - target.y;
        const distance = Math.hypot(dx, dy);
        const step = speed * t.deltaMS;

        if (distance <= step)
        {
            target.position.set(goal.x, goal.y);
            goal = { x: random.range(margin, width - margin), y: random.range(margin, height - margin) };
            wait = random.chance(0.5) ? random.range(400, 2000) : 0;
        }
        else
        {
            target.x += (dx / distance) * step;
            target.y += (dy / distance) * step;
        }
    };

    ticker.add(update);

    return target;
}

/** A long horizontal timeline with tracks of clips, for single-axis zooming */
export function buildTimeline(viewport: Viewport, width: number, height: number): void
{
    const random = new Random(3);
    const ruler = new Graphics();
    const tracks = 6;
    const rulerHeight = 60;
    const trackHeight = (height - rulerHeight) / tracks;
    const secondWidth = 100;

    for (let x = 0; x <= width; x += secondWidth)
    {
        const major = x % (secondWidth * 10) === 0;

        ruler.moveTo(x, major ? 0 : rulerHeight * 0.6).lineTo(x, major ? height : rulerHeight);
    }
    ruler.stroke({ width: 2, color: GRID_COLOR, alpha: 0.4 });
    viewport.addChild(ruler);

    const style = { fontFamily: 'system-ui, sans-serif', fontSize: 20, fill: labelColor() };

    for (let x = 0; x < width; x += secondWidth * 10)
    {
        const seconds = x / secondWidth;
        const label = new Text({
            text: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
            style,
        });

        label.position.set(x + 6, 6);
        viewport.addChild(label);
    }

    for (let track = 0; track < tracks; track++)
    {
        const y = rulerHeight + (track * trackHeight);
        const color = PALETTE[track % PALETTE.length];
        const clips = new Graphics();
        let x = random.range(0, 300);

        while (x < width - 200)
        {
            const clipWidth = random.range(120, 1200);

            clips.roundRect(x, y + 10, Math.min(clipWidth, width - x), trackHeight - 20, 10);
            x += clipWidth + random.range(40, 600);
        }
        clips.fill({ color, alpha: 0.75 });
        viewport.addChild(clips);
    }

    viewport.addChild(border(width, height));
}

/** Shows an expanding ring at a world position, e.g., where the viewport was clicked */
export function ripple(viewport: Viewport, ticker: Ticker, x: number, y: number): void
{
    const ring = new Graphics().circle(0, 0, 20).stroke({ width: 4, color: 0xe91e63 });
    const duration = 600;
    let time = 0;

    ring.position.set(x, y);
    viewport.addChild(ring);

    const update = (t: Ticker): void =>
    {
        time += t.deltaMS;
        const progress = Math.min(time / duration, 1);

        // keep the ring the same size on screen at any zoom
        ring.scale.set((1 + (progress * 1.5)) / viewport.scale.x, (1 + (progress * 1.5)) / viewport.scale.y);
        ring.alpha = 1 - progress;
        if (progress === 1 || ring.destroyed)
        {
            ticker.remove(update);
            if (!ring.destroyed)
            {
                ring.destroy();
            }
        }
    };

    ticker.add(update);
}
