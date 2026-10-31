import { Container, DestroyOptions, EventSystem, IHitArea, Point, PointData, Rectangle, Ticker, View } from 'pixi.js';
import { InputManager } from './InputManager.js';
import { PluginManager } from './PluginManager.js';
import {
    Animate, Bounce, Clamp, ClampZoom, Decelerate, Drag, EdgeScroll, Follow, IAnimateOptions,
    IBounceOptions,
    IClampOptions,
    IClampZoomOptions,
    IDecelerateOptions,
    IDragOptions,
    IEdgeScrollOptions,
    IFollowOptions,
    IMouseEdgesOptions,
    IPinchOptions,
    ISnapOptions,
    ISnapZoomOptions,
    IWheelOptions,
    MouseEdges, Pinch, Snap, SnapZoom, Wheel,
} from './plugins/index.js';

/**
 * Options for {@link Viewport}.
 *
 * @category Viewport
 */
export interface IViewportOptions
{
    /** @default window.innerWidth */
    screenWidth?: number;

    /** @default window.innerHeight */
    screenHeight?: number;

    /** @default this.width */
    worldWidth?: number | null;

    /** @default this.height */
    worldHeight?: number | null;

    /**
     * Number of pixels to move to trigger an input event (e.g., drag, pinch) or disable a clicked event
     *
     * @default 5
     */
    threshold?: number;

    /**
     * Whether the 'wheel' event is set to passive (note: if false, e.preventDefault() will be called when wheel
     * is used over the viewport)
     *
     * @default true
     */
    passiveWheel?: boolean;

    /**
     * Whether to stopPropagation of events that impact the viewport (except wheel events, see options.passiveWheel)
     */
    stopPropagation?: boolean;

    /**
     * Whether to stop drag when the pointer is out of the viewport
     */

    allowPreserveDragOutside?:boolean;

    /**
     * Ignore wheel events that bubble up from other elements (e.g., an HTML modal inside the element pixi listens on).
     * Only wheel events whose target is options.events.domElement or the renderer's canvas reach the viewport.
     *
     * @default false
     */
    ignoreWheelFromOtherElements?: boolean;

    /**
     * Change the default hitArea from world size to a new value
     */
    forceHitArea?: Rectangle | null;

    /**
     * Set this if you want to manually call update() function on each frame
     *
     * @default false
     */
    noTicker?: boolean;

    /**
     * EventSystem is required now
     */
    events: EventSystem;

    /**
     * Remove oncontextmenu=() => {} from options.events.domElement
     */
    disableOnContextMenu?: boolean;

    /**
     * Use this PIXI.ticker for updates
     *
     * @default PIXI.Ticker.shared
     */
    ticker?: Ticker;
}

/** @category Advanced */
export interface ICompleteViewportOptions extends IViewportOptions
{
    screenWidth: number;
    screenHeight: number;
    threshold: number;
    passiveWheel: boolean;
    stopPropagation: boolean;
    noTicker: boolean;
    ticker: Ticker;
}

/** @category Advanced */
export interface IViewportTransformState
{
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
}

const DEFAULT_VIEWPORT_OPTIONS: Partial<ICompleteViewportOptions> = {
    screenWidth: typeof window === 'undefined' ? 0 : window.innerWidth,
    screenHeight: typeof window === 'undefined' ? 0 : window.innerHeight,
    worldWidth: null,
    worldHeight: null,
    threshold: 5,
    passiveWheel: true,
    stopPropagation: false,
    forceHitArea: null,
    noTicker: false,
    disableOnContextMenu: false,
    ticker: Ticker.shared,
    allowPreserveDragOutside: false,
    ignoreWheelFromOtherElements: false,
};

