import { Point, PointData } from 'pixi.js';
import { Plugin } from './Plugin';

import type { Viewport } from '../Viewport';

/** Options for {@link Wheel}. */
export interface IWheelOptions
{
    /**
   * Percent to scroll with each spin
   *
   * @default 0.1
   */
    percent?: number;

    /**
   * smooth the zooming by providing the number of frames to zoom between wheel spins
   *
   * @default false
   */
    smooth?: false | number;

    /**
   * Stop smoothing with any user input on the viewport
   *
   * @default true
   */
    interrupt?: boolean;

    /**
   * Reverse the direction of the scroll
   *
   * @default false
   */
    reverse?: boolean;

    /**
   * Place this point at center during zoom instead of current mouse position
   *
   * @default null
   */
    center?: Point | null;

    /**
   * Scaling factor for non-DOM_DELTA_PIXEL scrolling events
   *
   * @default 20
   */
    lineHeight?: number;

    /**
   * Axis to zoom
   *
   * @default 'all'
   */
    axis?: 'all' | 'x' | 'y';

    /**
   * Array containing {@link key|https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code} codes of
   * keys that can be pressed for the zoom to be triggered, e.g.: ['ShiftLeft', 'ShiftRight'}.
   *
   * @default null
   */
    keyToPress?: string[] | null;

    /**
   * pinch the trackpad to zoom
   */
    trackpadPinch?: boolean;

    /**
   * zooms on wheel spin (use this as an alternative to drag.options.wheel)
   */
    wheelZoom?: boolean;
}

const DEFAULT_WHEEL_OPTIONS: Required<IWheelOptions> = {
    percent: 0.1,
    smooth: false,
    interrupt: true,
    reverse: false,
    center: null,
    lineHeight: 20,
    axis: 'all',
    keyToPress: null,
    trackpadPinch: false,
    wheelZoom: true,
};

/**
 * Plugin for handling wheel scrolling for viewport zoom.
 *
 * @event wheel-start({event, viewport})
 */
export class Wheel extends Plugin
{
    public readonly options: Required<IWheelOptions>;

    protected smoothing?: PointData | null;
    protected smoothingCenter?: Point | null;
    protected smoothingCount?: number;

    /** Flags whether the keys required to zoom are pressed currently. */
    protected keyIsPressed: boolean;

    /**
   * This is called by {@link Viewport.wheel}.
   */
    constructor(parent: Viewport, options: IWheelOptions = {})
    {
        super(parent);
        this.options = Object.assign({}, DEFAULT_WHEEL_OPTIONS, options);
        this.parent._wheelAxis = this.options.axis;
        this.keyIsPressed = false;

        if (this.options.keyToPress)
        {
            this.handleKeyPresses(this.options.keyToPress);
        }
    }

    /**
   * Handles keypress events and set the keyIsPressed boolean accordingly
   *
   * @param {array} codes - key codes that can be used to trigger zoom event
   */
    protected handleKeyPresses(codes: string[]): void
    {
        if (typeof window === 'undefined') return;
        window.addEventListener('keydown', (e) =>
        {
            if (codes.includes(e.code))
            {
                this.keyIsPressed = true;
            }
        });

        window.addEventListener('keyup', (e) =>
        {
            if (codes.includes(e.code))
            {
                this.keyIsPressed = false;
            }
        });
    }

    protected checkKeyPress(): boolean
    {
        return !this.options.keyToPress || this.keyIsPressed;
    }

    public down(): boolean
    {
        if (this.options.interrupt)
        {
            this.smoothing = null;
        }

        return false;
    }

    protected isAxisX(): boolean
    {
        return ['all', 'x'].includes(this.options.axis);
    }

    protected isAxisY(): boolean
    {
        return ['all', 'y'].includes(this.options.axis);
    }

