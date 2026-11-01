// jsdom has no canvas implementation; pixi only probes getContext, so return null instead of logging a warning
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
