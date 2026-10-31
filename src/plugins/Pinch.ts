import { Point } from 'pixi.js';
import { Plugin } from './Plugin.js';

import type { FederatedPointerEvent, PointData } from 'pixi.js';
import type { IViewportTouch } from '../InputManager.js';
import type { Viewport } from '../Viewport.js';

/** Options for {@link Pinch}. */
export interface IPinchOptions
{
    /** Disable two-finger dragging. */
    noDrag?: boolean;

    /**
   * Percent to modify pinch speed.
   *
   * @default 1
   */
    percent?: number;

    /**
   * Factor to multiply two-finger drag to increase speed of movement
   *
   * @default 1
   */
    factor?: number;

    /** Place this point at center during zoom instead of center of two fingers */
    center?: Point | null;

    /** Axis to zoom */
    axis?: 'all' | 'x' | 'y';
}

const DEFAULT_PINCH_OPTIONS: Required<IPinchOptions> = {
    noDrag: false,
    percent: 1,
    center: null,
    factor: 1,
    axis: 'all',
};

const SCRATCH_POINT = new Point();

/**
 * Plugin for enabling two-finger pinching (or dragging).
 *
 * @public
 */
export class Pinch extends Plugin
{
    /** Options used to initialize this plugin. */
    public readonly options: Required<IPinchOptions>;

    /** Flags whether this plugin is active, i.e. a pointer is down on the viewport. */
    public active = false;

    /** Flags whether the viewport is being pinched. */
    public pinching = false;

    protected moved = false;
    protected lastCenter?: PointData | null;

    /**
   * This is called by {@link Viewport.pinch}.
   */
    constructor(parent: Viewport, options: IPinchOptions = {})
    {
        super(parent);
        this.options = Object.assign({}, DEFAULT_PINCH_OPTIONS, options);
    }

    public down(): boolean
    {
        if (this.parent.input.count() >= 2)
        {
            this.active = true;

            return true;
        }

        return false;
    }

    public isAxisX(): boolean
    {
        return ['all', 'x'].includes(this.options.axis);
    }

    public isAxisY(): boolean
    {
        return ['all', 'y'].includes(this.options.axis);
    }

    public move(e: FederatedPointerEvent): boolean
    {
        if (this.paused || !this.active)
        {
            return false;
        }

        const { x, y } = (this.parent.parent || this.parent).toLocal(
            e.global,
            undefined,
            SCRATCH_POINT
        );

        const pointers = this.parent.input.touches;

        if (pointers.length >= 2)
        {
            const first = pointers[0] as IViewportTouch;
            const second = pointers[1] as IViewportTouch;
            const last
        = first.last && second.last
            ? Math.sqrt(
                Math.pow(second.last.x - first.last.x, 2)
                + Math.pow(second.last.y - first.last.y, 2)
            )
            : null;

            if (first.id === e.pointerId)
            {
                first.last = { x, y, data: e } as PointData;
            }
            else if (second.id === e.pointerId)
            {
                second.last = { x, y, data: e } as PointData;
            }
            if (last)
            {
                let oldPoint: PointData | undefined;

                const point = new Point(
                    (first.last as PointData).x
            + ((second.last as PointData).x - (first.last as PointData).x) / 2,
                    (first.last as PointData).y
            + ((second.last as PointData).y - (first.last as PointData).y) / 2
                );

                if (!this.options.center)
                {
                    oldPoint = this.parent.toLocal(
                        point,
                        this.parent.parent || this.parent
                    );
                }
                let dist = Math.sqrt(
                    Math.pow(
                        (second.last as PointData).x - (first.last as PointData).x,
                        2
                    )
            + Math.pow(
                (second.last as PointData).y - (first.last as PointData).y,
                2
            )
                );

                dist = dist === 0 ? (dist = 0.0000000001) : dist;

                const change
          = (1 - last / dist)
          * this.options.percent
          * (this.isAxisX() ? this.parent.scale.x : this.parent.scale.y);

                if (this.isAxisX())
                {
                    this.parent.scale.x += change;
                }
                if (this.isAxisY())
                {
                    this.parent.scale.y += change;
                }

                this.parent.emit('zoomed', {
                    viewport: this.parent,
                    type: 'pinch',
                    center: point,
                });

                const clamp = this.parent.plugins.get('clamp-zoom', true);

                if (clamp)
                {
                    clamp.clamp();
                }
                if (this.options.center)
                {
                    this.parent.moveCenter(this.options.center);
                }
                else
                {
                    const newPoint = (this.parent.parent || this.parent).toLocal(
                        oldPoint as PointData,
                        this.parent
                    );

                    this.parent.x += (point.x - newPoint.x) * this.options.factor;
                    this.parent.y += (point.y - newPoint.y) * this.options.factor;
                    this.parent.emit('moved', { viewport: this.parent, type: 'pinch' });
                }
                if (!this.options.noDrag && this.lastCenter)
                {
                    this.parent.x += (point.x - this.lastCenter.x) * this.options.factor;
                    this.parent.y += (point.y - this.lastCenter.y) * this.options.factor;
                    this.parent.emit('moved', { viewport: this.parent, type: 'pinch' });
                }

                this.lastCenter = point;
                this.moved = true;
            }
            else if (!this.pinching)
            {
                this.parent.emit('pinch-start', this.parent);
                this.pinching = true;
            }

            return true;
        }

        return false;
    }

    public up(): boolean
    {
        if (this.pinching)
        {
            if (this.parent.input.touches.length <= 1)
            {
                this.active = false;
                this.lastCenter = null;
                this.pinching = false;
                this.moved = false;
                this.parent.emit('pinch-end', this.parent);

                return true;
            }
        }

        return false;
    }
}
