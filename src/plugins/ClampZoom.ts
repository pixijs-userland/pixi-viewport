import { Plugin } from './Plugin.js';

import type { Viewport } from '../Viewport.js';

/**
 * Options for {@link ClampZoom}.
 *
 * Use either minimum width/height or minimum scale
 *
 * @category Plugin options
 */
export interface IClampZoomOptions
{
    /** Minimum width */
    minWidth?: number | null;

    /** Minimum height */
    minHeight?: number | null;

    /** Maximum width */
    maxWidth?: number | null;

    /** Maximum height */
    maxHeight?: number | null;

    /** Minimum scale */
    minScale?: number | null | IScale;

    /** Maximum scale */
    maxScale?: number | null | IScale;

    /**
     * When clamping by width or height, scale the other axis by the same amount.
     * Set to false when zooming along a single axis (e.g., `wheel({ axis: 'x' })`).
     *
     * @default true
     */
    keepAspectRatio?: boolean;
}

const DEFAULT_CLAMP_ZOOM_OPTIONS: Required<IClampZoomOptions> = {
    minWidth: null,
    minHeight: null,
    maxWidth: null,
    maxHeight: null,
    minScale: null,
    maxScale: null,
    keepAspectRatio: true,
};

/**
 * Plugin to clamp the viewport's zoom to a specific range.
 *
 * @public
 *
 * @category Plugins
 */
export class ClampZoom extends Plugin
{
    public readonly options: Required<IClampZoomOptions>;

    /**
     * This is called by {@link Viewport.clampZoom}.
     */
    constructor(parent: Viewport, options = {})
    {
        super(parent);
        this.options = Object.assign({}, DEFAULT_CLAMP_ZOOM_OPTIONS, options);

        this.clamp();
    }

    public resize(): void
    {
        this.clamp();
    }

    /** Clamp the viewport scale zoom) */
    public clamp(): void
    {
        if (this.paused)
        {
            return;
        }

        if (this.options.minWidth || this.options.minHeight || this.options.maxWidth || this.options.maxHeight)
        {
            let width = this.parent.worldScreenWidth;
            let height = this.parent.worldScreenHeight;

            if (this.options.minWidth !== null && width < this.options.minWidth)
            {
                const original = this.parent.scale.x;

                this.parent.fitWidth(this.options.minWidth, false, false, true);
                if (this.options.keepAspectRatio)
                {
                    this.parent.scale.y *= this.parent.scale.x / original;
                }
                width = this.parent.worldScreenWidth;
                height = this.parent.worldScreenHeight;
                this.parent.emit('zoomed', { viewport: this.parent, type: 'clamp-zoom' });
            }
            if (this.options.maxWidth !== null && width > this.options.maxWidth)
            {
                const original = this.parent.scale.x;

                this.parent.fitWidth(this.options.maxWidth, false, false, true);
                if (this.options.keepAspectRatio)
                {
                    this.parent.scale.y *= this.parent.scale.x / original;
                }
                width = this.parent.worldScreenWidth;
                height = this.parent.worldScreenHeight;
                this.parent.emit('zoomed', { viewport: this.parent, type: 'clamp-zoom' });
            }
            if (this.options.minHeight !== null && height < this.options.minHeight)
            {
                const original = this.parent.scale.y;

                this.parent.fitHeight(this.options.minHeight, false, false, true);
                if (this.options.keepAspectRatio)
                {
                    this.parent.scale.x *= this.parent.scale.y / original;
                }
                width = this.parent.worldScreenWidth;
                height = this.parent.worldScreenHeight;
                this.parent.emit('zoomed', { viewport: this.parent, type: 'clamp-zoom' });
            }
            if (this.options.maxHeight !== null && height > this.options.maxHeight)
            {
                const original = this.parent.scale.y;

                this.parent.fitHeight(this.options.maxHeight, false, false, true);
                if (this.options.keepAspectRatio)
                {
                    this.parent.scale.x *= this.parent.scale.y / original;
                }
                this.parent.emit('zoomed', { viewport: this.parent, type: 'clamp-zoom' });
            }
        }
        else
            if (this.options.minScale || this.options.maxScale)
            {
                const minScale: IScale = { x: null, y: null };
                const maxScale: IScale = { x: null, y: null };

                if (typeof this.options.minScale === 'number')
                {
                    minScale.x = this.options.minScale;
                    minScale.y = this.options.minScale;
                }
                else if (this.options.minScale !== null)
                {
                    const optsMinScale = this.options.minScale as IScale;

                    minScale.x = typeof optsMinScale.x === 'undefined' ? null : optsMinScale.x;
                    minScale.y = typeof optsMinScale.y === 'undefined' ? null : optsMinScale.y;
                }

                if (typeof this.options.maxScale === 'number')
                {
                    maxScale.x = this.options.maxScale;
                    maxScale.y = this.options.maxScale;
                }
                else if (this.options.maxScale !== null)
                {
                    const optsMaxScale = this.options.maxScale as IScale;

                    maxScale.x = typeof optsMaxScale.x === 'undefined' ? null : optsMaxScale.x;
                    maxScale.y = typeof optsMaxScale.y === 'undefined' ? null : optsMaxScale.y;
                }

                let scaleX = this.parent.scale.x;
                let scaleY = this.parent.scale.y;

                if (minScale.x !== null && scaleX < minScale.x)
                {
                    scaleX = minScale.x;
                }
                if (maxScale.x !== null && scaleX > maxScale.x)
                {
                    scaleX = maxScale.x;
                }
                if (minScale.y !== null && scaleY < minScale.y)
                {
                    scaleY = minScale.y;
                }
                if (maxScale.y !== null && scaleY > maxScale.y)
                {
                    scaleY = maxScale.y;
                }
                if (scaleX !== this.parent.scale.x || scaleY !== this.parent.scale.y)
                {
                    this.parent.scale.set(scaleX, scaleY);
                    this.parent.emit('zoomed', { viewport: this.parent, type: 'clamp-zoom' });
                }
            }
    }

    public reset(): void
    {
        this.clamp();
    }
}

/**
 * This allows independent x and y values for min/maxScale
 *
 * @category Plugin options
 */
export interface IScale
{
    x: null | number
    y: null | number
}
