let _viewport, _drawWorld, _gui, _world

export let options

const TEST = false

export function gui(viewport, drawWorld, target) {
    _viewport = viewport
    _drawWorld = drawWorld
    _gui = new dat.GUI({ autoPlace: false })
    if (TEST) _gui.close()
    document.body.appendChild(_gui.domElement)
    _gui.domElement.style.bottom = '2em'
    _gui.domElement.style.right = 0
    _gui.domElement.style.position = 'fixed'
    _gui.domElement.style.opacity = 0.95
    _world = _gui.addFolder('world')
    options = {
        testDirty: false,
        drag: true,
        clampZoom: {
            clampZoom: false,
            minWidth: 1000,
            minHeight: 1000,
            maxWidth: 2000,
            maxHeight: 2000
        },
        pinch: {
            pinch: true,
            percent: 1,
            noDrag: false,
            centerX: 0,
            centerY: 0
        },
        clamp: {
            clamp: false,
            x: true,
            y: true,
            underflow: 'center'
        },
        bounce: {
            bounce: false,
            sides: 'all',
            friction: 0.5,
            time: 150,
            ease: 'easeInOutSine',
            underflow: 'center'
        },
        decelerate: {
            decelerate: true,
            friction: 0.95,
            minSpeed: 0.01
        },
        snap: {
            snap: false,
            x: 0,
            y: 0,
            friction: 0.8,
            topLeft: false,
            interrupt: true,
            time: 1000,
            ease: 'easeInOutSine'
        },
        follow: {
            follow: false,
            speed: 0,
            radius: 0,
            acceleration: 0
        },
        wheel: {
            wheel: true,
            percent: 0.1,
            centerX: 0,
            centerY: 0,
            lineHeight: 20
        },
        snapZoom: {
            snapZoom: false,
            width: 2000,
            height: 0,
            time: 1000,
            ease: 'easeInOutSine',
            removeOnComplete: false,
            centerX: 0,
            centerY: 0,
            interrupt: true
        },
        edgeScroll: {
            edgeScroll: false,
            radius: 300,
            distance: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            speed: 600,
            reverse: false,
            noDecelerate: false,
            linear: false
        }
    }
    guiWorld()
    guiDrag()
    guiPinch()
    guiWheel()
    guiClamp()
    guiClampZoom()
    guiBounce()
    guiDecelerate()
    guiSnap()
    guiFollow(target)
    guiSnapZoom()
    guiEdgeScroll()
}

function guiWorld() {
    _world.add(_viewport, 'worldWidth').onChange(_drawWorld)
    _world.add(_viewport, 'worldHeight').onChange(_drawWorld)
}

function guiDrag() {
    _gui.add(options, 'drag').onChange(
        function (value) {
            if (value) {
                _viewport.drag({ clampWheel: true })
            }
            else {
                _viewport.plugins.remove('drag')
            }
        })
}

function guiClamp() {
    function change() {
        _viewport.clamp({ direction: options.clamp.x && options.clamp.y ? 'all' : options.clamp.x ? 'x' : 'y', underflow: options.clamp.underflow })
    }

    function add() {
        clampX = clamp.add(options.clamp, 'x').onChange(change)
        clampY = clamp.add(options.clamp, 'y').onChange(change)
        underflow = clamp.add(options.clamp, 'underflow').onChange(change)
    }

    let clampX, clampY, underflow
    const clamp = _gui.addFolder('clamp')
    clamp.add(options.clamp, 'clamp').onChange(
        function (value) {
            if (value) {
                change()
                add()
            }
            else {
                _viewport.plugins.remove('clamp')
                clamp.remove(clampX)
                clamp.remove(clampY)
                clamp.remove(underflow)
            }
        })
    if (options.clamp.clamp) {
        clamp.open()
    }
}

