import { Point } from 'pixi.js';
import { Plugin } from './Plugin.js';

import type { Viewport } from '../Viewport.js';
import type { Decelerate } from './Decelerate.js';

/**
 * There are three ways to clamp:
 * 1. direction: 'all' = the world is clamped to its world boundaries, ie, you cannot drag any part of the world offscreen
 *    direction: 'x' | 'y' = only the x or y direction is clamped to its world boundary
 * 2. left, right, top, bottom = true | number = the world is clamped to the world's pixel location for each side;
 *    if any of these are set to true, then the location is set to the boundary [0, viewport.worldWidth/viewport.worldHeight]
 *    eg: to allow the world to be completely dragged offscreen, set
 *    [-viewport.worldWidth, -viewport.worldHeight, viewport.worldWidth * 2, viewport.worldHeight * 2]
 *
 * Underflow determines what happens when the world is smaller than the viewport
 * 1. none = the world is clamped but there is no special behavior
 * 2. center = the world is centered on the viewport
 * 3. combination of top/bottom/center and left/right/center (case insensitive) =
 *    the world is stuck to the appropriate boundaries
 *
 */
export interface IClampOptions
{
    /**
   * Clamp left; true = 0
   *
   * @default false
   */
    left?: number | boolean | null;

    /**
   * Clamp top; true = 0
   *
   * @default false
   */
    top?: number | boolean | null;

    /**
   * Clamp right; true = viewport.worldWidth
   *
   * @default false
   */
    right?: number | boolean | null;

    /**
   * Clamp bottom; true = viewport.worldHeight
   *
   * @default false
   */
    bottom?: number | boolean | null;

    /**
   * (all, x, or y) using clamps of [0, viewport.worldWidth/viewport.worldHeight]; replaces left/right/top/bottom if set
   *
   * @default null
   */
    direction?: 'all' | 'x' | 'y' | null;

    /**
   * Where to place world if too small for screen (e.g., top-right, center, none, bottomleft)
   *
   * @default 'center'
   */
    underflow?: 'center' | string;
}

const DEFAULT_CLAMP_OPTIONS: Required<IClampOptions> = {
    left: false,
    right: false,
    top: false,
    bottom: false,
    direction: null,
    underflow: 'center',
};

/**
 * Plugin to clamp the viewport to a specific world bounding box.
 *
 * @public
 */
export class Clamp extends Plugin
{
    /** Options used to initialize this plugin, cannot be modified later. */
    public readonly options: Required<IClampOptions>;

    /** Last state of viewport */
    protected last: {
        x: number | null;
        y: number | null;
        scaleX: number | null;
        scaleY: number | null;
        screenWidth: number | null;
        screenHeight: number | null;
    };

    protected noUnderflow!: boolean;
    protected underflowX!: -1 | 0 | 1;
    protected underflowY!: -1 | 0 | 1;

    /**
   * This is called by {@link Viewport.clamp}.
   */
    constructor(parent: Viewport, options: IClampOptions = {})
    {
        super(parent);
        this.options = Object.assign({}, DEFAULT_CLAMP_OPTIONS, options);

        if (this.options.direction)
        {
            this.options.left
        = this.options.direction === 'x' || this.options.direction === 'all'
                    ? true
                    : null;
            this.options.right
        = this.options.direction === 'x' || this.options.direction === 'all'
                    ? true
                    : null;
            this.options.top
        = this.options.direction === 'y' || this.options.direction === 'all'
                    ? true
                    : null;
            this.options.bottom
        = this.options.direction === 'y' || this.options.direction === 'all'
                    ? true
                    : null;
        }

        // false means "do not clamp this side", same as null
        for (const side of ['left', 'right', 'top', 'bottom'] as const)
        {
            if (this.options[side] === false)
            {
                this.options[side] = null;
            }
        }

        this.parseUnderflow();
        this.last = { x: null, y: null, scaleX: null, scaleY: null, screenWidth: null, screenHeight: null };
        this.update();
    }

    private parseUnderflow()
    {
        const clamp = this.options.underflow.toLowerCase();

        if (clamp === 'none')
        {
            this.noUnderflow = true;
        }
        else if (clamp === 'center')
        {
            this.underflowX = this.underflowY = 0;
            this.noUnderflow = false;
        }
        else
        {
            this.underflowX
        = clamp.indexOf('left') !== -1
                    ? -1
                    : clamp.indexOf('right') !== -1
                        ? 1
                        : 0;
            this.underflowY
        = clamp.indexOf('top') !== -1
                    ? -1
                    : clamp.indexOf('bottom') !== -1
                        ? 1
                        : 0;
            this.noUnderflow = false;
        }
    }

    public move(): boolean
    {
        this.update();

        return false;
    }