/**
 * A {@link Container} that acts as a 2D camera: add your world to it, then turn on plugins for the interactions you
 * want (drag, pinch, wheel, clamp, and so on).
 *
 * ```ts
 * const viewport = new Viewport({ worldWidth: 2000, worldHeight: 2000, events: app.renderer.events });
 *
 * app.stage.addChild(viewport);
 * viewport.drag().pinch().wheel().decelerate();
 * ```
 *
 * Plugins always run in a fixed order, whatever order you add them in. Use {@link Viewport.plugins} to pause,
 * resume, or remove them, or to add your own {@link Plugin}.
 *
 * ## Events
 *
 * Listen with `viewport.on(name, callback)`. These are in addition to pixi's own {@link Container} events.
 *
 * | Event | Callback receives | When |
 * | --- | --- | --- |
 * | `clicked` | {@link ClickedEvent} | a pointer is pressed and released without moving past the threshold |
 * | `drag-start`, `drag-end` | {@link DragEvent} | a drag starts or ends |
 * | `pinch-start`, `pinch-end` | `Viewport` | a two-finger pinch starts or ends |
 * | `wheel-start` | {@link WheelStartEvent} | the wheel or a trackpad pinch zooms |
 * | `wheel-scroll` | `Viewport` | the wheel scrolls (drag plugin with `wheel: true`) |
 * | `snap-start`, `snap-end` | `Viewport` | {@link Viewport.snap} starts or finishes |
 * | `snap-zoom-start`, `snap-zoom-end` | `Viewport` | {@link Viewport.snapZoom} starts or finishes |
 * | `bounce-x-start`, `bounce-x-end`, `bounce-y-start`, `bounce-y-end` | `Viewport` | a bounce starts or ends |
 * | `edge-scroll-start`, `edge-scroll-end` | `Viewport` | {@link Viewport.edgeScroll} starts or stops scrolling |
 * | `mouse-edge-start`, `mouse-edge-end` | `Viewport` | the deprecated {@link Viewport.mouseEdges} starts or stops |
 * | `animate-end` | `Viewport` | {@link Viewport.animate} finishes |
 * | `moved` | {@link MovedEvent} | the viewport moves (every frame while moving) |
 * | `zoomed` | {@link ZoomedEvent} | the viewport zooms (every frame while zooming) |
 * | `moved-end`, `zoomed-end` | `Viewport` | moving or zooming stops |
 * | `frame-end` | `Viewport` | after each update |
 * | `plugin-remove` | `string` (plugin name) | a plugin is removed |
 *
 * Inherited {@link Container} members aren't listed here; see pixi's documentation.
 * @category Viewport
 */
export class Viewport extends Container
{
    /** Flags whether the viewport is being panned */
    public moving?: boolean;

    public screenWidth: number;
    public screenHeight: number;

    /** Number of pixels to move to trigger an input event (e.g., drag, pinch) or disable a clicked event */
    public threshold: number;

    public readonly input: InputManager;

    /** Use this to add user plugins or access existing plugins (e.g., to pause, resume, or remove them) */
    public readonly plugins: PluginManager;

    /** Flags whether the viewport zoom is being changed. */
    public zooming?: boolean;

    public lastViewport?: IViewportTransformState | null;

    /** The options passed when creating this viewport, merged with the default values */
    public readonly options: ICompleteViewportOptions;

    private _dirty?: boolean;
    private _forceHitArea?: IHitArea | null;
    private _hitAreaDefault?: Rectangle;
    private _pause?: boolean;
    private readonly tickerFunction?: () => void;
    private _worldWidth?: number | null;
    private _worldHeight?: number | null;
    private _disableOnContextMenu = (e: MouseEvent) => e.preventDefault();

    /**
     * @param {IViewportOptions} options - see {@link IViewportOptions}; `events` (pixi's `app.renderer.events`) is
     *  required for input
     */
    constructor(options: IViewportOptions)
    {
        super();
        this.options = {
            ...DEFAULT_VIEWPORT_OPTIONS,
            ...options,
        } as ICompleteViewportOptions;

        this.screenWidth = this.options.screenWidth;
        this.screenHeight = this.options.screenHeight;

        this._worldWidth = this.options.worldWidth;
        this._worldHeight = this.options.worldHeight;
        this.forceHitArea = this.options.forceHitArea;
        this.threshold = this.options.threshold;

        if (this.options.disableOnContextMenu)
        {
            this.options.events.domElement.addEventListener('contextmenu', this._disableOnContextMenu);
        }

        if (!this.options.noTicker)
        {
            this.tickerFunction = () => this.update(this.options.ticker.elapsedMS);
            this.options.ticker.add(this.tickerFunction);
        }

        this.input = new InputManager(this);
        this.plugins = new PluginManager(this);
    }

    /** Overrides PIXI.Container's destroy to also remove the 'wheel' and PIXI.Ticker listeners */
    destroy(options?: DestroyOptions): void
    {
        if (!this.options.noTicker && this.tickerFunction)
        {
            this.options.ticker.remove(this.tickerFunction);
        }
        if (this.options.disableOnContextMenu)
        {
            this.options.events.domElement?.removeEventListener('contextmenu', this._disableOnContextMenu);
        }

        this.input.destroy();
        super.destroy(options);
    }

    /**
     * Update viewport on each frame.
     *
     * By default, you do not need to call this unless you set `options.noTicker=true`.
     *
     * @param {number} elapsed time in milliseconds since last update
     */
    update(elapsed: number): void
    {
        if (!this.pause)
        {
            this.plugins.update(elapsed);

            if (this.lastViewport)
            {
                // Check for moved-end event
                if (this.lastViewport.x !== this.x || this.lastViewport.y !== this.y)
                {
                    this.moving = true;
                }
                else if (this.moving)
                {
                    this.emit('moved-end', this);
                    this.moving = false;
                }

                // Check for zoomed-end event
                if (this.lastViewport.scaleX !== this.scale.x || this.lastViewport.scaleY !== this.scale.y)
                {
                    this.zooming = true;
                }
                else if (this.zooming)
                {
                    this.emit('zoomed-end', this);
                    this.zooming = false;
                }
            }

            if (!this.forceHitArea)
            {
                this._hitAreaDefault = this.getVisibleBounds();
                this.hitArea = this._hitAreaDefault;
            }

            this._dirty = this._dirty || !this.lastViewport
                || this.lastViewport.x !== this.x || this.lastViewport.y !== this.y
                || this.lastViewport.scaleX !== this.scale.x || this.lastViewport.scaleY !== this.scale.y;

            this.lastViewport = {
                x: this.x,
                y: this.y,
                scaleX: this.scale.x,
                scaleY: this.scale.y
            };
            this.emit('frame-end', this);
        }
    }

