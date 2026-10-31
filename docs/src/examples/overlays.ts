import '../style.css';

import { Application, Container, Graphics, Rectangle, Text, Ticker } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { header } from '../shared/header';
import { PALETTE } from '../shared/random';
import { buildMap } from '../shared/world';
import { highlight } from '../playground/code';

import type { FederatedWheelEvent } from 'pixi.js';

header();

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

const container = document.getElementById('demo') as HTMLElement;
const stop = document.getElementById('stop') as HTMLInputElement;
const htmlList = document.getElementById('html-list') as HTMLUListElement;

for (let i = 1; i <= 30; i++)
{
    const item = document.createElement('li');

    item.textContent = `HTML item ${i}`;
    htmlList.appendChild(item);
}

const app = new Application();

await app.init({
    resizeTo: container,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
});
container.prepend(app.canvas);

const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    events: app.renderer.events,
    passiveWheel: false,
});

app.stage.addChild(viewport);
app.renderer.on('resize', (width: number, height: number) => viewport.resize(width, height));
buildMap(viewport, Ticker.shared, WORLD_WIDTH, WORLD_HEIGHT);
viewport
    .drag()
    .pinch()
    .wheel({ trackpadPinch: true, trackpadPinchSpeed: 2.5 })
    .decelerate()
    .clampZoom({ minScale: 0.2, maxScale: 4 });

/** A scrollable list drawn in pixi, placed in the world so it pans and zooms with the map */
function pixiList(): Container
{
    const width = 260;
    const height = 320;
    const rowHeight = 40;
    const rows = 25;
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const list = new Container();
    const content = new Container();
    const mask = new Graphics().roundRect(0, 0, width, height, 14).fill(0xffffff);

    list.addChild(new Graphics()
        .roundRect(0, 0, width, height, 14)
        .fill(dark ? 0x111827 : 0xffffff)
        .stroke({ width: 2, color: 0x8892a6, alpha: 0.5 }));

    for (let i = 0; i < rows; i++)
    {
        const row = new Container();

        row.addChild(new Graphics().roundRect(12, 8, 20, 20, 5).fill(PALETTE[i % PALETTE.length]));
        row.addChild(new Text({
            text: `pixi item ${i + 1}`,
            style: { fontFamily: 'system-ui, sans-serif', fontSize: 18, fill: dark ? 0xe5e7eb : 0x0f172a },
            x: 44,
            y: 7,
        }));
        row.y = 8 + (i * rowHeight);
        content.addChild(row);
    }

    content.mask = mask;
    list.addChild(content, mask);

    list.eventMode = 'static';
    list.hitArea = new Rectangle(0, 0, width, height);
    list.on('wheel', (event: FederatedWheelEvent) =>
    {
        const min = height - ((rows * rowHeight) + 16);

        content.y = Math.max(min, Math.min(0, content.y - event.deltaY));
        if (stop.checked)
        {
            event.stopPropagation();
        }
    });

    return list;
}

const list = viewport.addChild(pixiList());

viewport.fitWorld();
viewport.moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
list.position.set(viewport.left + (40 / viewport.scale.x), viewport.top + (40 / viewport.scale.y));
list.scale.set(1 / viewport.scale.x);

(document.getElementById('pixi-code') as HTMLElement).innerHTML = highlight([
    `list.eventMode = 'static'`,
    `list.on('wheel', (event) => {`,
    `    scrollList(event.deltaY)`,
    `    event.stopPropagation() // the viewport won't zoom`,
    `})`,
    `viewport.addChild(list)`,
].join('\n'));

(document.getElementById('html-code') as HTMLElement).innerHTML = highlight([
    `app.renderer.events.setTargetElement(wrapper) // before creating the viewport`,
    ``,
    `const viewport = new Viewport({`,
    `    events: app.renderer.events,`,
    `    ignoreWheelFromOtherElements: true,`,
    `})`,
].join('\n'));