    public update(): void
    {
        if (this.paused)
        {
            return;
        }

        // only clamp on change
        if (
            this.parent.x === this.last.x
      && this.parent.y === this.last.y
      && this.parent.scale.x === this.last.scaleX
      && this.parent.scale.y === this.last.scaleY
      && this.parent.screenWidth === this.last.screenWidth
      && this.parent.screenHeight === this.last.screenHeight
        )
        {
            return;
        }
        const original = new Point(this.parent.x, this.parent.y);
        const decelerate: Partial<Decelerate> = this.parent.plugins.get('decelerate', true) || {};

        if (this.options.left !== null || this.options.right !== null)
        {
            let moved = false;

            if (
                !this.noUnderflow
        && this.parent.screenWorldWidth < this.parent.screenWidth
            )
            {
                switch (this.underflowX)
                {
                    case -1:
                        if (this.parent.x !== 0)
                        {
                            this.parent.x = 0;
                            moved = true;
                        }
                        break;
                    case 1:
                        if (
                            this.parent.x
              !== this.parent.screenWidth - this.parent.screenWorldWidth
                        )
                        {
                            this.parent.x
                = this.parent.screenWidth - this.parent.screenWorldWidth;
                            moved = true;
                        }
                        break;
                    default:
                        if (
                            this.parent.x
              !== (this.parent.screenWidth - this.parent.screenWorldWidth) / 2
                        )
                        {
                            this.parent.x
                = (this.parent.screenWidth - this.parent.screenWorldWidth) / 2;
                            moved = true;
                        }
                }
            }
            else
            {
                if (this.options.left !== null)
                {
                    if (
                        this.parent.left
            < (this.options.left === true ? 0 : (this.options.left as number))
                    )
                    {
                        this.parent.x
              = -(this.options.left === true ? 0 : this.options.left)
              * this.parent.scale.x;
                        decelerate.x = 0;
                        moved = true;
                    }
                }
                if (this.options.right !== null)
                {
                    if (
                        this.parent.right
            > (this.options.right === true
                ? this.parent.worldWidth
                : (this.options.right as number))
                    )
                    {
                        this.parent.x
              = -(this.options.right === true
                                ? this.parent.worldWidth
                                : this.options.right)
                * this.parent.scale.x
              + this.parent.screenWidth;
                        decelerate.x = 0;
                        moved = true;
                    }
                }
            }
            if (moved)
            {
                this.parent.emit('moved', {
                    viewport: this.parent,
                    original,
                    type: 'clamp-x',
                });
            }
        }
        if (this.options.top !== null || this.options.bottom !== null)
        {
            let moved = false;

            if (
                !this.noUnderflow
        && this.parent.screenWorldHeight < this.parent.screenHeight
            )
            {
                switch (this.underflowY)
                {
                    case -1:
                        if (this.parent.y !== 0)
                        {
                            this.parent.y = 0;
                            moved = true;
                        }
                        break;
                    case 1:
                        if (
                            this.parent.y
              !== this.parent.screenHeight - this.parent.screenWorldHeight
                        )
                        {
                            this.parent.y
                = this.parent.screenHeight - this.parent.screenWorldHeight;
                            moved = true;
                        }
                        break;
                    default:
                        if (
                            this.parent.y
              !== (this.parent.screenHeight - this.parent.screenWorldHeight) / 2
                        )
                        {
                            this.parent.y
                = (this.parent.screenHeight - this.parent.screenWorldHeight) / 2;
                            moved = true;
                        }
                }
            }
            else
            {
                if (this.options.top !== null)
                {
                    if (
                        this.parent.top
            < (this.options.top === true ? 0 : (this.options.top as number))
                    )
                    {
                        this.parent.y
              = -(this.options.top === true ? 0 : this.options.top)
              * this.parent.scale.y;
                        decelerate.y = 0;
                        moved = true;
                    }
                }
                if (this.options.bottom !== null)
                {
                    if (
                        this.parent.bottom
            > (this.options.bottom === true
                ? this.parent.worldHeight
                : (this.options.bottom as number))
                    )
                    {
                        this.parent.y
              = -(this.options.bottom === true
                                ? this.parent.worldHeight
                                : this.options.bottom)
                * this.parent.scale.y
              + this.parent.screenHeight;
                        decelerate.y = 0;
                        moved = true;
                    }
                }
            }
            if (moved)
            {
                this.parent.emit('moved', {
                    viewport: this.parent,
                    original,
                    type: 'clamp-y',
                });
            }
        }
        this.last.x = this.parent.x;
        this.last.y = this.parent.y;
        this.last.scaleX = this.parent.scale.x;
        this.last.scaleY = this.parent.scale.y;
        this.last.screenWidth = this.parent.screenWidth;
        this.last.screenHeight = this.parent.screenHeight;
    }

    public reset(): void
    {
        this.update();
    }
}