function guiPinch() {
    function change() {
        const center = (options.pinch.centerX || options.pinch.centerY) ? { x: options.pinch.centerX, y: options.pinch.centerY } : null
        _viewport.pinch({ noDrag: options.pinch.noDrag, center, percent: options.pinch.percent })
    }

    function add() {
        noDrag = pinch.add(options.pinch, 'noDrag').onChange(change)
        centerX = pinch.add(options.pinch, 'centerX').onChange(change)
        centerY = pinch.add(options.pinch, 'centerY').onChange(change)
        percent = pinch.add(options.pinch, 'percent').onChange(change)
    }

    const pinch = _gui.addFolder('pinch')
    pinch.add(options.pinch, 'pinch').onChange(
        function (value) {
            if (value) {
                change()
                add()
            }
            else {
                _viewport.plugins.remove('pinch')
                pinch.remove(noDrag)
                pinch.remove(centerX)
                pinch.remove(centerY)
                pinch.remove(percent)
            }
        })
    let noDrag, centerX, centerY, percent
    if (options.pinch) {
        add()
    }
    if (options.pinch.pinch) {
        pinch.open()
    }
}

function guiBounce() {
    function change() {
        _viewport.bounce({ sides: options.bounce.sides, time: options.bounce.time, ease: options.bounce.ease, friction: options.bounce.friction, underflow: options.bounce.underflow })
    }

    function add() {
        sides = bounce.add(options.bounce, 'sides').onChange(change)
        time = bounce.add(options.bounce, 'time', 0, 2000).step(50).onChange(change)
        ease = bounce.add(options.bounce, 'ease').onChange(change)
        underflow = bounce.add(options.bounce, 'underflow').onChange(change)
    }

    let time, ease, underflow, sides
    const bounce = _gui.addFolder('bounce')
    bounce.add(options.bounce, 'bounce').onChange(
        function (value) {
            if (value) {
                change()
                if (!time) {
                    add()
                }
            }
            else {
                _viewport.plugins.remove('bounce')
                if (time) {
                    bounce.remove(sides)
                    bounce.remove(time)
                    time = null
                    bounce.remove(ease)
                    bounce.remove(underflow)
                }
            }
        }
    )
    if (options.bounce) {
        add()
    }
    if (options.bounce.bounce) {
        bounce.open()
    }
}

function guiDecelerate() {
    function change() {
        _viewport.decelerate({ friction: options.decelerate.friction, minSpeed: options.decelerate.minSpeed })
    }

    function add() {
        friction = decelerate.add(options.decelerate, 'friction', 0, 1)
        minSpeed = decelerate.add(options.decelerate, 'minSpeed')
    }

    let friction, minSpeed

    const decelerate = _gui.addFolder('decelerate')
    decelerate.add(options.decelerate, 'decelerate').onChange(
        function (value) {
            if (value) {
                change()
                if (!friction) {
                    add()
                }
            }
            else {
                if (friction) {
                    decelerate.remove(friction)
                    decelerate.remove(minSpeed)
                    friction = null
                }
            }
        }
    )
    if (options.decelerate) {
        add()
    }
    if (options.decelerate.decelerate) {
        decelerate.open()
    }
}

function guiSnap() {
    function change() {
        _viewport.snap(options.snap.x, options.snap.y, { interrupt: options.snap.interrupt, time: options.snap.time, ease: options.snap.ease, friction: options.snap.friction, topLeft: options.snap.topLeft })
    }

    function add() {
        x = snap.add(options.snap, 'x').onChange(change)
        y = snap.add(options.snap, 'y').onChange(change)
        friction = snap.add(options.snap, 'friction').onChange(change)
        topLeft = snap.add(options.snap, 'topLeft').onChange(change)
        interrupt = snap.add(options.snap, 'interrupt').onChange(change)
        time = snap.add(options.snap, 'time').onChange(change)
        ease = snap.add(options.snap, 'ease').onChange(change)
    }

    let x, y, time, ease, friction, interrupt, topLeft

    const snap = _gui.addFolder('snap')
    snap.add(options.snap, 'snap').onChange(
        function (value) {
            if (value) {
                change()
                add()
            }
            else {
                snap.remove(x)
                snap.remove(y)
                snap.remove(time)
                snap.remove(ease)
                snap.remove(friction)
                snap.remove(interrupt)
                snap.remove(topLeft)
                _viewport.plugins.remove('snap')
            }
        }
    )
    if (options.snap.snap) {
        add()
    }
    if (options.snap.snap) {
        snap.open()
    }
}