    /**
     * Use this to set screen and world sizes, needed for pinch/wheel/clamp/bounce.
     * @param {number} screenWidth - defaults to window.innerWidth
     * @param {number} screenHeight - defaults to window.innerHeight
     * @param {number} [worldWidth]
     * @param {number} [worldHeight]
     */
    resize(
        screenWidth: number = typeof window === 'undefined' ? 0 : window.innerWidth,
        screenHeight: number = typeof window === 'undefined' ? 0 : window.innerHeight,
        worldWidth?: number,
        worldHeight?: number
    ): void
    {
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;

        if (typeof worldWidth !== 'undefined')
        {
            this._worldWidth = worldWidth;
        }
        if (typeof worldHeight !== 'undefined')
        {
            this._worldHeight = worldHeight;
        }

        this.plugins.resize();
        this.dirty = true;
    }

    /** World width, in pixels */
    get worldWidth(): number
    {
        if (this._worldWidth)
        {
            return this._worldWidth;
        }

        return this.width / this.scale.x;
    }
    set worldWidth(value: number)
    {
        this._worldWidth = value;
        this.plugins.resize();
    }

    /** World height, in pixels */
    get worldHeight(): number
    {
        if (this._worldHeight)
        {
            return this._worldHeight;
        }

        return this.height / this.scale.y;
    }
    set worldHeight(value: number)
    {
        this._worldHeight = value;
        this.plugins.resize();
    }

    /** Get visible world bounds of viewport (normalized so width and height are positive when scale is negative) */
    public getVisibleBounds(): Rectangle
    {
        const x = Math.min(this.left, this.right);
        const y = Math.min(this.top, this.bottom);

        return new Rectangle(x, y, Math.abs(this.worldScreenWidth), Math.abs(this.worldScreenHeight));
    }

    /** Change coordinates from screen to world */
    public toWorld<P extends PointData = Point>(x: number, y: number): P;
    /** Change coordinates from screen to world */
    public toWorld<P extends PointData = Point>(screenPoint: PointData): P;

    /**
     * Changes coordinate from screen to world
     * @param {number|PIXI.Point} x
     * @param {number} y
     * @returns {PIXI.Point}
     */
    public toWorld<P extends PointData = Point>(x: number | PointData, y?: number): P
    {
        if (arguments.length === 2)
        {
            return this.toLocal<P>(new Point(x as number, y));
        }

        return this.toLocal<P>(x as PointData);
    }

    /** Change coordinates from world to screen */
    public toScreen<P extends PointData = Point>(x: number, y: number): P;
    /** Change coordinates from world to screen */
    public toScreen<P extends PointData = Point>(worldPoint: PointData): P;

    /**
     * Changes coordinate from world to screen
     * @param {number|PIXI.Point} x
     * @param {number} y
     * @returns {PIXI.Point}
     */
    public toScreen<P extends PointData = Point>(x: number | PointData, y?: number): P
    {
        if (arguments.length === 2)
        {
            return this.toGlobal<P>(new Point(x as number, y));
        }

        return this.toGlobal<P>(x as PointData);
    }

    /** Screen width in world coordinates */
    get worldScreenWidth(): number
    {
        return this.screenWidth / this.scale.x;
    }

    /** Screen height in world coordinates */
    get worldScreenHeight(): number
    {
        return this.screenHeight / this.scale.y;
    }

    /** World width in screen coordinates */
    get screenWorldWidth(): number
    {
        return this.worldWidth * this.scale.x;
    }

    /** World height in screen coordinates */
    get screenWorldHeight(): number
    {
        return this.worldHeight * this.scale.y;
    }

    /** Center of screen in world coordinates */
    get center(): Point
    {
        return new Point(
            (this.worldScreenWidth / 2) - (this.x / this.scale.x),
            (this.worldScreenHeight / 2) - (this.y / this.scale.y),
        );
    }
    set center(value: Point)
    {
        this.moveCenter(value);
    }

    public moveCenter(x: number, y: number): Viewport;

    /** Move center of viewport to `center`. */
    public moveCenter(center: PointData): Viewport;

