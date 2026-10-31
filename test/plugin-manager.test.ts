import { describe, expect, it, vi } from 'vitest';
import { Plugin } from '../src/index';
import { createViewport } from './helpers';

import type { Viewport } from '../src/index';

function pluginNames(viewport: Viewport): string[]
{
    const { plugins, list } = viewport.plugins;

    return list.map((plugin) => Object.keys(plugins).find((name) => plugins[name] === plugin) as string);
}

describe('PluginManager', () =>
{
    it('runs built-in plugins in the default order regardless of call order (#180)', () =>
    {
        const { viewport } = createViewport();

        viewport.clamp({ direction: 'all' }).decelerate().drag().wheel()
            .pinch();
        expect(pluginNames(viewport)).toEqual(['drag', 'pinch', 'wheel', 'decelerate', 'clamp']);
    });

    it('keeps plugin order separate for each viewport', () =>
    {
        const a = createViewport().viewport;
        const b = createViewport().viewport;

        a.plugins.add('user', new Plugin(a), 0);
        a.drag().clamp({ direction: 'all' });
        b.clamp({ direction: 'all' }).drag();

        expect(pluginNames(a)).toEqual(['user', 'drag', 'clamp']);
        expect(pluginNames(b)).toEqual(['drag', 'clamp']);
    });

    it('adds user plugins at the end unless given an index', () =>
    {
        const { viewport } = createViewport();

        viewport.drag().clamp({ direction: 'all' });
        viewport.plugins.add('last', new Plugin(viewport));
        viewport.plugins.add('first', new Plugin(viewport), 0);
        expect(pluginNames(viewport)).toEqual(['first', 'drag', 'clamp', 'last']);
    });

    it('destroys a plugin when it is replaced or removed', () =>
    {
        const { viewport } = createViewport();
        const removed = vi.fn();

        viewport.on('plugin-remove', removed);
        viewport.drag();
        const first = viewport.plugins.get('drag')!;
        const destroy = vi.spyOn(first, 'destroy');

        viewport.drag();
        expect(destroy).toHaveBeenCalledTimes(1);

        viewport.plugins.remove('drag');
        expect(viewport.plugins.get('drag')).toBeUndefined();
        expect(removed).toHaveBeenCalledWith('drag');
    });

    it('hides paused plugins when asked to ignore them', () =>
    {
        const { viewport } = createViewport();

        viewport.drag();
        viewport.plugins.pause('drag');
        expect(viewport.plugins.get('drag', true)).toBeNull();
        expect(viewport.plugins.get('drag')).toBeDefined();

        viewport.plugins.resume('drag');
        expect(viewport.plugins.get('drag', true)).toBeDefined();
    });

    it('removes all plugins', () =>
    {
        const { viewport } = createViewport();

        viewport.drag().wheel().decelerate();
        viewport.plugins.removeAll();
        expect(viewport.plugins.list).toHaveLength(0);
    });
});
