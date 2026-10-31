A configurable 2D camera for [pixi.js](https://pixijs.com) v8. Try it in the <a href="../index.html">playground</a>, which shows the code for whatever you set up.

## Getting started

```ts
import { Application } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

const app = new Application();

await app.init({ resizeTo: window });
document.body.appendChild(app.canvas);

const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth: 2000,
    worldHeight: 2000,
    events: app.renderer.events, // required for input
});

app.stage.addChild(viewport);
viewport.drag().pinch().wheel().decelerate();
```

Start with {@link Viewport}, then add plugins for the behavior you need:

- {@link Viewport.drag | drag}: pan with mouse, touch, or pen
- {@link Viewport.pinch | pinch}: two-finger zoom and pan
- {@link Viewport.wheel | wheel}: mouse wheel and trackpad zoom
- {@link Viewport.decelerate | decelerate}: keep moving after a drag
- {@link Viewport.clamp | clamp}: keep the world on screen
- {@link Viewport.clampZoom | clampZoom}: limit how far you can zoom
- {@link Viewport.bounce | bounce}: spring back from the edges
- {@link Viewport.edgeScroll | edgeScroll}: scroll when the mouse is near an edge
- {@link Viewport.follow | follow}: follow a target
- {@link Viewport.snap | snap}, {@link Viewport.snapZoom | snapZoom}, {@link Viewport.animate | animate}: move or zoom to a position over time

Each plugin's options are in the **Plugin options** section. Events are listed on {@link Viewport}.

## Examples

- <a href="../index.html">Playground</a>: every plugin, with presets and live code
- <a href="../examples/scrolling-page.html">In a scrolling page</a>: embed a viewport without trapping the wheel or swipes
- <a href="../examples/overlays.html">Overlays</a>: keep HTML panels and pixi lists from zooming the viewport