    /**
     * Move center of viewport to (x, y)
     * @param {number|PIXI.Point} x
     * @param {number} [y]
     * @return {Viewport}
     */
    public moveCenter(...args: [number, number] | [PointData]): Viewport
    {
        let x: number;
        let y: number;

        if (typeof args[0] === 'number')
        {
            x = args[0];
            y = args[1] as number;
        }
        else
        {
            x = args[0].x;
            y = args[0].y;
        }

        const newX = ((this.worldScreenWidth / 2) - x) * this.scale.x;
        const newY = ((this.worldScreenHeight / 2) - y) * this.scale.y;

        if (this.x !== newX || this.y !== newY)
        {
            this.position.set(newX, newY);
            this.plugins.reset();
            this.dirty = true;
        }

        return this;
    }

    /** Top-left corner of Viewport */
    get corner(): Point
    {
        return new Point(-this.x / this.scale.x, -this.y / this.scale.y);
    }
    set corner(value: Point)
    {
        this.moveCorner(value);
    }

    /** Move Viewport's top-left corner; also clamps and resets decelerate and bounce (as needed) */
    public moveCorner(x: number, y: number): Viewport;

    /** move Viewport's top-left corner; also clamps and resets decelerate and bounce (as needed) */
    public moveCorner(center: Point): Viewport;

    /**
     * MoveCorner
     * @param {number|PIXI.Point} x
     * @param {number} [y]
     * @returns {Viewport}
     */
    public moveCorner(...args: [number, number] | [Point]): Viewport
    {
        let x;
        let y;

        if (args.length === 1)
        {
            x = -args[0].x * this.scale.x;
            y = -args[0].y * this.scale.y;
        }
        else
        {
            x = -args[0] * this.scale.x;
            y = -args[1] * this.scale.y;
        }

        if (x !== this.x || y !== this.y)
        {
            this.position.set(x, y);
            this.plugins.reset();
            this.dirty = true;
        }

        return this;
    }

    /** Get how many world pixels fit in screen's width */
    get screenWidthInWorldPixels(): number
    {
        return this.screenWidth / this.scale.x;
    }

    /** Get how many world pixels fit on screen's height */
    get screenHeightInWorldPixels(): number
    {
        return this.screenHeight / this.scale.y;
    }

    /**
     * Find the scale value that fits a world width on the screen
     * does not change the viewport (use fit... to change)
     *
     * @param width - Width in world pixels
     * @return - scale
     */
    findFitWidth(width: number): number
    {
        return this.screenWidth / width;
    }

    /**
     * Finds the scale value that fits a world height on the screens
     * does not change the viewport (use fit... to change)
     *
     * @param height - Height in world pixels
     * @return - scale
     */
    findFitHeight(height: number): number
    {
        return this.screenHeight / height;
    }

    /**
     * Finds the scale value that fits the smaller of a world width and world height on the screen
     * does not change the viewport (use fit... to change)
     *
     * @param {number} width in world pixels
     * @param {number} height in world pixels
     * @returns {number} scale
     */
    findFit(width: number, height: number): number
    {
        const scaleX = this.screenWidth / width;
        const scaleY = this.screenHeight / height;

        return Math.min(scaleX, scaleY);
    }

    /**
     * Finds the scale value that fits the larger of a world width and world height on the screen
     * does not change the viewport (use fit... to change)
     *
     * @param {number} width in world pixels
     * @param {number} height in world pixels
     * @returns {number} scale
     */
    findCover(width: number, height: number): number
    {
        const scaleX = this.screenWidth / width;
        const scaleY = this.screenHeight / height;

        return Math.max(scaleX, scaleY);
    }

    /**
     * Change zoom so the width fits in the viewport
     *
     * @param width - width in world coordinates
     * @param center - maintain the same center
     * @param scaleY - whether to set scaleY=scaleX
     * @param noClamp - whether to disable clamp-zoom
     * @returns {Viewport} this
     */
    fitWidth(width = this.worldWidth, center?: boolean, scaleY = true, noClamp?: boolean): Viewport
    {
        let save: Point | undefined;

        if (center)
        {
            save = this.center;
        }
        this.scale.x = this.screenWidth / width;

        if (scaleY)
        {
            this.scale.y = this.scale.x;
        }

        const clampZoom = this.plugins.get('clamp-zoom', true);

        if (!noClamp && clampZoom)
        {
            clampZoom.clamp();
        }

        if (center && save)
        {
            this.moveCenter(save);
        }

        return this;
    }