function guiFollow(target) {
    function change() {
        _viewport.follow(target, { speed: options.follow.speed, radius: options.follow.radius, acceleration: options.follow.acceleration })
    }

    function add() {
        speed = follow.add(options.follow, 'speed').onChange(change)
        radius = follow.add(options.follow, 'radius').onChange(change)
        acceleration = follow.add(options.follow, 'acceleration').onChange(change)
    }

    let speed, radius, acceleration
    const follow = _gui.addFolder('follow')
    follow.add(options.follow, 'follow').onChange(
        function (value) {
            if (value) {
                change()
                add()
            }
            else {
                follow.remove(speed)
                follow.remove(radius)
                follow.remove(acceleration)
                _viewport.plugins.remove('follow')
            }
        }
    )
    if (options.follow.follow) {
        add()
    }
    if (options.follow.follow) {
        follow.open()
    }
}

function guiWheel() {
    function change() {
        const center = (options.wheel.centerX || options.wheel.centerY) ? { x: options.wheel.centerX, y: options.wheel.centerY } : null
        _viewport.wheel({ percent: options.wheel.percent, minWidth: options.wheel.minWidth, maxWidth: options.wheel.maxWidth, minHeight: options.wheel.minHeight, maxHeight: options.wheel.maxHeight, center, lineHeight: options.wheel.lineHeight })
    }

    function add() {
        percent = wheel.add(options.wheel, 'percent').onChange(change)
        centerX = wheel.add(options.wheel, 'centerX').onChange(change)
        centerY = wheel.add(options.wheel, 'centerY').onChange(change)
        lineHeight = wheel.add(options.wheel, 'lineHeight').onChange(change)
    }

    const wheel = _gui.addFolder('wheel')
    wheel.add(options.wheel, 'wheel').onChange(
        function (value) {
            if (value) {
                change()
                add()
            }
            else {
                _viewport.plugins.remove('wheel')
                wheel.remove(percent)
                wheel.remove(centerX)
                wheel.remove(centerY)
                wheel.remove(lineHeight)
            }
        })
    let percent, centerX, centerY, lineHeight
    if (options.wheel) {
        add()
    }
    if (options.wheel.wheel) {
        wheel.open()
    }
}

function guiClampZoom() {
    function change() {
        _viewport.clampZoom({ minWidth: options.clampZoom.minWidth, maxWidth: options.clampZoom.maxWidth, minHeight: options.clampZoom.minHeight, maxHeight: options.clampZoom.maxHeight })
    }

    function add() {
        minWidth = clampZoom.add(options.clampZoom, 'minWidth').onChange(change)
        maxWidth = clampZoom.add(options.clampZoom, 'maxWidth').onChange(change)
        minHeight = clampZoom.add(options.clampZoom, 'minHeight').onChange(change)
        maxHeight = clampZoom.add(options.clampZoom, 'maxHeight').onChange(change)
    }

    const clampZoom = _gui.addFolder('clamp-zoom')
    clampZoom.add(options.clampZoom, 'clampZoom').onChange(
        function (value) {
            if (value) {
                change()
                add()
            }
            else {
                _viewport.plugins.remove('clamp-zoom')
                clampZoom.remove(minWidth)
                clampZoom.remove(maxWidth)
                clampZoom.remove(minHeight)
                clampZoom.remove(maxHeight)
            }
        })
    let minWidth, maxWidth, minHeight, maxHeight
    if (options.clampZoom.clampZoom) {
        add()
    }
    if (options.clampZoom.clampZoom) {
        clampZoom.open()
    }
}

