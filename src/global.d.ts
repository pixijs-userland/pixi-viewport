declare namespace PixiMixins
{
  type Viewport = import('./Viewport.js').Viewport;
  type PixiViewportClickedEvent = import('./types.js').ClickedEvent;
  type PixiViewportDragEvent = import('./types.js').DragEvent;
  type PixiViewportMovedEvent = import('./types.js').MovedEvent;
  type PixiViewportZoomedEvent = import('./types.js').ZoomedEvent;
  type PixiViewportWheelStartEvent = import('./types.js').WheelStartEvent;

  interface ContainerEvents
  {
      clicked: [PixiViewportClickedEvent];
      'drag-start': [PixiViewportDragEvent];
      'drag-end': [PixiViewportDragEvent];
      moved: [PixiViewportMovedEvent];
      zoomed: [PixiViewportZoomedEvent];
      'pinch-start': [Viewport];
      'pinch-end': [Viewport];
      'snap-start': [Viewport];
      'snap-end': [Viewport];
      'snap-zoom-start': [Viewport];
      'snap-zoom-end': [Viewport];
      'bounce-x-start': [Viewport];
      'bounce-x-end': [Viewport];
      'bounce-y-start': [Viewport];
      'bounce-y-end': [Viewport];
      'wheel-start': [PixiViewportWheelStartEvent];
      'wheel-scroll': [Viewport];
      'animate-end': [Viewport];
      'mouse-edge-start': [Viewport];
      'mouse-edge-end': [Viewport];
      'edge-scroll-start': [Viewport];
      'edge-scroll-end': [Viewport];
      'moved-end': [Viewport];
      'zoomed-end': [Viewport];
      'frame-end': [Viewport];
      'plugin-remove': [string];
  }
}