    /**
     * Change zoom so the height fits in the viewport
     *
     * @param {number} [height=this.worldHeight] in world coordinates
     * @param {boolean} [center] maintain the same center of the screen after zoom
     * @param {boolean} [scaleX=true] whether to set scaleX = scaleY
     * @param {boolean} [noClamp] whether to disable clamp-zoom
     * @returns {Viewport} this
     */
    fitHeight(height = this.worldHeight, center?: boolean, scaleX = true, noClamp?: boolean): Viewport
    {
        let save: Point | undefined;

        if (center)
        {
            save = this.center;
        }
        this.scale.y = this.screenHeight / height;

        if (scaleX)
        {
            this.scale.x = this.scale.y;
        }

        const clampZoom = this.plugins.get('clamp-zoom', true);

        if (!noClamp && clampZoom)
        {
            clampZoom.clamp();
        }

        if (center && save)
        {
            this.moveCenter(save);
        }

        return this;
    }

    /**
     * Change zoom so it fits the entire world in the viewport
     *
     * @param {boolean} center maintain the same center of the screen after zoom
     * @returns {Viewport} this
     */
    fitWorld(center?: boolean): Viewport
    {
        let save: Point | undefined;

        if (center)
        {
            save = this.center;
        }

        this.scale.x = this.screenWidth / this.worldWidth;
        this.scale.y = this.screenHeight / this.worldHeight;

        if (this.scale.x < this.scale.y)
        {
            this.scale.y = this.scale.x;
        }
        else
        {
            this.scale.x = this.scale.y;
        }

        const clampZoom = this.plugins.get('clamp-zoom', true);

        if (clampZoom)
        {
            clampZoom.clamp();
        }

        if (center && save)
        {
            this.moveCenter(save);
        }

        return this;
    }

    /**
     * Change zoom so it fits the size or the entire world in the viewport
     *
     * @param {boolean} [center] maintain the same center of the screen after zoom
     * @param {number} [width=this.worldWidth] desired width
     * @param {number} [height=this.worldHeight] desired height
     * @returns {Viewport} this
     */
    fit(center?: boolean, width = this.worldWidth, height = this.worldHeight): Viewport
    {
        let save: Point | undefined;

        if (center)
        {
            save = this.center;
        }

        this.scale.x = this.screenWidth / width;
        this.scale.y = this.screenHeight / height;

        if (this.scale.x < this.scale.y)
        {
            this.scale.y = this.scale.x;
        }
        else
        {
            this.scale.x = this.scale.y;
        }
        const clampZoom = this.plugins.get('clamp-zoom', true);

        if (clampZoom)
        {
            clampZoom.clamp();
        }
        if (center && save)
        {
            this.moveCenter(save);
        }

        return this;
    }

    /**
     * Zoom viewport to specific value.
     *
     * @param {number} scale value (e.g., 1 would be 100%, 0.25 would be 25%)
     * @param {boolean} [center] maintain the same center of the screen after zoom
     * @return {Viewport} this
     */
    setZoom(scale: number, center?: boolean): Viewport
    {
        let save;

        if (center)
        {
            save = this.center;
        }
        this.scale.set(scale);
        const clampZoom = this.plugins.get('clamp-zoom', true);

        if (clampZoom)
        {
            clampZoom.clamp();
        }
        if (center && save)
        {
            this.moveCenter(save);
        }

        return this;
    }

    /**
     * Zoom viewport by a certain percent (in both x and y direction).
     *
     * @param {number} percent change (e.g., 0.25 would increase a starting scale of 1.0 to 1.25)
     * @param {boolean} [center] maintain the same center of the screen after zoom
     * @return {Viewport} this
     */
    zoomPercent(percent: number, center?: boolean): Viewport
    {
        return this.setZoom(this.scale.x + (this.scale.x * percent), center);
    }

    /**
     * Zoom viewport by increasing/decreasing width by a certain number of pixels.
     *
     * @param {number} change in pixels
     * @param {boolean} [center] maintain the same center of the screen after zoom
     * @return {Viewport} this
     */
    zoom(change: number, center?: boolean): Viewport
    {
        this.fitWidth(change + this.worldScreenWidth, center);

        return this;
    }

    /** Changes scale of viewport and maintains center of viewport */
    get scaled(): number
    {
        return this.scale.x;
    }
    set scaled(scale: number)
    {
        this.setZoom(scale, true);
    }

    /**
     * Returns zoom to the desired scale
     *
     * @param {ISnapZoomOptions} options
     */
    snapZoom(options?: ISnapZoomOptions): Viewport
    {
        this.plugins.add('snap-zoom', new SnapZoom(this, options));

        return this;
    }

    /** Is container out of world bounds */
    OOB(): {
        left: boolean;
        right: boolean;
        top: boolean;
        bottom: boolean;
        cornerPoint: Point;
    }
    {
        return {
            left: this.left < 0,
            right: this.right > this.worldWidth,
            top: this.top < 0,
            bottom: this.bottom > this.worldHeight,
            cornerPoint: new Point(
                (this.worldWidth * this.scale.x) - this.screenWidth,
                (this.worldHeight * this.scale.y) - this.screenHeight
            )
        };
    }

