import { Point, Rectangle } from 'pixi.js';
import ease from '../ease.js';
import { Plugin } from './Plugin.js';

import type { Viewport } from '../Viewport.js';
import type { IDecelerateOptions } from './Decelerate.js';
import type { Drag } from './Drag.js';
import type { Pinch } from './Pinch.js';

/**
 * Options for {@link Bounce}.
 *
 * @category Plugin options
 */
export interface IBounceOptions
{
    /** "all", "horizontal", "vertical", or combination of "top", "bottom", "right", "left" (e.g., 'top-bottom-right') */
    sides?:
    'all'
    | 'horizontal'
    | 'vertical'
    | string;

    /** Friction to apply to decelerate if active */
    friction?: number;

    /** Time in ms to finish bounce */
    time?: number;

    /** Use this bounceBox instead of (0, 0, viewport.worldWidth, viewport.worldHeight) */
    bounceBox?: Rectangle | null;

    /** Ease function or name (see http://easings.net/ for supported names) */
    ease?: any;

    /** (top/bottom/center and left/right/center, or center) where to place world if too small for screen */
    underflow?: 'center' | string;
}

/**
 * Bounce state along an axis
 *
 * @category Advanced
 */
export interface IBounceState
{
    /** Elapsed time since bounce started */
    time: number;

    /** Starting coordinate */
    start: number;

    /** Change in coordinate through bounce */
    delta: number;

    /** Ending coordinate */
    end: number;
}

const DEFAULT_BOUNCE_OPTIONS: Required<IBounceOptions> = {
    sides: 'all',
    friction: 0.5,
    time: 150,
    ease: 'easeInOutSine',
    underflow: 'center',
    bounceBox: null
};

/**
 * @fires bounce-start-x
 * @fires bounce.end-x
 * @fires bounce-start-y
 * @fires bounce-end-y
 * @public
 *
 * @category Plugins
 */
export class Bounce extends Plugin
{
    /** The options passed to initialize this plugin, cannot be modified again. */
    public readonly options: Readonly<Required<IBounceOptions>>;

    /** Holds whether to bounce from left side. */
    public readonly left: boolean;

    /** Holds whether to bounce from top side. */
    public readonly top: boolean;

    /** Holds whether to bounce from right side. */
    public readonly right: boolean;

    /** Holds whether to bounce from bottom side. */
    public readonly bottom: boolean;

    /** Direction of underflow along x-axis. */
    public readonly underflowX: -1 | 0 | 1;

    /** Direction of underflow along y-axis. */
    public readonly underflowY: -1 | 0 | 1;

    /** Easing */
    protected ease: any;

    /** Bounce state along x-axis */
    protected toX!: IBounceState | null;

    /** Bounce state along y-axis */
    protected toY!: IBounceState | null;

    /**
     * This is called by {@link Viewport.bounce}.
     */
    constructor(parent: Viewport, options: IBounceOptions = {})
    {
        super(parent);

        this.options = Object.assign({}, DEFAULT_BOUNCE_OPTIONS, options);
        this.ease = ease(this.options.ease, 'easeInOutSine');

        if (this.options.sides)
        {
            if (this.options.sides === 'all')
            {
                this.top = this.bottom = this.left = this.right = true;
            }
            else if (this.options.sides === 'horizontal')
            {
                this.right = this.left = true;
                this.top = this.bottom = false;
            }
            else if (this.options.sides === 'vertical')
            {
                this.left = this.right = false;
                this.top = this.bottom = true;
            }
            else
            {
                this.top = this.options.sides.indexOf('top') !== -1;
                this.bottom = this.options.sides.indexOf('bottom') !== -1;
                this.left = this.options.sides.indexOf('left') !== -1;
                this.right = this.options.sides.indexOf('right') !== -1;
            }
        }
        else
        {
            this.left = this.top = this.right = this.bottom = false;
        }

        const clamp = this.options.underflow.toLowerCase();

        if (clamp === 'center')
        {
            this.underflowX = 0;
            this.underflowY = 0;
        }
        else
        {
            // eslint-disable-next-line no-nested-ternary
            this.underflowX = (clamp.indexOf('left') !== -1) ? -1 : (clamp.indexOf('right') !== -1) ? 1 : 0;
            // eslint-disable-next-line no-nested-ternary
            this.underflowY = (clamp.indexOf('top') !== -1) ? -1 : (clamp.indexOf('bottom') !== -1) ? 1 : 0;
        }

        this.reset();
    }

    public isActive(): boolean
    {
        return this.toX !== null || this.toY !== null;
    }

    public down(): boolean
    {
        this.toX = this.toY = null;

        return false;
    }

    public up(): boolean
    {
        this.bounce();

        return false;
    }

    public update(elapsed: number): void
    {
        if (this.paused)
        {
            return;
        }

        this.bounce();

        if (this.toX)
        {
            const toX = this.toX;

            toX.time += elapsed;
            this.parent.emit('moved', { viewport: this.parent, type: 'bounce-x' });

            if (toX.time >= this.options.time)
            {
                this.parent.x = toX.end;
                this.toX = null;
                this.parent.emit('bounce-x-end', this.parent);
            }
            else
            {
                this.parent.x = this.ease(toX.time, toX.start, toX.delta, this.options.time);
            }
        }

        if (this.toY)
        {
            const toY = this.toY;

            toY.time += elapsed;
            this.parent.emit('moved', { viewport: this.parent, type: 'bounce-y' });

            if (toY.time >= this.options.time)
            {
                this.parent.y = toY.end;
                this.toY = null;
                this.parent.emit('bounce-y-end', this.parent);
            }
            else
            {
                this.parent.y = this.ease(toY.time, toY.start, toY.delta, this.options.time);
            }
        }
    }

