import { Plugin } from './Plugin.js';

import type { FederatedPointerEvent } from 'pixi.js';
import type { Viewport } from '../Viewport.js';
import type { IMouseEdgesInsets } from './MouseEdges.js';

/**
 * Options for {@link EdgeScroll}.
 *
 * @category Plugin options
 */
export interface IEdgeScrollOptions extends IMouseEdgesInsets
{
    /**
     * Scroll speed in screen pixels per second. The speed on screen stays the same at any zoom level and frame rate.
     *
     * @default 600
     */
    speed?: number;

    /** Reverse direction of scroll */
    reverse?: boolean;

    /** Don't hand off to the decelerate plugin (if installed) when scrolling stops */
    noDecelerate?: boolean;

    /**
     * If using radius, scroll along the eight compass directions (+/- 1, +/- 1) instead of directly toward the
     * pointer.
     */
    linear?: boolean;

    /** Keep scrolling while a mouse button is pressed */
    allowButtons?: boolean;
}

const DEFAULT_EDGE_SCROLL_OPTIONS: Required<IEdgeScrollOptions> = {
    radius: null,
    distance: null,
    top: null,
    bottom: null,
    left: null,
    right: null,
    speed: 600,
    reverse: false,
    noDecelerate: false,
    linear: false,
    allowButtons: false,
};

/**
 * Scroll the viewport when the mouse is near one of the screen edges (or outside a radius from the center).
 *
 * Replaces {@link MouseEdges}: `speed` is in screen pixels per second, so scrolling is the same at every zoom level
 * and frame rate.
 *
 * @event edge-scroll-start(Viewport) emitted when edge scrolling starts
 * @event edge-scroll-end(Viewport) emitted when edge scrolling ends
 * @public
 *
 * @category Plugins
 */
export class EdgeScroll extends Plugin
{
    /** Options used to initialize this plugin, cannot be modified later. */
    public readonly options: Readonly<Required<IEdgeScrollOptions>>;

    /** Scroll region boundaries in screen pixels (null = no scrolling on that side) */
    protected left: number | null = null;
    protected top: number | null = null;
    protected right: number | null = null;
    protected bottom: number | null = null;

    /** Current scroll direction for each axis, between -1 and 1 (screen direction the view moves toward) */
    protected directionX = 0;
    protected directionY = 0;

    /** Whether the viewport is currently scrolling (used for start/end events) */
    protected scrolling = false;

    /**
     * This is called by {@link Viewport.edgeScroll}.
     */
    constructor(parent: Viewport, options: IEdgeScrollOptions = {})
    {
        super(parent);

        this.options = Object.assign({}, DEFAULT_EDGE_SCROLL_OPTIONS, options);
        this.resize();
    }

    public resize(): void
    {
        const { distance, radius } = this.options;

        if (distance !== null)
        {
            this.left = distance;
            this.top = distance;
            this.right = this.parent.screenWidth - distance;
            this.bottom = this.parent.screenHeight - distance;
        }
        else if (radius === null)
        {
            this.left = this.options.left;
            this.top = this.options.top;
            this.right = this.options.right === null ? null : this.parent.screenWidth - this.options.right;
            this.bottom = this.options.bottom === null ? null : this.parent.screenHeight - this.options.bottom;
        }
    }

    public down(): boolean
    {
        if (!this.paused && !this.options.allowButtons)
        {
            this.stop();
        }

        return false;
    }

    public move(event: FederatedPointerEvent): boolean
    {
        if (this.paused)
        {
            return false;
        }
        if (event.pointerType !== 'mouse' || (!this.options.allowButtons && event.buttons !== 0))
        {
            return false;
        }

        const x = event.global.x;
        const y = event.global.y;
        const sign = this.options.reverse ? -1 : 1;

        if (this.options.radius !== null)
        {
            // the center of the viewport's screen area, in the same (renderer) coordinates as event.global
            const center = this.parent.toScreen(this.parent.center);
            const dx = x - center.x;
            const dy = y - center.y;

            if ((dx * dx) + (dy * dy) >= this.options.radius * this.options.radius)
            {
                const angle = Math.atan2(dy, dx);
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                this.directionX = (this.options.linear ? Math.round(cos) : cos) * sign;
                this.directionY = (this.options.linear ? Math.round(sin) : sin) * sign;
            }
            else
            {
                this.stop();
            }
        }
        else
        {
            if (this.left !== null && x < this.left)
            {
                this.directionX = -sign;
            }
            else if (this.right !== null && x > this.right)
            {
                this.directionX = sign;
            }
            else
            {
                this.stopX();
            }

            if (this.top !== null && y < this.top)
            {
                this.directionY = -sign;
            }
            else if (this.bottom !== null && y > this.bottom)
            {
                this.directionY = sign;
            }
            else
            {
                this.stopY();
            }
        }

        return false;
    }

    public up(): boolean
    {
        if (!this.paused)
        {
            this.stop();
        }

        return false;
    }

    public update(elapsed: number): void
    {
        if (this.paused)
        {
            return;
        }

        const scrolling = !!(this.directionX || this.directionY);

        if (scrolling !== this.scrolling)
        {
            this.scrolling = scrolling;
            this.parent.emit(scrolling ? 'edge-scroll-start' : 'edge-scroll-end', this.parent);
        }

        if (scrolling)
        {
            const distance = this.options.speed * (elapsed / 1000);
            const center = this.parent.center;

            center.x += (this.directionX * distance) / this.parent.scale.x;
            center.y += (this.directionY * distance) / this.parent.scale.y;
            this.parent.moveCenter(center);
            this.parent.emit('moved', { viewport: this.parent, type: 'edge-scroll' });
        }
    }

    public override pause(): void
    {
        this.end();
        super.pause();
    }

    public override destroy(): void
    {
        this.end();
    }

    /** Stops scrolling without handing off to decelerate, and emits edge-scroll-end if it was scrolling */
    protected end(): void
    {
        this.directionX = this.directionY = 0;
        if (this.scrolling)
        {
            this.scrolling = false;
            this.parent.emit('edge-scroll-end', this.parent);
        }
    }

    /** Stop scrolling on both axes, handing the current velocity to the decelerate plugin */
    protected stop(): void
    {
        this.stopX();
        this.stopY();
    }

    protected stopX(): void
    {
        if (this.directionX)
        {
            this.decelerate({ x: this.velocity(this.directionX) });
            this.directionX = 0;
        }
    }

    protected stopY(): void
    {
        if (this.directionY)
        {
            this.decelerate({ y: this.velocity(this.directionY) });
            this.directionY = 0;
        }
    }

    /** Velocity of the viewport's position in screen pixels per millisecond (the unit decelerate uses) */
    protected velocity(direction: number): number
    {
        // moving the view toward +x moves the viewport container toward -x
        return (-direction * this.options.speed) / 1000;
    }

    protected decelerate(velocity: { x?: number, y?: number }): void
    {
        const decelerate = this.parent.plugins.get('decelerate', true);

        if (decelerate && !this.options.noDecelerate)
        {
            decelerate.activate(velocity);
        }
    }
}