    /** World coordinates of the right edge of the screen */
    get right(): number
    {
        return (-this.x / this.scale.x) + this.worldScreenWidth;
    }
    set right(value: number)
    {
        this.x = (-value * this.scale.x) + this.screenWidth;
        this.plugins.reset();
    }

    /** World coordinates of the left edge of the screen */
    get left(): number
    {
        return -this.x / this.scale.x;
    }
    set left(value: number)
    {
        this.x = -value * this.scale.x;
        this.plugins.reset();
    }

    /** World coordinates of the top edge of the screen */
    get top(): number
    {
        return -this.y / this.scale.y;
    }
    set top(value: number)
    {
        this.y = -value * this.scale.y;
        this.plugins.reset();
    }

    /** World coordinates of the bottom edge of the screen */
    get bottom(): number
    {
        return (-this.y / this.scale.y) + this.worldScreenHeight;
    }
    set bottom(value: number)
    {
        this.y = (-value * this.scale.y) + this.screenHeight;
        this.plugins.reset();
    }

    /**
     * Determines whether the viewport is dirty (i.e., needs to be rendered to the screen because of a change)
     */
    get dirty(): boolean
    {
        return !!this._dirty;
    }
    set dirty(value: boolean)
    {
        this._dirty = value;
    }

    /**
     * Permanently changes the Viewport's hitArea
     *
     * NOTE: if not set then hitArea = PIXI.Rectangle(Viewport.left, Viewport.top, Viewport.worldScreenWidth,
     * Viewport.worldScreenHeight)
     */
    get forceHitArea(): IHitArea | null | undefined
    {
        return this._forceHitArea;
    }
    set forceHitArea(value: IHitArea | null | undefined)
    {
        if (value)
        {
            this._forceHitArea = value;
            this.hitArea = value;
        }
        else
        {
            this._forceHitArea = null;
            this.hitArea = new Rectangle(0, 0, this.worldWidth, this.worldHeight);
        }
    }

    /**
     * Enable one-finger touch to drag
     *
     * NOTE: if you expect users to use right-click dragging, you should enable `viewport.options.disableOnContextMenu`
     * to avoid the context menu popping up on each right-click drag.
     *
     * @param {IDragOptions} [options] - options, see {@link IDragOptions}
     * @returns {Viewport} this
     */
    public drag(options?: IDragOptions): Viewport
    {
        this.plugins.add('drag', new Drag(this, options));

        return this;
    }

    /**
     * Clamp to world boundaries or other provided boundaries
     * There are three ways to clamp:
     * 1. direction: 'all' = the world is clamped to its world boundaries, ie, you cannot drag any part of offscreen
     *    direction: 'x' | 'y' = only the x or y direction is clamped to its world boundary
     * 2. left, right, top, bottom = true | number = the world is clamped to the world's pixel location for each side;
     *    if any of these are set to true, then the location is set to the boundary
     *    [0, viewport.worldWidth/viewport.worldHeight], eg: to allow the world to be completely dragged offscreen,
     *    set [-viewport.worldWidth, -viewport.worldHeight, viewport.worldWidth * 2, viewport.worldHeight * 2]
     *
     * Underflow determines what happens when the world is smaller than the viewport
     * 1. none = the world is clamped but there is no special behavior
     * 2. center = the world is centered on the viewport
     * 3. combination of top/bottom/center and left/right/center (case insensitive) = the world is stuck to the
     *     appropriate boundaries
     *
     * NOTES:
     *   clamp is disabled if called with no options; use { direction: 'all' } for all edge clamping
     *   screenWidth, screenHeight, worldWidth, and worldHeight needs to be set for this to work properly
     *
     * @param {IClampOptions} [options] - options, see {@link IClampOptions}
     * @returns {Viewport} this
     */
    public clamp(options?: IClampOptions): Viewport
    {
        this.plugins.add('clamp', new Clamp(this, options));

        return this;
    }

    /**
     * Decelerate after a move
     *
     * NOTE: this fires 'moved' event during deceleration
     *
     * @param {IDecelerateOptions} [options] - options, see {@link IDecelerateOptions}
     * @return {Viewport} this
     */
    public decelerate(options?: IDecelerateOptions): Viewport
    {
        this.plugins.add('decelerate', new Decelerate(this, options));

        return this;
    }

    /**
     * Bounce on borders
     * NOTES:
     *    screenWidth, screenHeight, worldWidth, and worldHeight needs to be set for this to work properly
     *    fires 'moved', 'bounce-x-start', 'bounce-y-start', 'bounce-x-end', and 'bounce-y-end' events
     * @param {IBounceOptions} [options] - options, see {@link IBounceOptions}
     * @return {Viewport} this
     */
    public bounce(options?: IBounceOptions): Viewport
    {
        this.plugins.add('bounce', new Bounce(this, options));

        return this;
    }

