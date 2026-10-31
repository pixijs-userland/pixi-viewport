import '../style.css';

import GUI from 'lil-gui';
import { Application, Container } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { eventLog } from '../shared/event-log';
import { header } from '../shared/header';
import { Random } from '../shared/random';
import { buildMap, buildTimeline, ripple } from '../shared/world';
import { generateCode, highlight } from './code';
import { changedOptions, PLUGINS } from './plugins';
import { PRESETS, presetState } from './presets';

import type { Controller } from 'lil-gui';
import type { PlaygroundState, PluginName } from './plugins';
import type { Preset } from './presets';

header();

const stage = document.querySelector('.stage') as HTMLElement;
const hint = document.querySelector('.hint') as HTMLElement;
const hud = document.querySelector('.hud') as HTMLElement;
const codeElement = document.querySelector('.code-panel code') as HTMLElement;
const copyButton = document.querySelector('.copy-button') as HTMLButtonElement;
const isPhone = window.matchMedia('(max-width: 700px)').matches;

if (isPhone)
{
    for (const panel of document.querySelectorAll<HTMLDetailsElement>('details.panel'))
    {
        panel.open = false;
    }
}

const app = new Application();

await app.init({
    resizeTo: stage,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
});
stage.appendChild(app.canvas);

const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    events: app.renderer.events,
    passiveWheel: false,
});

app.stage.addChild(viewport);
app.renderer.on('resize', (width: number, height: number) => viewport.resize(width, height));

const presetNames = Object.keys(PRESETS);
const initialPreset = presetNames.find((name) => location.hash === `#${name}`) ?? 'map';
let preset: Preset = PRESETS[initialPreset];
const state: PlaygroundState = presetState(preset);
let target: Container = new Container();

/** Builds the world for the current preset and fits it to the screen */
function buildWorld(): void
{
    for (const child of viewport.removeChildren())
    {
        child.destroy({ children: true });
    }
    viewport.plugins.removeAll();
    viewport.scale.set(1);
    viewport.resize(app.screen.width, app.screen.height, preset.worldWidth, preset.worldHeight);

    if (preset.world === 'timeline')
    {
        buildTimeline(viewport, preset.worldWidth, preset.worldHeight);
        viewport.fitHeight(preset.worldHeight);
        viewport.scale.x = viewport.scale.y * 0.4;
        viewport.moveCorner(0, 0);
    }
    else
    {
        target = buildMap(viewport, app.ticker, preset.worldWidth, preset.worldHeight).target;
        viewport.setZoom(0.5);
        viewport.moveCenter(preset.worldWidth / 2, preset.worldHeight / 2);
    }
}

/** Removes every plugin and adds the enabled ones with the panel's options */
function applyPlugins(): void
{
    viewport.plugins.removeAll();

    for (const name of Object.keys(PLUGINS) as PluginName[])
    {
        const plugin = state[name];

        if (!plugin.enabled)
        {
            continue;
        }

        const options = changedOptions(name, plugin);

        if (name === 'follow')
        {
            viewport.follow(target, options);
        }
        else
        {
            (viewport[PLUGINS[name].method as keyof Viewport] as (o: object) => Viewport).call(viewport, options);
        }
    }

    const code = generateCode(preset, state);

    codeElement.innerHTML = highlight(code);
    copyButton.onclick = async (event: MouseEvent) =>
    {
        event.preventDefault();
        try
        {
            await navigator.clipboard.writeText(code);
            copyButton.textContent = 'Copied';
        }
        catch
        {
            copyButton.textContent = 'Copy failed';
        }
        setTimeout(() => (copyButton.textContent = 'Copy'), 1500);
    };
}

let hintTimer = 0;

function showHint(): void
{
    hint.textContent = preset.hint;
    hint.classList.remove('hidden');
    clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => hint.classList.add('hidden'), 6000);
}

// panel

const gui = new GUI({ title: 'Viewport options', container: document.body });

