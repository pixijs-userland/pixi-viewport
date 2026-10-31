import { PLUGINS } from './plugins';

import type { OptionValue, PlaygroundState, PluginName } from './plugins';

export type WorldKind = 'map' | 'timeline';

export interface Preset
{
    label: string;
    hint: string;
    world: WorldKind;
    worldWidth: number;
    worldHeight: number;
    /** Plugins to turn on, with any options that differ from the panel defaults */
    plugins: Partial<Record<PluginName, Record<string, OptionValue>>>;
}

/** Panel values used when a preset doesn't set an option (library defaults, or a useful starting value) */
const PANEL_DEFAULTS: Partial<Record<PluginName, Record<string, OptionValue>>> = {
    clamp: { direction: 'all' },
    clampZoom: { minScale: 0.2, maxScale: 4 },
    edgeScroll: { distance: 40 },
    follow: { radius: 0 },
};

export const PRESETS: Record<string, Preset> = {
    map: {
        label: 'Map',
        hint: 'Drag to pan · scroll or pinch to zoom · click to drop a marker',
        world: 'map',
        worldWidth: 4000,
        worldHeight: 4000,
        plugins: {
            drag: {},
            pinch: {},
            wheel: {},
            decelerate: {},
            clamp: {},
            clampZoom: { minScale: 0.2, maxScale: 4 },
        },
    },
    rts: {
        label: 'Edge scrolling (RTS)',
        hint: 'Move the mouse near an edge to scroll · right-drag to pan · scroll to zoom',
        world: 'map',
        worldWidth: 4000,
        worldHeight: 4000,
        plugins: {
            drag: { mouseButtons: 'middle-right' },
            wheel: {},
            decelerate: {},
            edgeScroll: { distance: 40, speed: 900 },
            clamp: {},
            clampZoom: { minScale: 0.3, maxScale: 3 },
        },
    },
    follow: {
        label: 'Follow a target',
        hint: 'The view follows the star · scroll or pinch to zoom',
        world: 'map',
        worldWidth: 4000,
        worldHeight: 4000,
        plugins: {
            pinch: { noDrag: true },
            wheel: {},
            follow: { speed: 8, radius: 150 },
            clampZoom: { minScale: 0.2, maxScale: 4 },
        },
    },
    timeline: {
        label: 'Timeline (zoom one axis)',
        hint: 'Scroll or pinch to zoom time · drag to pan',
        world: 'timeline',
        worldWidth: 20000,
        worldHeight: 800,
        plugins: {
            drag: { direction: 'x' },
            pinch: { axis: 'x' },
            wheel: { axis: 'x' },
            decelerate: {},
            clamp: { direction: 'x' },
            clampZoom: { minScale: 0.04, maxScale: 6 },
        },
    },
    bounce: {
        label: 'Bounce at the edges',
        hint: 'Drag past an edge and let go',
        world: 'map',
        worldWidth: 4000,
        worldHeight: 4000,
        plugins: {
            drag: {},
            pinch: {},
            wheel: {},
            decelerate: {},
            bounce: { time: 300 },
            clampZoom: { minScale: 0.2, maxScale: 4 },
        },
    },
};

/** Builds the full panel state for a preset */
export function presetState(preset: Preset): PlaygroundState
{
    const state = {} as PlaygroundState;

    for (const name of Object.keys(PLUGINS) as PluginName[])
    {
        const options: Record<string, OptionValue> = {};

        for (const [key, option] of Object.entries(PLUGINS[name].options))
        {
            options[key] = option.libraryDefault ?? option.min ?? option.choices?.[0] ?? 0;
        }
        Object.assign(options, PANEL_DEFAULTS[name], preset.plugins[name]);
        state[name] = { enabled: name in preset.plugins, options };
    }

    return state;
}