    public update(): void
    {
        if (this.smoothing)
        {
            const point = this.smoothingCenter;
            const change = this.smoothing;
            let oldPoint;

            if (!this.options.center)
            {
                oldPoint = this.parent.toLocal(point as PointData);
            }
            if (this.isAxisX())
            {
                this.parent.scale.x += change.x;
            }
            if (this.isAxisY())
            {
                this.parent.scale.y += change.y;
            }

            this.parent.emit('zoomed', { viewport: this.parent, type: 'wheel' });
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
                const targetParent = this.parent.parent || this.parent;

                targetParent.toLocal(oldPoint as PointData, this.parent, oldPoint);
                const comparePoint = targetParent.toLocal(point as PointData);

                this.parent.x += comparePoint.x - (oldPoint as PointData).x;
                this.parent.y += comparePoint.y - (oldPoint as PointData).y;
            }

            this.parent.emit('moved', { viewport: this.parent, type: 'wheel' });
            (this.smoothingCount as number)++;

            if (
                typeof this.options.smooth === 'number'
        && (this.smoothingCount as number) >= this.options.smooth
            )
            {
                this.smoothing = null;
            }
        }
    }

    private pinch(e: WheelEvent)
    {
        if (this.paused)
        {
            return;
        }

        const point = this.parent.input.getPointerPosition(e);
        const step
      = (-e.deltaY * (e.deltaMode ? this.options.lineHeight : 1)) / 200;
        const change = Math.pow(2, (1 + this.options.percent) * step);

        let oldPoint: PointData | undefined;

        if (!this.options.center)
        {
            oldPoint = this.parent.toLocal(point);
        }
        if (this.isAxisX())
        {
            this.parent.scale.x *= change;
        }
        if (this.isAxisY())
        {
            this.parent.scale.y *= change;
        }
        this.parent.emit('zoomed', { viewport: this.parent, type: 'wheel' });
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
            const targetParent = this.parent.parent || this.parent;

            targetParent.toLocal(oldPoint as PointData, this.parent, oldPoint);
            const comparePoint = targetParent.toLocal(point as PointData);

            this.parent.x += comparePoint.x - (oldPoint as PointData).x;
            this.parent.y += comparePoint.y - (oldPoint as PointData).y;
        }

        this.parent.emit('moved', { viewport: this.parent, type: 'wheel' });
        this.parent.emit('wheel-start', { event: e, viewport: this.parent });
    }

    public wheel(e: WheelEvent): boolean
    {
        if (this.paused)
        {
            return false;
        }

        if (!this.checkKeyPress())
        {
            return false;
        }

        if (e.ctrlKey && this.options.trackpadPinch)
        {
            this.pinch(e);
        }
        else if (this.options.wheelZoom)
        {
            const point = this.parent.input.getPointerPosition(e);
            const sign = this.options.reverse ? -1 : 1;
            const step
        = (sign * -e.deltaY * (e.deltaMode ? this.options.lineHeight : 1)) / 500;
            const change = Math.pow(2, (1 + this.options.percent) * step);

            if (this.options.smooth)
            {
                const original = {
                    x: this.smoothing
                        ? this.smoothing.x
              * (this.options.smooth - (this.smoothingCount as number))
                        : 0,
                    y: this.smoothing
                        ? this.smoothing.y
              * (this.options.smooth - (this.smoothingCount as number))
                        : 0,
                };

                this.smoothing = {
                    x:
            ((this.parent.scale.x + original.x) * change
              - this.parent.scale.x)
            / this.options.smooth,
                    y:
            ((this.parent.scale.y + original.y) * change
              - this.parent.scale.y)
            / this.options.smooth,
                };
                this.smoothingCount = 0;
                this.smoothingCenter = point;
            }
            else
            {
                let oldPoint: PointData | undefined;

                if (!this.options.center)
                {
                    oldPoint = this.parent.toLocal(point);
                }
                if (this.isAxisX())
                {
                    this.parent.scale.x *= change;
                }
                if (this.isAxisY())
                {
                    this.parent.scale.y *= change;
                }
                this.parent.emit('zoomed', { viewport: this.parent, type: 'wheel' });
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
                    const targetParent = this.parent.parent || this.parent;

                    targetParent.toLocal(oldPoint as PointData, this.parent, oldPoint);
                    const comparePoint = targetParent.toLocal(point as PointData);

                    this.parent.x += comparePoint.x - (oldPoint as PointData).x;
                    this.parent.y += comparePoint.y - (oldPoint as PointData).y;
                }
            }

            this.parent.emit('moved', { viewport: this.parent, type: 'wheel' });
            this.parent.emit('wheel-start', { event: e, viewport: this.parent });
        }

        return !this.parent.options.passiveWheel;
    }
}
