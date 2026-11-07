import type { FederatedEvent, PointData } from 'pixi.js';
import type { Viewport } from '../Viewport.js';

/**
 * Derive this class to create user-defined plugins
 *
 * @public
 *
 * @category Plugins
 */
export class Plugin
{
    /** The viewport to which this plugin is attached. */
    public readonly parent: Viewport;

    /**
     * Flags whether this plugin has been "paused".
     *
     * @see Plugin#pause
     * @see Plugin#resume
     */
    public paused: boolean;

    /** @param {Viewport} parent */
    constructor(parent: Viewport)
    {
        this.parent = parent;
        this.paused = false;
    }

    /**
     * Converts a global point to the space the viewport moves in: its parent's, or global if it has no parent. A
     * viewport can't measure in its own space, because that space changes as the viewport moves.
     */
    protected globalToParent<P extends PointData>(point: PointData, out: P): P
    {
        const parent = this.parent.parent;

        if (parent)
        {
            return parent.toLocal(point, undefined, out);
        }
        out.x = point.x;
        out.y = point.y;

        return out;
    }

    /** Converts a point in the viewport's parent space (see globalToParent) to the viewport's local space */
    protected parentToViewport<P extends PointData>(point: PointData, out: P): P
    {
        return this.parent.toLocal(point, this.parent.parent ?? undefined, out);
    }

    /** Converts a point in the viewport's local space to its parent space (see globalToParent) */
    protected viewportToParent<P extends PointData>(point: PointData, out: P): P
    {
        const parent = this.parent.parent;

        return parent ? parent.toLocal(point, this.parent, out) : this.parent.toGlobal(point, out);
    }

    /** Called when plugin is removed */
    public destroy()
    {
        // Override for implementation
    }

    /** Handler for pointerdown PIXI event */
    public down(_e: FederatedEvent): boolean
    {
        return false;
    }

    /** Handler for pointermove PIXI event */
    public move(_e: FederatedEvent): boolean
    {
        return false;
    }

    /** Handler for pointerup PIXI event */
    public up(_e: FederatedEvent): boolean
    {
        return false;
    }

    /** Handler for wheel event on div */
    public wheel(_e: WheelEvent): boolean | undefined
    {
        return false;
    }

    /**
     * Called on each tick
     * @param {number} _elapsed time in milliseconds since last update
     */
    public update(_elapsed: number): void
    {
        // Override for implementation
    }

    /** Called when the viewport is resized */
    public resize()
    {
        // Override for implementation
    }

    /** Called when the viewport is manually moved */
    public reset(): void
    {
        // Override for implementation
    }

    /** Pause the plugin */
    public pause(): void
    {
        this.paused = true;
    }

    /** Un-pause the plugin */
    public resume(): void
    {
        this.paused = false;
    }
}
