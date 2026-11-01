# pixi-viewport

A highly configurable viewport/2D camera designed to work with pixi.js.

Features include dragging, pinch-to-zoom, mouse wheel zooming, decelerated dragging, follow target, animate, snap to point, snap to zoom, clamping, bouncing on edges, and move on mouse edges. See the live examples below to try out all of these features.

All features are configurable and removable, so set up the viewport to be exactly what you need.

If pixi-viewport is useful to you, you can [sponsor its development on GitHub](https://github.com/sponsors/davidfig).

## AI-assisted development

Starting in October 2026, [Claude](https://www.anthropic.com/claude) (an AI model by Anthropic) assists with editing this code, including code review, bug fixes, and changes to documentation. A maintainer reviews every change before it is released. If you prefer not to use software developed with AI assistance, please take this into account when choosing whether to use pixi-viewport.

## v7.0.0

Tested with pixi.js v8.22. This release fixes many long-standing bugs. Some of those fixes change behavior that apps may rely on, so this is a major version.

Breaking changes:

- Built-in plugins always run in their default order (drag, pinch, wheel, follow, mouse-edges, edge-scroll, decelerate, animate, bounce, snap-zoom, clamp-zoom, snap, clamp), whatever order you add them in. Previously, each call moved that plugin to the end of a list shared by every viewport, so `viewport.clamp().drag()` ran drag after clamp. User plugins added with `viewport.plugins.add()` still go at the end unless you pass an index.
- `clamp()` with no options no longer clamps. `false` for `left`, `right`, `top`, or `bottom` now means "don't clamp this side" (it was treated as 0).
- `drag-start` and `drag-end` report the pointer's screen position in `screen`.

New:

- `viewport.edgeScroll()` scrolls when the mouse is near the screen edges, with `speed` in screen pixels per second. It replaces `mouseEdges()`, which is deprecated but unchanged.
- `drag({ disableOneFingerDrag: true })` ignores one-finger touch drags so the page can scroll.
- `clampZoom({ keepAspectRatio: false })` clamps one axis at a time, for zooming along a single axis.
- `wheel({ trackpadPinch: true, trackpadPinchSpeed: 2.5 })` speeds up trackpad pinch zooming without changing mouse wheel zooming. The default (`1`) keeps the current speed, which is slow for a pinch.
- `new Viewport({ ignoreWheelFromOtherElements: true })` ignores wheel events that bubble up from other elements, such as HTML overlays.
- A pixi object inside the viewport can call `stopPropagation()` on its `wheel` event to keep the viewport from zooming. With `passiveWheel: false`, the page doesn't scroll either.
- `getVisibleBounds()` takes an optional `Rectangle` to write into, and the default hit area no longer allocates a new one every frame.
- The event types (`DragEvent`, `MovedEvent`, `ZoomedEvent`, and others) are exported.
- A new demo site: a playground with presets and a live code panel, plus examples for embedding a viewport in a scrolling page and for overlays. The API docs are generated with TypeDoc.

Fixed:

- Clamp now stops deceleration at the edge (no more jitter), and re-clamps when only the screen size changes.
- `follow()` works with targets nested in other containers, `acceleration` no longer exceeds `speed`, and following a target that gets destroyed stops instead of throwing every frame.
- Animate's `removeOnInterrupt` also stops on wheel events.
- Negative scale (e.g., a y-axis pointing up) no longer breaks input.
- `mouse-edge-start` and `mouse-edge-end` events are emitted, including `mouse-edge-end` when the plugin is paused or removed while scrolling.
- `snapZoom({ time: 0 })` no longer throws.
- Touches whose `pointerup` never arrived (e.g., iOS suspending the page) are cleared when a new gesture starts.
- Type declarations use `.js` import extensions (works with `moduleResolution: NodeNext`) and include JSDoc comments.
- The UMD build uses the `PIXI` global.
- Decelerate and Wheel remove their event listeners when removed.
- With `wheel({ wheelZoom: false })`, a plain wheel event the viewport doesn't use no longer stops the page from scrolling (it was blocked whenever `passiveWheel` was `false`).

Documented without changing behavior: the wheel `percent` option and the mouseEdges `speed` option (see their JSDoc).

## v6.0.0

Moves pixi-viewport to pixi.js v8+ - sorry for the confusion.

## v5.0.2

Moves pixi-viewport to pixi.js v7.2+.

NOTE: there is a breaking change since in pixi.js v7.2 `interactive` (boolean) was deprecated in favor of `eventMode`.

## v5

Moves pixi-viewport to pixi.js v7 (thanks [@cuire](https://github.com/cuire)!).

NOTE: there is a breaking change since pixi-viewport moved to pixi's new event system. `options.interaction` is removed and you need pass `options.events` to the viewport for it to work properly. The events object can be found at pixi's `renderer.events` or `app.renderer.events`.

```js
const viewport = new Viewport({ events: renderer.events });

// or
// const viewport = new Viewport({ events: app.renderer.events });
```

## v4.30.0+

This project was migrated to Typescript (thanks [@ShukantPal](https://github.com/ShukantPal)!). All functionality should be the same. The live Example has been updated.

## Live Examples

- [Playground](https://viewport.pixijs.io/): try every plugin, switch between presets (map, edge scrolling, follow, timeline, bounce), and copy the code for your setup.
- [In a scrolling page](https://viewport.pixijs.io/examples/scrolling-page.html): embed a viewport in an article without trapping the mouse wheel or one-finger swipes.
- [Overlays](https://viewport.pixijs.io/examples/overlays.html): keep HTML panels and scrollable pixi objects from zooming the viewport underneath.

## API Documentation

[https://viewport.pixijs.io/api/](https://viewport.pixijs.io/api/)

## Simple Example

```js
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

// or with require
// const PIXI = require('pixi.js')
// const Viewport = require('pixi-viewport').Viewport

const app = new PIXI.Application();
await app.init({ resizeTo: window });
document.body.appendChild(app.canvas);

// create viewport
const viewport = new Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: 1000,
  worldHeight: 1000,
  events: app.renderer.events, // pixi's EventSystem is required for input to work
});

// add the viewport to the stage
app.stage.addChild(viewport);

// activate plugins
viewport.drag().pinch().wheel().decelerate();

// add a red box
const sprite = viewport.addChild(new PIXI.Sprite(PIXI.Texture.WHITE));
sprite.tint = 0xff0000;
sprite.width = sprite.height = 100;
sprite.position.set(100, 100);
```

## Installation

    npm i pixi-viewport

or

    pnpm add pixi-viewport

or

    yarn add pixi-viewport

or [grab the latest release](https://github.com/pixijs-userland/pixi-viewport/releases/) and use it:

```html
<script src="/directory-to-file/pixi.min.js"></script>
<script src="/directory-to-file/pixi_viewport.umd.cjs"></script>
<script>
  const viewport = new pixi_viewport.Viewport(options);
</script>
```

The UMD build expects pixi.js to be loaded first as the global `PIXI`. For ES modules, use `pixi_viewport.js` with an import map that resolves `pixi.js`.

## Migration from pixi-viewport v3 to v4

Viewport needs to be imported or required as follows:

```js
import { Viewport } from "pixi-viewport";

// or

const Viewport = require("pixi-viewport").Viewport;
```

Plugins have been moved to their own object:

```js
// viewport.pausePlugin('drag')
viewport.plugins.pause("drag");

// viewport.resumePlugin('drag')
viewport.plugins.resume("drag");

// viewport.removePlugin('drag')
viewport.plugins.remove("drag");

// viewport.userPlugin('name', plugin, index)
viewport.plugins.add("name", plugin, index);
```

## Tests

Tests use [Vitest](https://vitest.dev/) with jsdom.

1. Clone repository
2. pnpm install
3. pnpm test (or `pnpm test:watch` to rerun on changes)
4. pnpm coverage (for a coverage report)

## Development Recipe

This project uses [pnpm](https://pnpm.io/) (the version is pinned in `package.json`'s `packageManager` field).

1. clone repository
2. pnpm install
3. pnpm dev
4. open browser to http://localhost:5173 (the playground; the example pages are linked from its header)
5. pnpm run docs (builds the demo site and API docs into docs/dist; `pnpm docs:serve` to preview)

PRs are more than welcome!

## Other Libraries

If you liked pixi-viewport, please try my other open source libraries:

- [pixi-scrollbox](https://github.com/davidfig/pixi-scrollbox) - pixi.js scrollbox: a masked box that can scroll vertically or horizontally with scrollbars (uses pixi-viewport)
- [pixi-ease](https://github.com/davidfig/pixi-ease) - pixi.js animation library using easing functions
- [intersects](https://github.com/davidfig/intersects) - a simple collection of 2d collision/intersects functions. Supports points, circles, lines, axis-aligned boxes, and polygons

## license

MIT License
(c) 2024 [YOPEY YOPEY LLC](https://yopeyopey.com/) by David Figatner (david@yopeyopey.com)