    /**
     * Enable pinch to zoom and two-finger touch to drag
     *
     * @param {IPinchOptions} [options] - options, see {@link IPinchOptions}
     * @return {Viewport} this
     */
    public pinch(options?: IPinchOptions): Viewport
    {
        this.plugins.add('pinch', new Pinch(this, options));

        return this;
    }

    /**
     * Snap to a point
     *
     * @param {number} x
     * @param {number} y
     * @param {ISnapOptions} [options] - options, see {@link ISnapOptions}
     * @return {Viewport} this
     */
    public snap(x: number, y: number, options?: ISnapOptions): Viewport
    {
        this.plugins.add('snap', new Snap(this, x, y, options));

        return this;
    }

    /**
     * Follow a target
     *
     * NOTES:
     *    uses the (x, y) as the center to follow; for PIXI.Sprite to work properly, use sprite.anchor.set(0.5)
     *    options.acceleration is not perfect as it doesn't know the velocity of the target. It adds acceleration
     *    to the start of movement and deceleration to the end of movement when the target is stopped.
     *    To cancel the follow, use: `viewport.plugins.remove('follow')`
     *
     * @fires 'moved' event
     *
     * @param {PIXI.DisplayObject} target to follow
     * @param {IFollowOptions} [options] - options, see {@link IFollowOptions}
     * @returns {Viewport} this
     */
    public follow(target: Container, options?: IFollowOptions): Viewport
    {
        this.plugins.add('follow', new Follow(this, target, options));

        return this;
    }

    /**
     * Zoom using mouse wheel
     *
     * NOTE: the default event listener for 'wheel' event is the options.events.domElement.
     *
     * @param {IWheelOptions} [options] - options, see {@link IWheelOptions}
     * @return {Viewport} this
     */
    public wheel(options?: IWheelOptions): Viewport
    {
        this.plugins.add('wheel', new Wheel(this, options));

        return this;
    }

    /**
     * Animate the position and/or scale of the viewport
     * To set the zoom level, use: (1) scale, (2) scaleX and scaleY, or (3) width and/or height
     * @param {object} options
     * @returns {Viewport} this
     */
    public animate(options: IAnimateOptions): Viewport
    {
        this.plugins.add('animate', new Animate(this, options));

        return this;
    }

    /**
     * Enable clamping of zoom to constraints
     *
     * The minWidth/Height settings are how small the world can get (as it would appear on the screen)
     * before clamping. The maxWidth/maxHeight is how larger the world can scale (as it would appear on
     * the screen) before clamping.
     *
     * For example, if you have a world size of 1000 x 1000 and a screen size of 100 x 100, if you set
     * minWidth/Height = 100 then the world will not be able to zoom smaller than the screen size (ie,
     * zooming out so it appears smaller than the screen). Similarly, if you set maxWidth/Height = 100
     * the world will not be able to zoom larger than the screen size (ie, zooming in so it appears
     * larger than the screen).
     *
     * @param {IClampZoomOptions} [options] - options, see {@link IClampZoomOptions}
     * @return {Viewport} this
     */
    public clampZoom(options: IClampZoomOptions): Viewport
    {
        this.plugins.add('clamp-zoom', new ClampZoom(this, options));

        return this;
    }

    /**
     * Scroll viewport when mouse hovers near one of the edges or radius-distance from center of screen.
     *
     * NOTES: fires 'moved' event; there's a known bug where the mouseEdges does not work properly with "windowed" viewports
     *
     * @param {IMouseEdgesOptions} [options] - options, see {@link IMouseEdgesOptions}
     * @deprecated use {@link Viewport.edgeScroll} instead: its `speed` is in screen pixels per second, while
     *   mouseEdges' `speed` scrolls by speed * speed * 0.06 world pixels per frame (so it changes with zoom and frame rate).
     *   mouseEdges keeps its current behavior for compatibility.
     */
    public mouseEdges(options: IMouseEdgesOptions): Viewport
    {
        this.plugins.add('mouse-edges', new MouseEdges(this, options));

        return this;
    }

    /**
     * Scroll viewport when the mouse is near one of the edges or outside a radius from the center of the screen.
     *
     * Replaces {@link Viewport.mouseEdges}: `speed` is in screen pixels per second, so scrolling is the same at every
     * zoom level and frame rate.
     *
     * NOTES: fires 'moved', 'edge-scroll-start', and 'edge-scroll-end' events
     *
     * @param {IEdgeScrollOptions} [options] - options, see {@link IEdgeScrollOptions}
     * @returns {Viewport} this
     */
    public edgeScroll(options?: IEdgeScrollOptions): Viewport
    {
        this.plugins.add('edge-scroll', new EdgeScroll(this, options));

        return this;
    }

    /** Pause viewport (including animation updates such as decelerate) */
    get pause(): boolean
    {
        return !!this._pause;
    }
    set pause(value: boolean)
    {
        this._pause = value;

        this.lastViewport = null;
        this.moving = false;
        this.zooming = false;

        if (value)
        {
            this.input.pause();
        }
    }

