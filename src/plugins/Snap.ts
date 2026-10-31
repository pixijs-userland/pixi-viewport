import ease from '../ease.js';
import { Plugin } from './Plugin.js';

import type { Viewport } from '../Viewport.js';

/** @category Plugin options */
export interface ISnapOptions
{
    /** snap to the top-left of viewport instead of center */
    topLeft?: boolean;

    /**
     * Friction/frame to apply if decelerate is active
     *
     * @default 0.8
     */
    friction?: number;

    /**
     * @default 1000
     */
    time?: number;

    /** Easing function or name (see http://easings.net/ for supported names) */
    ease?: any;

    /**
     * Pause snapping with any user input on the viewport
     *
     * @default true
     */
    interrupt?: boolean;

    /**
     * Removes this plugin after snapping is complete
     *
     * @default false
     */
    removeOnComplete?: boolean;

    /**
     * Removes this plugin if interrupted by any user input
     *
     * @default false
     */
    removeOnInterrupt?: boolean;

    /**
     * Starts the snap immediately regardless of whether the viewport is at the desired location
     *
     * @default false
     */
    forceStart?: boolean;
}

const DEFAULT_SNAP_OPTIONS: Required<ISnapOptions> = {
    topLeft: false,
    friction: 0.8,
    time: 1000,
    ease: 'easeInOutSine',
    interrupt: true,
    removeOnComplete: false,
    removeOnInterrupt: false,
    forceStart: false
};

/**
 * @event snap-start(Viewport) emitted each time a snap animation starts
 * @event snap-restart(Viewport) emitted each time a snap resets because of a change in viewport size
 * @event snap-end(Viewport) emitted each time snap reaches its target
 * @event snap-remove(Viewport) emitted if snap plugin is removed
 *
 * @category Plugins
 */
export class Snap extends Plugin
{
    public readonly options: Required<ISnapOptions>;
    public ease?: any;
    public x: number;
    public y: number;

    protected percent?: number;
    protected snapping?: { time: number } | null;
    protected deltaX?: number;
    protected deltaY?: number;
    protected startX?: number;
    protected startY?: number;

    /**
     * This is called by {@link Viewport.snap}.
     */
    constructor(parent: Viewport, x: number, y: number, options: ISnapOptions = {})
    {
        super(parent);
        this.options = Object.assign({}, DEFAULT_SNAP_OPTIONS, options);
        this.ease = ease(options.ease, 'easeInOutSine');
        this.x = x;
        this.y = y;

        if (this.options.forceStart)
        {
            this.snapStart();
        }
    }

    public snapStart(): void
    {
        this.percent = 0;
        this.snapping = { time: 0 };
        const current = this.options.topLeft ? this.parent.corner : this.parent.center;

        this.deltaX = this.x - current.x;
        this.deltaY = this.y - current.y;
        this.startX = current.x;
        this.startY = current.y;
        this.parent.emit('snap-start', this.parent);
    }

    public wheel(): boolean
    {
        if (this.options.removeOnInterrupt)
        {
            this.parent.plugins.remove('snap');
        }

        return false;
    }

    public down(): boolean
    {
        if (this.options.removeOnInterrupt)
        {
            this.parent.plugins.remove('snap');
        }
        else if (this.options.interrupt)
        {
            this.snapping = null;
        }

        return false;
    }

    public up(): boolean
    {
        if (this.parent.input.count() === 0)
        {
            const decelerate = this.parent.plugins.get('decelerate', true);

            if (decelerate && (decelerate.x || decelerate.y))
            {
                decelerate.percentChangeX = decelerate.percentChangeY = this.options.friction;
            }
        }

        return false;
    }

    public update(elapsed: number): void
    {
        if (this.paused)
        {
            return;
        }
        if (this.options.interrupt && this.parent.input.count() !== 0)
        {
            return;
        }
        if (!this.snapping)
        {
            const current = this.options.topLeft ? this.parent.corner : this.parent.center;

            if (current.x !== this.x || current.y !== this.y)
            {
                this.snapStart();
            }
        }
        else
        {
            const snapping = this.snapping;

            snapping.time += elapsed;
            let finished;
            let x;
            let y;

            const startX = this.startX as number;
            const startY = this.startY as number;
            const deltaX = this.deltaX as number;
            const deltaY = this.deltaY as number;

            if (snapping.time > this.options.time)
            {
                finished = true;
                x = startX + deltaX;
                y = startY + deltaY;
            }
            else
            {
                const percent = this.ease(snapping.time, 0, 1, this.options.time);

                x = startX + (deltaX * percent);
                y = startY + (deltaY * percent);
            }
            if (this.options.topLeft)
            {
                this.parent.moveCorner(x, y);
            }
            else
            {
                this.parent.moveCenter(x, y);
            }

            this.parent.emit('moved', { viewport: this.parent, type: 'snap' });

            if (finished)
            {
                if (this.options.removeOnComplete)
                {
                    this.parent.plugins.remove('snap');
                }
                this.parent.emit('snap-end', this.parent);
                this.snapping = null;
            }
        }
    }
}
