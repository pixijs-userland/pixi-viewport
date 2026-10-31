import { FederatedPointerEvent, FederatedWheelEvent, Point, PointData, Rectangle } from 'pixi.js';

import type { Viewport } from './Viewport.js';

export interface IViewportTouch
{
    id: number;
    last: PointData | null;
}

/**
 * Handles all input for Viewport
 *
 * @internal
 * @ignore
 * @private
 */
export class InputManager
{
    public readonly viewport: Viewport;

    public clickedAvailable?: boolean;
    public isMouseDown?: boolean;
    public last?: Point | null;
    public wheelFunction?: (e: WheelEvent) => void;
    /** Last native wheel event that pixi dispatched down through the viewport (capture phase) */
    private wheelCaptured?: WheelEvent;
    /** Last native wheel event that bubbled back up to the viewport */
    private wheelBubbled?: WheelEvent;
    /** List of active touches on viewport */
    public touches: IViewportTouch[];

    constructor(viewport: Viewport)
    {
        this.viewport = viewport;
        this.touches = [];

        this.addListeners();
    }

    /** Add input listeners */
    private addListeners()
    {
        this.viewport.eventMode = 'static';
        if (!this.viewport.forceHitArea)
        {
            this.viewport.hitArea = new Rectangle(0, 0, this.viewport.worldWidth, this.viewport.worldHeight);
        }
        this.viewport.on('pointerdown', this.down, this);
        if (this.viewport.options.allowPreserveDragOutside)

        {
            this.viewport.on('globalpointermove', this.move, this);
        }
        else
        {
            this.viewport.on('pointermove', this.move, this);
        }

        this.viewport.on('pointerup', this.up, this);
        this.viewport.on('pointerupoutside', this.up, this);
        this.viewport.on('pointercancel', this.up, this);
        if (!this.viewport.options.allowPreserveDragOutside)
        {
            this.viewport.on('pointerleave', this.up, this);
        }

        // pixi dispatches its federated wheel event before our DOM listener runs, so we can tell
        // whether a child of the viewport called stopPropagation() on it
        this.viewport.on('wheelcapture', this.wheelCapture, this);
        this.viewport.on('wheel', this.wheelBubble, this);

        this.wheelFunction = (e) => this.handleWheel(e);
        this.viewport.options.events.domElement.addEventListener(
            'wheel',
            this.wheelFunction as any,
            { passive: this.viewport.options.passiveWheel });
        this.isMouseDown = false;
    }

    /**
     * Removes all event listeners from viewport
     * (useful for cleanup of wheel when removing viewport)
     */
    public destroy(): void
    {
        this.viewport.options.events.domElement?.removeEventListener('wheel', this.wheelFunction as any);
        this.viewport.off('wheelcapture', this.wheelCapture, this);
        this.viewport.off('wheel', this.wheelBubble, this);
    }

    private wheelCapture(event: FederatedWheelEvent): void
    {
        this.wheelCaptured = event.nativeEvent as WheelEvent;
    }

    private wheelBubble(event: FederatedWheelEvent): void
    {
        this.wheelBubbled = event.nativeEvent as WheelEvent;
    }

    /**
     * handle down events for viewport
     *
     * @param {PIXI.FederatedPointerEvent} event
     */
    public down(event: FederatedPointerEvent): void
    {
        if (this.viewport.pause || !this.viewport.visible)
        {
            return;
        }
        if (event.pointerType === 'mouse')
        {
            this.isMouseDown = true;
        }
        else
        {
            // a primary pointer starts a new gesture, so drop touches whose pointerup never arrived
            // (e.g., iOS suspending the page mid-touch)
            if (event.isPrimary)
            {
                this.touches = [];
            }
            if (!this.get(event.pointerId))
            {
                this.touches.push({ id: event.pointerId, last: null });
            }
        }
        if (this.count() === 1)
        {
            this.last = event.global.clone();

            // clicked event does not fire if viewport is decelerating or bouncing
            const decelerate = this.viewport.plugins.get('decelerate', true);
            const bounce = this.viewport.plugins.get('bounce', true);

            if ((!decelerate || !decelerate.isActive()) && (!bounce || !bounce.isActive()))
            {
                this.clickedAvailable = true;
            }
            else
            {
                this.clickedAvailable = false;
            }
        }
        else
        {
            this.clickedAvailable = false;
        }

        const stop = this.viewport.plugins.down(event);

        if (stop && this.viewport.options.stopPropagation)
        {
            event.stopPropagation();
        }
    }