    /**
     * Move the viewport so the bounding box is visible
     *
     * @param x - left
     * @param y - top
     * @param width
     * @param height
     * @param resizeToFit - Resize the viewport so the box fits within the viewport
     */
    public ensureVisible(x: number, y: number, width: number, height: number, resizeToFit?: boolean): void
    {
        if (resizeToFit && (width > this.worldScreenWidth || height > this.worldScreenHeight))
        {
            this.fit(true, width, height);
            this.emit('zoomed', { viewport: this, type: 'ensureVisible' });
        }
        let moved = false;

        if (x < this.left)
        {
            this.left = x;
            moved = true;
        }
        else if (x + width > this.right)
        {
            this.right = x + width;
            moved = true;
        }
        if (y < this.top)
        {
            this.top = y;
            moved = true;
        }
        else if (y + height > this.bottom)
        {
            this.bottom = y + height;
            moved = true;
        }
        if (moved)
        {
            this.emit('moved', { viewport: this, type: 'ensureVisible' });
        }
    }
}

/**
 * Fires after a mouse or touch click
 * @event Viewport#clicked
 * @type {object}
 * @property {PIXI.Point} screen
 * @property {PIXI.Point} world
 * @property {Viewport} viewport
 */

/**
 * Fires when a drag starts
 * @event Viewport#drag-start
 * @type {object}
 * @property {PIXI.Point} screen
 * @property {PIXI.Point} world
 * @property {Viewport} viewport
 */

/**
 * Fires when a drag ends
 * @event Viewport#drag-end
 * @type {object}
 * @property {PIXI.Point} screen
 * @property {PIXI.Point} world
 * @property {Viewport} viewport
 */

/**
 * Fires when a pinch starts
 * @event Viewport#pinch-start
 * @type {Viewport}
 */

/**
 * Fires when a pinch end
 * @event Viewport#pinch-end
 * @type {Viewport}
 */

/**
 * Fires when a snap starts
 * @event Viewport#snap-start
 * @type {Viewport}
 */

/**
 * Fires when a snap ends
 * @event Viewport#snap-end
 * @type {Viewport}
 */

/**
 * Fires when a snap-zoom starts
 * @event Viewport#snap-zoom-start
 * @type {Viewport}
 */

/**
 * Fires when a snap-zoom ends
 * @event Viewport#snap-zoom-end
 * @type {Viewport}
 */

/**
 * Fires when a bounce starts in the x direction
 * @event Viewport#bounce-x-start
 * @type {Viewport}
 */

/**
 * Fires when a bounce ends in the x direction
 * @event Viewport#bounce-x-end
 * @type {Viewport}
 */

/**
 * Fires when a bounce starts in the y direction
 * @event Viewport#bounce-y-start
 * @type {Viewport}
 */

/**
 * Fires when a bounce ends in the y direction
 * @event Viewport#bounce-y-end
 * @type {Viewport}
 */

/**
 * Fires when for a mouse wheel event
 * @event Viewport#wheel-start
 * @type {object}
 * @property {WheelEvent} event
 * @property {Viewport} viewport
 */

/**
 * Fires when a wheel-scroll occurs
 * @event Viewport#wheel-scroll
 * @type {Viewport}
 */

/**
 * Fires when a mouse-edge starts to scroll
 * @event Viewport#mouse-edge-start
 * @type {Viewport}
 */

/**
 * Fires when the mouse-edge scrolling ends
 * @event Viewport#mouse-edge-end
 * @type {Viewport}
 */

/**
 * Fires when edge scrolling starts
 * @event Viewport#edge-scroll-start
 * @type {Viewport}
 */

/**
 * Fires when edge scrolling ends
 * @event Viewport#edge-scroll-end
 * @type {Viewport}
 */

/**
 * Fires when viewport moves through UI interaction, deceleration, ensureVisible, or follow
 * @event Viewport#moved
 * @type {object}
 * @property {Viewport} viewport
 * @property {string} type - (drag, snap, pinch, follow, bounce-x, bounce-y,
 *  clamp-x, clamp-y, decelerate, mouse-edges, edge-scroll, wheel, ensureVisible)
 */

/**
 * Fires when viewport moves through UI interaction, deceleration, ensureVisible, or follow
 * @event Viewport#zoomed
 * @type {object}
 * @property {Viewport} viewport
 * @property {string} type (drag-zoom, pinch, wheel, clamp-zoom, ensureVisible)
 */

/**
 * Fires when viewport stops moving
 * @event Viewport#moved-end
 * @type {Viewport}
 */

/**
 * Fires when viewport stops zooming
 * @event Viewport#zoomed-end
 * @type {Viewport}
 */

/**
* Fires at the end of an update frame
* @event Viewport#frame-end
* @type {Viewport}
*/
