/**
 * The plugins the playground exposes, the options each one shows in the panel, and the library default for each
 * option. The code panel only prints options that differ from the library default, so it stays short and matches
 * what you'd write yourself.
 */

export type OptionValue = number | boolean | string;

export interface OptionSchema
{
    /** Library default; null means the option has no default and is always printed */
    libraryDefault: OptionValue | null;
    /** Select options */
    choices?: string[];
    min?: number;
    max?: number;
    step?: number;
    /** A value that means "leave the option out" (e.g., 0 for smooth) */
    off?: OptionValue;
}

export interface PluginSchema
{
    /** Viewport method name */
    method: string;
    /** Short description shown as the folder hint */
    description: string;
    options: Record<string, OptionSchema>;
}

export const PLUGINS = {
    drag: {
        method: 'drag',
        description: 'pan with mouse, touch, or pen',
        options: {
            direction: { libraryDefault: 'all', choices: ['all', 'x', 'y'] },
            factor: { libraryDefault: 1, min: 0.25, max: 4, step: 0.25 },
            mouseButtons: { libraryDefault: 'all', choices: ['all', 'left', 'middle', 'right', 'middle-right'] },
            wheel: { libraryDefault: true },
            disableOneFingerDrag: { libraryDefault: false },
        },
    },
    pinch: {
        method: 'pinch',
        description: 'two-finger zoom and pan',
        options: {
            percent: { libraryDefault: 1, min: 0.25, max: 4, step: 0.25 },
            noDrag: { libraryDefault: false },
            axis: { libraryDefault: 'all', choices: ['all', 'x', 'y'] },
        },
    },
    wheel: {
        method: 'wheel',
        description: 'mouse wheel and trackpad zoom',
        options: {
            percent: { libraryDefault: 0.1, min: -0.9, max: 2, step: 0.05 },
            smooth: { libraryDefault: false, min: 0, max: 20, step: 1, off: 0 },
            axis: { libraryDefault: 'all', choices: ['all', 'x', 'y'] },
            wheelZoom: { libraryDefault: true },
            trackpadPinch: { libraryDefault: false },
            reverse: { libraryDefault: false },
        },
    },
    decelerate: {
        method: 'decelerate',
        description: 'keep moving after a drag',
        options: {
            friction: { libraryDefault: 0.95, min: 0.5, max: 0.99, step: 0.01 },
        },
    },
    bounce: {
        method: 'bounce',
        description: 'spring back from the edges',
        options: {
            sides: { libraryDefault: 'all', choices: ['all', 'horizontal', 'vertical'] },
            time: { libraryDefault: 150, min: 50, max: 1000, step: 50 },
        },
    },
    clamp: {
        method: 'clamp',
        description: 'keep the world on screen',
        options: {
            direction: { libraryDefault: null, choices: ['all', 'x', 'y'] },
            underflow: { libraryDefault: 'center', choices: ['center', 'top-left', 'bottom-right', 'none'] },
        },
    },
    clampZoom: {
        method: 'clampZoom',
        description: 'limit how far you can zoom',
        options: {
            minScale: { libraryDefault: null, min: 0.02, max: 1, step: 0.02 },
            maxScale: { libraryDefault: null, min: 1, max: 20, step: 0.5 },
            keepAspectRatio: { libraryDefault: true },
        },
    },
    edgeScroll: {
        method: 'edgeScroll',
        description: 'scroll when the mouse nears an edge',
        options: {
            distance: { libraryDefault: null, min: 10, max: 200, step: 5 },
            speed: { libraryDefault: 600, min: 100, max: 3000, step: 50 },
            reverse: { libraryDefault: false },
        },
    },
    follow: {
        method: 'follow',
        description: 'follow the star',
        options: {
            speed: { libraryDefault: 0, min: 0, max: 30, step: 1 },
            radius: { libraryDefault: null, min: 0, max: 600, step: 25, off: 0 },
        },
    },
} satisfies Record<string, PluginSchema>;

export type PluginName = keyof typeof PLUGINS;

export interface PluginState
{
    enabled: boolean;
    options: Record<string, OptionValue>;
}

export type PlaygroundState = Record<PluginName, PluginState>;

/** The options for a plugin call: values that differ from the library default, without "off" values */
export function changedOptions(name: PluginName, state: PluginState): Record<string, OptionValue>
{
    const result: Record<string, OptionValue> = {};
    const schema: Record<string, OptionSchema> = PLUGINS[name].options;

    for (const [key, value] of Object.entries(state.options))
    {
        const option = schema[key];

        if (option.off !== undefined && value === option.off)
        {
            continue;
        }
        if (option.libraryDefault === null || value !== option.libraryDefault)
        {
            result[key] = value;
        }
    }

    return result;
}