function guiSnapZoom() {
    function change() {
        options.snapZoom.center = (options.snapZoom.centerX || options.snapZoom.centerY) ? { x: options.snapZoom.centerX, y: options.snapZoom.centerY } : null
        _viewport.snapZoom(options.snapZoom)
    }

    function add() {
        width = snapZoom.add(options.snapZoom, 'width').onChange(change)
        height = snapZoom.add(options.snapZoom, 'height').onChange(change)
        time = snapZoom.add(options.snapZoom, 'time').onChange(change)
        ease = snapZoom.add(options.snapZoom, 'ease').onChange(change)
        removeOnComplete = snapZoom.add(options.snapZoom, 'removeOnComplete').onChange(change)
        centerX = snapZoom.add(options.snapZoom, 'centerX').onChange(change)
        centerY = snapZoom.add(options.snapZoom, 'centerY').onChange(change)
        interrupt = snapZoom.add(options.snapZoom, 'interrupt').onChange(change)
    }

    const snapZoom = _gui.addFolder('snap-zoom')
    snapZoom.add(options.snapZoom, 'snapZoom').onChange(
        function (value) {
            if (value) {
                change()
                add()
            }
            else {
                _viewport.plugins.remove('snap-zoom')
                snapZoom.remove(width)
                snapZoom.remove(height)
                snapZoom.remove(time)
                snapZoom.remove(ease)
                snapZoom.remove(removeOnComplete)
                snapZoom.remove(centerX)
                snapZoom.remove(centerY)
                snapZoom.remove(interrupt)
            }
        })
    let width, height, time, ease, removeOnComplete, centerX, centerY, interrupt
    if (options.snapZoom.snapZoom) {
        add()
    }
    if (options.snapZoom.snapZoom) {
        snapZoom.open()
    }
}

function guiEdgeScroll() {
    function change() {
        const me = options.edgeScroll
        _viewport.edgeScroll({ radius: me.radius !== 0 ? me.radius : null, distance: me.distance !== 0 ? me.distance : null, top: me.top !== 0 ? me.top : null, bottom: me.bottom !== 0 ? me.bottom : null, left: me.left !== 0 ? me.left : null, right: me.right !== 0 ? me.right : null, speed: me.speed, reverse: me.reverse, noDecelerate: me.noDecelerate, linear: me.linear })
    }

    function add() {
        radius = edgeScroll.add(options.edgeScroll, 'radius').onChange(change)
        distance = edgeScroll.add(options.edgeScroll, 'distance').onChange(change)
        top = edgeScroll.add(options.edgeScroll, 'top').onChange(change)
        left = edgeScroll.add(options.edgeScroll, 'left').onChange(change)
        right = edgeScroll.add(options.edgeScroll, 'right').onChange(change)
        bottom = edgeScroll.add(options.edgeScroll, 'bottom').onChange(change)
        speed = edgeScroll.add(options.edgeScroll, 'speed').onChange(change)
        reverse = edgeScroll.add(options.edgeScroll, 'reverse').onChange(change)
        noDecelerate = edgeScroll.add(options.edgeScroll, 'noDecelerate').onChange(change)
        linear = edgeScroll.add(options.edgeScroll, 'linear').onChange(change)
    }

    const edgeScroll = _gui.addFolder('edgeScroll')
    edgeScroll.add(options.edgeScroll, 'edgeScroll').onChange(
        function (value) {
            if (value) {
                change()
                add()
            }
            else {
                _viewport.plugins.remove('edge-scroll')
                edgeScroll.remove(radius)
                edgeScroll.remove(distance)
                edgeScroll.remove(top)
                edgeScroll.remove(left)
                edgeScroll.remove(right)
                edgeScroll.remove(bottom)
                edgeScroll.remove(speed)
                edgeScroll.remove(reverse)
                edgeScroll.remove(noDecelerate)
                edgeScroll.remove(linear)
            }
        })
    let radius, distance, top, left, right, bottom, speed, reverse, noDecelerate, linear
    if (options.edgeScroll.edgeScroll) {
        add()
    }
    if (options.edgeScroll.edgeScroll) {
        edgeScroll.open()
    }
}

/* global dat */