    /** @internal */
    protected calcUnderflowX(): number
    {
        let x: number;

        switch (this.underflowX)
        {
            case -1:
                x = 0;
                break;
            case 1:
                x = (this.parent.screenWidth - this.parent.screenWorldWidth);
                break;
            default:
                x = (this.parent.screenWidth - this.parent.screenWorldWidth) / 2;
        }

        return x;
    }

    /** @internal */
    protected calcUnderflowY(): number
    {
        let y: number;

        switch (this.underflowY)
        {
            case -1:
                y = 0;
                break;
            case 1:
                y = (this.parent.screenHeight - this.parent.screenWorldHeight);
                break;
            default:
                y = (this.parent.screenHeight - this.parent.screenWorldHeight) / 2;
        }

        return y;
    }

    private oob(): Record<'left' | 'right' | 'top' | 'bottom', boolean> & Record<'topLeft' | 'bottomRight', Point>
    {
        const box = this.options.bounceBox;

        if (box)
        {
            const x1 = typeof box.x === 'undefined' ? 0 : box.x;
            const y1 = typeof box.y === 'undefined' ? 0 : box.y;
            const width = typeof box.width === 'undefined' ? this.parent.worldWidth : box.width;
            const height = typeof box.height === 'undefined' ? this.parent.worldHeight : box.height;

            return {
                left: this.parent.left < x1,
                right: this.parent.right > width,
                top: this.parent.top < y1,
                bottom: this.parent.bottom > height,
                topLeft: new Point(
                    x1 * this.parent.scale.x,
                    y1 * this.parent.scale.y
                ),
                bottomRight: new Point(
                    (width * this.parent.scale.x) - this.parent.screenWidth,
                    (height * this.parent.scale.y) - this.parent.screenHeight
                )
            };
        }

        return {
            left: this.parent.left < 0,
            right: this.parent.right > this.parent.worldWidth,
            top: this.parent.top < 0,
            bottom: this.parent.bottom > this.parent.worldHeight,
            topLeft: new Point(0, 0),
            bottomRight: new Point(
                (this.parent.worldWidth * this.parent.scale.x) - this.parent.screenWidth,
                (this.parent.worldHeight * this.parent.scale.y) - this.parent.screenHeight
            )
        };
    }

    public bounce(): void
    {
        if (this.paused)
        {
            return;
        }

        let oob;
        let decelerate: undefined | null | {
            percentChangeX?: number;
            percentChangeY?: number;
            x?: number;
            y?: number;
            options?: IDecelerateOptions
        } = this.parent.plugins.get('decelerate', true) as any;

        if (decelerate && (decelerate.x || decelerate.y))
        {
            if ((decelerate.x && decelerate.percentChangeX === decelerate.options?.friction)
            || (decelerate.y && decelerate.percentChangeY === decelerate.options?.friction))
            {
                oob = this.oob();
                if ((oob.left && this.left) || (oob.right && this.right))
                {
                    decelerate.percentChangeX = this.options.friction;
                }
                if ((oob.top && this.top) || (oob.bottom && this.bottom))
                {
                    decelerate.percentChangeY = this.options.friction;
                }
            }
        }
        const drag: Partial<Drag> = this.parent.plugins.get('drag', true) || {};
        const pinch: Partial<Pinch> = this.parent.plugins.get('pinch', true) || {};

        decelerate = decelerate || {};

        if (!drag?.active && !pinch?.active && ((!this.toX || !this.toY) && (!decelerate.x || !decelerate.y)))
        {
            oob = oob || this.oob();
            const topLeft = oob.topLeft;
            const bottomRight = oob.bottomRight;

            if (!this.toX && !decelerate.x)
            {
                let x = null;

                if (oob.left && this.left)
                {
                    x = (this.parent.screenWorldWidth < this.parent.screenWidth) ? this.calcUnderflowX() : -topLeft.x;
                }
                else if (oob.right && this.right)
                {
                    x = (this.parent.screenWorldWidth < this.parent.screenWidth) ? this.calcUnderflowX() : -bottomRight.x;
                }
                if (x !== null && this.parent.x !== x)
                {
                    this.toX = { time: 0, start: this.parent.x, delta: x - this.parent.x, end: x };
                    this.parent.emit('bounce-x-start', this.parent);
                }
            }
            if (!this.toY && !decelerate.y)
            {
                let y = null;

                if (oob.top && this.top)
                {
                    y = (this.parent.screenWorldHeight < this.parent.screenHeight) ? this.calcUnderflowY() : -topLeft.y;
                }
                else if (oob.bottom && this.bottom)
                {
                    y = (this.parent.screenWorldHeight < this.parent.screenHeight) ? this.calcUnderflowY() : -bottomRight.y;
                }
                if (y !== null && this.parent.y !== y)
                {
                    this.toY = { time: 0, start: this.parent.y, delta: y - this.parent.y, end: y };
                    this.parent.emit('bounce-y-start', this.parent);
                }
            }
        }
    }

    public reset(): void
    {
        this.toX = this.toY = null;
        this.bounce();
    }
}
