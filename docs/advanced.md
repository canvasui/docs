# Advanced

## Animation
CanvasUI has a built-in animation library.
```js
// 1. Write animation config.
let config = {
    component: component,               // The current component object, just write "component" directly.
    id: 'image-demo',                   // The id of the component to which the animation is applied.
    property: 'border-radius',          // The property name to which the animation is applied.
    template: value => `${value}px`,    // How to write the property value of the applied animation.
    start: 0,
    end: 100,
    duration: 2000,
    delay: 500,
    timingFunction: cubicBezier(0.25, 0.1, 0.25, 1),    // Timing function, built-in cubicBezier function can be used.
}
// 2. Create animation with config and add it to timeline.
timeline.add(new Animation(config))
// 3. Start timeline.
timeline.start()
```

## Gesture
The events dispatched by CanvasUI are compatible with mouse operations on the desktop side and gesture operations on the mobile side.

When you need to dig deep into CanvasUI for debugging or custom components, CanvasUI exposes a series of gesture events for use, just pass them into `addEventListener`:
- start, cancel
- tap
- pressstart, pressend, presscancel
- panstart, panmove, panend
- swipe