    /** Clears all pointer events */
    public clear(): void
    {
        this.isMouseDown = false;
        this.touches = [];
        this.last = null;
    }

    /**
     * @param {number} change
     * @returns whether change exceeds threshold
     */
    public checkThreshold(change: number): boolean
    {
        if (Math.abs(change) >= this.viewport.threshold)
        {
            return true;
        }

        return false;
    }

    /** Handle move events for viewport */
    public move(event: FederatedPointerEvent): void
    {
        if (this.viewport.pause || !this.viewport.visible)
        {
            return;
        }

        const stop = this.viewport.plugins.move(event);

        if (this.clickedAvailable && this.last)
        {
            const distX = event.global.x - this.last.x;
            const distY = event.global.y - this.last.y;

            if (this.checkThreshold(distX) || this.checkThreshold(distY))
            {
                this.clickedAvailable = false;
            }
        }

        if (stop && this.viewport.options.stopPropagation)
        {
            event.stopPropagation();
        }
    }

    /** Handle up events for viewport */
    public up(event: FederatedPointerEvent): void
    {
        if (this.viewport.pause || !this.viewport.visible)
        {
            return;
        }

        if (event.pointerType === 'mouse')
        {
            this.isMouseDown = false;
        }

        if (event.pointerType !== 'mouse')
        {
            this.remove(event.pointerId);
        }

        const stop = this.viewport.plugins.up(event);

        if (this.clickedAvailable && this.count() === 0 && this.last)
        {
            this.viewport.emit('clicked', {
                event,
                screen: this.last,
                world: this.viewport.toWorld(this.last),
                viewport: this.viewport
            });
            this.clickedAvailable = false;
        }

        if (stop && this.viewport.options.stopPropagation)
        {
            event.stopPropagation();
        }
    }

    /** Gets pointer position if this.interaction is set */
    public getPointerPosition(event: WheelEvent): Point
    {
        const point = new Point();

        this.viewport.options.events.mapPositionToPoint(point, event.clientX, event.clientY);

        return point;
    }

    /** Handle wheel events */
    public handleWheel(event: WheelEvent): void
    {
        if (this.viewport.pause || !this.viewport.visible)
        {
            return;
        }

        // a child of the viewport stopped propagation of pixi's wheel event before it reached the viewport
        if (this.wheelCaptured === event && this.wheelBubbled !== event)
        {
            // the child used the wheel, so the page shouldn't scroll either (pixi's own wheel listener is passive,
            // so the child can't prevent it)
            if (!this.viewport.options.passiveWheel)
            {
                event.preventDefault();
            }

            return;
        }

        // optionally ignore wheel events bubbling up from other elements (e.g., an HTML modal over the canvas)
        if (this.viewport.options.ignoreWheelFromOtherElements)
        {
            const { domElement, renderer } = this.viewport.options.events;

            if (event.target !== domElement && event.target !== renderer?.canvas)
            {
                return;
            }
        }

        // only handle wheel events where the mouse is over the viewport
        const point = this.viewport.toLocal(this.getPointerPosition(event));
        const bounds = this.viewport.getVisibleBounds();

        if (bounds.left <= point.x
            && point.x <= bounds.right
            && bounds.top <= point.y
            && point.y <= bounds.bottom)
        {
            const stop = this.viewport.plugins.wheel(event);

            if (stop && !this.viewport.options.passiveWheel)
            {
                event.preventDefault();
            }
        }
    }

    public pause(): void
    {
        this.touches = [];
        this.isMouseDown = false;
    }

    /** Get touch by id */
    public get(id: number): IViewportTouch | null
    {
        for (const touch of this.touches)
        {
            if (touch.id === id)
            {
                return touch;
            }
        }

        return null;
    }

    /** Remove touch by number */
    remove(id: number): void
    {
        for (let i = 0; i < this.touches.length; i++)
        {
            if (this.touches[i].id === id)
            {
                this.touches.splice(i, 1);

                return;
            }
        }
    }

    /**
     * @returns {number} count of mouse/touch pointers that are down on the viewport
     */
    count(): number
    {
        return (this.isMouseDown ? 1 : 0) + this.touches.length;
    }
}
