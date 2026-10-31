import { changedOptions, PLUGINS } from './plugins';

import type { OptionValue, PlaygroundState, PluginName } from './plugins';
import type { Preset } from './presets';

function value(v: OptionValue): string
{
    return typeof v === 'string' ? `'${v}'` : String(v);
}

function options(values: Record<string, OptionValue>): string
{
    const entries = Object.entries(values);

    if (!entries.length)
    {
        return '';
    }

    return `{ ${entries.map(([key, v]) => `${key}: ${value(v)}`).join(', ')} }`;
}

/** The code that sets up a viewport like the playground's current state */
export function generateCode(preset: Preset, state: PlaygroundState): string
{
    const lines = [
        `import { Application } from 'pixi.js'`,
        `import { Viewport } from 'pixi-viewport'`,
        ``,
        `const app = new Application()`,
        `await app.init({ resizeTo: window })`,
        `document.body.appendChild(app.canvas)`,
        ``,
        `const viewport = new Viewport({`,
        `    screenWidth: app.screen.width,`,
        `    screenHeight: app.screen.height,`,
        `    worldWidth: ${preset.worldWidth},`,
        `    worldHeight: ${preset.worldHeight},`,
        `    events: app.renderer.events, // required for input`,
        `    passiveWheel: false, // lets the viewport stop the page from scrolling or zooming`,
        `})`,
        `app.stage.addChild(viewport)`,
        `app.renderer.on('resize', (width, height) => viewport.resize(width, height))`,
    ];

    const calls: string[] = [];

    for (const name of Object.keys(PLUGINS) as PluginName[])
    {
        const plugin = state[name];

        if (!plugin.enabled)
        {
            continue;
        }

        const args = options(changedOptions(name, plugin));

        if (name === 'follow')
        {
            calls.push(`    .follow(star${args ? `, ${args}` : ''})`);
        }
        else
        {
            calls.push(`    .${PLUGINS[name].method}(${args})`);
        }
    }

    if (calls.length)
    {
        if (state.follow.enabled)
        {
            lines.push('', '// star: the object to follow (any Container inside the viewport)');
        }
        lines.push('', '// plugins run in a fixed order, whatever order you add them', 'viewport', ...calls);
    }
    else
    {
        lines.push('', '// no plugins: the viewport is a plain Container you move from code');
    }

    return lines.join('\n');
}

function escape(text: string): string
{
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Minimal syntax highlighting for the generated code (comments, strings, numbers, and object keys) */
export function highlight(code: string): string
{
    const pattern = /(\/\/.*$)|('[^']*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z]+)(?=:)/gm;

    return escape(code).replace(pattern, (match, comment, string, number, key) =>
    {
        if (comment) return `<span class="tok-comment">${comment}</span>`;
        if (string) return `<span class="tok-string">${string}</span>`;
        if (number) return `<span class="tok-number">${number}</span>`;
        if (key) return `<span class="tok-key">${key}</span>`;

        return match;
    });
}