gui.domElement.classList.add('controls');
if (isPhone)
{
    gui.close();
}

const settings = {
    preset: initialPreset,
    fitWorld: () => viewport.fitWorld(true),
    animate: () =>
    {
        const random = new Random(Date.now());

        viewport.animate({
            time: 1200,
            ease: 'easeInOutSine',
            position: { x: random.range(0, preset.worldWidth), y: random.range(0, preset.worldHeight) } as never,
            scale: random.range(0.4, 2),
        });
    },
    snapZoom: () => viewport.snapZoom({ width: viewport.worldScreenWidth / 2, time: 600, removeOnComplete: true }),
    reset: () => loadPreset(settings.preset),
};

gui.add(settings, 'preset', Object.fromEntries(presetNames.map((name) => [PRESETS[name].label, name])))
    .name('Preset')
    .onChange((name: string) => loadPreset(name));

const actions = gui.addFolder('Actions');

actions.add(settings, 'fitWorld').name('fitWorld()');
actions.add(settings, 'animate').name('animate() to a random spot');
actions.add(settings, 'snapZoom').name('snapZoom() in ×2');
actions.add(settings, 'reset').name('Reset view');

const folders = new Map<PluginName, GUI>();

function folderTitle(name: PluginName): string
{
    return `${state[name].enabled ? '●' : '○'} ${name}`;
}

for (const name of Object.keys(PLUGINS) as PluginName[])
{
    const schema = PLUGINS[name];
    const folder = gui.addFolder(folderTitle(name)).close();

    folders.set(name, folder);
    folder.add(state[name], 'enabled').name(`enabled (${schema.description})`).onChange(() =>
    {
        folder.title(folderTitle(name));
        applyPlugins();
    });

    for (const [key, option] of Object.entries(schema.options))
    {
        let controller: Controller;

        if ('choices' in option && option.choices)
        {
            controller = folder.add(state[name].options, key, option.choices);
        }
        else if (typeof state[name].options[key] === 'number')
        {
            controller = folder.add(state[name].options, key, option.min, option.max, option.step);
        }
        else
        {
            controller = folder.add(state[name].options, key);
        }
        controller.onChange(applyPlugins);
    }
}

/** Loads a preset into the panel, rebuilds the world, and applies its plugins */
function loadPreset(name: string): void
{
    preset = PRESETS[name];
    const next = presetState(preset);

    // update in place so the panel's controllers stay bound to the same objects
    for (const plugin of Object.keys(state) as PluginName[])
    {
        state[plugin].enabled = next[plugin].enabled;
        Object.assign(state[plugin].options, next[plugin].options);
        folders.get(plugin)?.title(folderTitle(plugin));
    }
    for (const controller of gui.controllersRecursive())
    {
        controller.updateDisplay();
    }
    history.replaceState(null, '', name === 'map' ? location.pathname : `#${name}`);
    buildWorld();
    applyPlugins();
    showHint();
}

// events, clicks, and stats

eventLog(viewport, document.querySelector('.event-panel ol') as HTMLOListElement);
viewport.on('clicked', (event) => ripple(viewport, app.ticker, event.world.x, event.world.y));

app.ticker.add(() =>
{
    const center = viewport.center;

    hud.innerHTML = `scale <strong>${viewport.scale.x.toFixed(2)}</strong>`
        + `${viewport.scale.x === viewport.scale.y ? '' : ` × <strong>${viewport.scale.y.toFixed(2)}</strong>`}`
        + ` · center <strong>${Math.round(center.x)}, ${Math.round(center.y)}</strong>`
        + ` · <strong>${Math.round(app.ticker.FPS)}</strong> fps`;
});

window.addEventListener('hashchange', () =>
{
    const name = presetNames.find((n) => location.hash === `#${n}`) ?? 'map';

    if (name !== settings.preset)
    {
        settings.preset = name;
        loadPreset(name);
    }
});

loadPreset(initialPreset);
