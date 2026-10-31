import '../style.css';

import { Application, Ticker } from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import { header } from '../shared/header';
import { buildMap } from '../shared/world';
import { highlight } from '../playground/code';

header();

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

const container = document.getElementById('demo') as HTMLElement;
const pageWheel = document.getElementById('page-wheel') as HTMLInputElement;
const oneFinger = document.getElementById('one-finger') as HTMLInputElement;
const codeElement = document.getElementById('code') as HTMLElement;

const app = new Application();

await app.init({
    resizeTo: container,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
});
container.appendChild(app.canvas);

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
viewport.fitWorld();
viewport.moveCenter(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

function apply(): void
{
    const drag = pageWheel.checked
        ? oneFinger.checked ? `{ wheel: false, disableOneFingerDrag: true }` : `{ wheel: false }`
        : oneFinger.checked ? `{ disableOneFingerDrag: true }` : '';
    const wheel = pageWheel.checked ? `{ wheelZoom: false, trackpadPinch: true }` : '';

    // pixi sets touch-action: none on the canvas; pan-y lets the browser scroll the page with one finger
    app.canvas.style.touchAction = oneFinger.checked ? 'pan-y' : 'none';

    viewport.plugins.removeAll();
    viewport
        .drag({ wheel: !pageWheel.checked, disableOneFingerDrag: oneFinger.checked })
        .pinch()
        .wheel(pageWheel.checked ? { wheelZoom: false, trackpadPinch: true } : {})
        .decelerate()
        .clamp({ direction: 'all' })
        .clampZoom({ minScale: viewport.findFit(WORLD_WIDTH, WORLD_HEIGHT), maxScale: 4 });

    codeElement.innerHTML = highlight([
        `const viewport = new Viewport({`,
        `    worldWidth: ${WORLD_WIDTH},`,
        `    worldHeight: ${WORLD_HEIGHT},`,
        `    events: app.renderer.events,`,
        `    passiveWheel: false, // so pinch zoom doesn't also zoom the page`,
        `})`,
        ``,
        `viewport`,
        `    .drag(${drag})`,
        `    .pinch()`,
        `    .wheel(${wheel})`,
        `    .decelerate()`,
        `    .clamp({ direction: 'all' })`,
        `    .clampZoom({ minScale: viewport.findFit(${WORLD_WIDTH}, ${WORLD_HEIGHT}), maxScale: 4 })`,
        ...(oneFinger.checked ? [
            ``,
            `// pixi sets touch-action: none on the canvas; let the browser scroll vertically`,
            `app.canvas.style.touchAction = 'pan-y'`,
        ] : []),
    ].join('\n'));
}

pageWheel.addEventListener('change', apply);
oneFinger.addEventListener('change', apply);
apply();
