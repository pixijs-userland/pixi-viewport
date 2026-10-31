import ease from '../ease.js';
import { Plugin } from './Plugin.js';

import type { Point } from 'pixi.js';
import type { Viewport } from '../Viewport.js';

/** Options for {@link SnapZoom}. */
export interface ISnapZoomOptions
{
    /** the desired width to snap (to maintain aspect ratio, choose only width or height) */
    width?: number;

    /** the desired height to snap (to maintain aspect ratio, choose only width or height) */
    height?: number;

    /**
     * time for snapping in ms
     *
     * @default 1000
     */
    time?: number;

    /** ease function or name (see http://easings.net/ for supported names) */
    ease?: any;

    /** Place this point at center during zoom instead of center of the viewport */
    center?: Point | null;

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
     * Starts the snap immediately regardless of whether the viewport is at the desired zoom
     *
     * @default false
     */
    forceStart?: boolean;

    /**
     * Zoom but do not move
     *
     * @default false
     */
    noMove?: boolean;
}

const DEFAULT_SNAP_ZOOM_OPTIONS: Required<ISnapZoomOptions> = {
    width: 0,
    height: 0,
    time: 1000,
    ease: 'easeInOutSine',
    center: null,
    interrupt: true,
    removeOnComplete: false,
    removeOnInterrupt: false,
    forceStart: false,
    noMove: false
};

/**
 * @event snap-zoom-start(Viewport) emitted each time a fit animation starts
 * @event snap-zoom-end(Viewport) emitted each time fit reaches its target
 * @event snap-zoom-end(Viewport) emitted each time fit reaches its target
 */
export class SnapZoom extends Plugin
{
    public readonly options: Required<ISnapZoomOptions>;

    protected ease: any;
    protected xScale: number;
    protected yScale: number;
    protected xIndependent: boolean;
    protected yIndependent: boolean;
    protected snapping?: {
        time: number;
        startX: number;
        startY: number;
        deltaX: number;
        deltaY: number;
    } | null;

    /**
     * This is called by {@link Viewport.snapZoom}.
     */
    constructor(parent: Viewport, options: ISnapZoomOptions = {})
    {
        super(parent);

        this.options = Object.assign({}, DEFAULT_SNAP_ZOOM_OPTIONS, options);
        this.ease = ease(this.options.ease);

        // Assign defaults for typescript.
        this.xIndependent = false;
        this.yIndependent = false;
        this.xScale = 0;
        this.yScale = 0;

        if (this.options.width > 0)
        {
            this.xScale = parent.screenWidth / this.options.width;
            this.xIndependent = true;
        }
        if (this.options.height > 0)
        {
            this.yScale = parent.screenHeight / this.options.height;
            this.yIndependent = true;
        }

        this.xScale = this.xIndependent ? (this.xScale as number) : (this.yScale as number);
        this.yScale = this.yIndependent ? (this.yScale as number) : this.xScale;

        if (this.options.time === 0)
        {
            parent.scale.set(this.xScale, this.yScale);

            if (this.options.removeOnComplete)
            {
                this.parent.plugins.remove('snap-zoom');
            }
        }
        else if (options.forceStart)
        {
            this.createSnapping();
        }
    }

    private createSnapping(): void
    {
        const startWorldScreenWidth = this.parent.worldScreenWidth;
        const startWorldScreenHeight = this.parent.worldScreenHeight;
        const endWorldScreenWidth = this.parent.screenWidth / this.xScale;
        const endWorldScreenHeight = this.parent.screenHeight / this.yScale;

        this.snapping = {
            time: 0,
            startX: startWorldScreenWidth,
            startY: startWorldScreenHeight,
            deltaX: endWorldScreenWidth - startWorldScreenWidth,
            deltaY: endWorldScreenHeight - startWorldScreenHeight
        };

        this.parent.emit('snap-zoom-start', this.parent);
    }

    public resize(): void
    {
        this.snapping = null;

        if (this.options.width > 0)
        {
            this.xScale = this.parent.screenWidth / this.options.width;
        }
        if (this.options.height > 0)
        {
            this.yScale = this.parent.screenHeight / this.options.height;
        }
        this.xScale = this.xIndependent ? this.xScale : this.yScale;
        this.yScale = this.yIndependent ? this.yScale : this.xScale;
    }

    public wheel(): boolean
    {
        if (this.options.removeOnInterrupt)
        {
            this.parent.plugins.remove('snap-zoom');
        }

        return false;
    }

    public down(): boolean
    {
        if (this.options.removeOnInterrupt)
        {
            this.parent.plugins.remove('snap-zoom');
        }
        else if (this.options.interrupt)
        {
            this.snapping = null;
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

        let oldCenter: Point | undefined;

        if (!this.options.center && !this.options.noMove)
        {
            oldCenter = this.parent.center;
        }
        if (!this.snapping)
        {
            if (this.parent.scale.x !== this.xScale || this.parent.scale.y !== this.yScale)
            {
                this.createSnapping();
            }
        }
        else if (this.snapping)
        {
            const snapping = this.snapping;

            snapping.time += elapsed;

            if (snapping.time >= this.options.time)
            {
                this.parent.scale.set(this.xScale, this.yScale);
                if (this.options.removeOnComplete)
                {
                    this.parent.plugins.remove('snap-zoom');
                }
                this.parent.emit('snap-zoom-end', this.parent);
                this.snapping = null;
            }
            else
            {
                const snapping = this.snapping;
                const worldScreenWidth = this.ease(snapping.time, snapping.startX, snapping.deltaX, this.options.time);
                const worldScreenHeight = this.ease(snapping.time, snapping.startY, snapping.deltaY, this.options.time);

                this.parent.scale.x = this.parent.screenWidth / worldScreenWidth;
                this.parent.scale.y = this.parent.screenHeight / worldScreenHeight;
            }
            const clamp = this.parent.plugins.get('clamp-zoom', true);

            if (clamp)
            {
                clamp.clamp();
            }
            if (!this.options.noMove)
            {
                if (!this.options.center)
                {
                    this.parent.moveCenter(oldCenter as Point);
                }
                else
                {
                    this.parent.moveCenter(this.options.center);
                }
            }
        }
    }

    public resume(): void
    {
        this.snapping = null;
        super.resume();
    }
}
