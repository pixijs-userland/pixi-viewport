import { Plugin } from './Plugin.js';

import type { Container, PointData } from 'pixi.js';
import type { Viewport } from '../Viewport.js';

/** Options for {@link Follow}. */
export interface IFollowOptions
{
    /**
     * Speed to follow in px/frame (0 = teleport to location)
     *
     * @default 9
     */
    speed?: number;

    /**
     * Set acceleration to accelerate and decelerate at this rate; speed cannot be 0 to use acceleration
     *
     * @default null
     */
    acceleration?: number | null;

    /**
     * Radius (in world coordinates) of center circle where movement is allowed without moving the viewport
     *
     * @default null
     */
    radius?: number | null;
}

const DEFAULT_FOLLOW_OPTIONS: Required<IFollowOptions> = {
    speed: 0,
    acceleration: null,
    radius: null
};

/**
 * Plugin to follow a display-object.
 *
 * @see Viewport.follow
 * @public
 */
export class Follow extends Plugin
{
    /** The options used to initialize this plugin. */
    public readonly options: Required<IFollowOptions>;

    /** The target this plugin will make the viewport follow. */
    public target: Container;

    /** The velocity provided the viewport by following, at the current time. */
    protected velocity: PointData;

    /**
     * This is called by {@link Viewport.follow}.
     *
     * @param parent
     * @param target - target to follow
     * @param options
     */
    constructor(parent: Viewport, target: Container, options: IFollowOptions = {})
    {
        super(parent);

        this.target = target;
        this.options = Object.assign({}, DEFAULT_FOLLOW_OPTIONS, options);
        this.velocity = { x: 0, y: 0 };
    }

    /** Target's position in world coordinates (handles targets nested inside other containers) */
    protected getTargetPosition(): PointData
    {
        const targetParent = this.target.parent;

        if (!targetParent || targetParent === this.parent)
        {
            return this.target.position;
        }

        return this.parent.toLocal(this.target.position, targetParent);
    }

    public update(elapsed: number): void
    {
        if (this.paused)
        {
            return;
        }

        const center = this.parent.center;
        const target = this.getTargetPosition();
        let toX = target.x;
        let toY = target.y;

        if (this.options.radius)
        {
            const distance = Math.sqrt(Math.pow(target.y - center.y, 2) + Math.pow(target.x - center.x, 2));

            if (distance > this.options.radius)
            {
                const angle = Math.atan2(target.y - center.y, target.x - center.x);

                toX = target.x - (Math.cos(angle) * this.options.radius);
                toY = target.y - (Math.sin(angle) * this.options.radius);
            }
            else
            {
                return;
            }
        }

        const deltaX = toX - center.x;
        const deltaY = toY - center.y;

        if (deltaX || deltaY)
        {
            if (this.options.speed)
            {
                if (this.options.acceleration)
                {
                    const angle = Math.atan2(toY - center.y, toX - center.x);
                    const distance = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));

                    if (distance)
                    {
                        const decelerationDistance = (Math.pow(this.velocity.x, 2) + Math.pow(this.velocity.y, 2))
                            / (2 * this.options.acceleration);

                        if (distance > decelerationDistance)
                        {
                            this.velocity = {
                                x: Math.min(this.velocity.x + (this.options.acceleration * elapsed), this.options.speed),
                                y: Math.min(this.velocity.y + (this.options.acceleration * elapsed), this.options.speed)
                            };
                        }
                        else
                        {
                            this.velocity = {
                                x: Math.max(this.velocity.x - (this.options.acceleration * this.options.speed), 0),
                                y: Math.max(this.velocity.y - (this.options.acceleration * this.options.speed), 0)
                            };
                        }
                        const changeX = Math.cos(angle) * this.velocity.x;
                        const changeY = Math.sin(angle) * this.velocity.y;
                        const x = Math.abs(changeX) > Math.abs(deltaX) ? toX : center.x + changeX;
                        const y = Math.abs(changeY) > Math.abs(deltaY) ? toY : center.y + changeY;

                        this.parent.moveCenter(x, y);
                        this.parent.emit('moved', { viewport: this.parent, type: 'follow' });
                    }
                }
                else
                {
                    const angle = Math.atan2(toY - center.y, toX - center.x);
                    const changeX = Math.cos(angle) * this.options.speed;
                    const changeY = Math.sin(angle) * this.options.speed;
                    const x = Math.abs(changeX) > Math.abs(deltaX) ? toX : center.x + changeX;
                    const y = Math.abs(changeY) > Math.abs(deltaY) ? toY : center.y + changeY;

                    this.parent.moveCenter(x, y);
                    this.parent.emit('moved', { viewport: this.parent, type: 'follow' });
                }
            }
            else
            {
                this.parent.moveCenter(toX, toY);
                this.parent.emit('moved', { viewport: this.parent, type: 'follow' });
            }
        }
    }
}
