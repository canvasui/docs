/*
用法:
let animation = new Animation(config)
let animation2 = new Animation(config)

let timeline = new Timeline()
timeline.add(animation)
timeline.add(animation2)

timeline.start()
timeline.pause()
timeline.resume()
*/


class Timeline {
    constructor() {
        this.state = 'initial'  // initial | running | paused | waiting(已经start, 等待add)
        this.rafId = 0
        this.startTime = 0
        this.pauseTime = 0
        this.animations = new Set()
    }

    tick() {
        let elapsedTime = Date.now() - this.startTime
        for (let animation of this.animations) {
            let { object, property, template, duration, delay, timingFunction } = animation
            let progress
            if (elapsedTime < delay) {
                progress = 0
            } else if (elapsedTime <= delay + duration) {
                // timingFunction 接受时间的进度(0~1), 返回实际效果的进度(0~1)
                progress = timingFunction((elapsedTime - delay) / duration)
            } else {
                progress = 1
                this.animations.delete(animation)
            }
            // 根据进度计算相应的属性值
            let value = animation.newValue(progress)
            if (object[property]) {
                object[property].value = template(value)
            } else {
                object[property] = { value: template(value) }
            }
        }
        if (this.animations.size > 0) {
            this.rafId = requestAnimationFrame(this.tick.bind(this))
        } else {
            // 已经 start, 等待 add 后立即开始 tick
            this.state = 'waiting'
        }
    }

    add(animation) {
        this.animations.add(animation)
        if (this.state !== 'initial') {
            // 可以随时开启一个新的 animation
            animation.delay += Date.now() - this.startTime
        }
        if (this.state === 'waiting') {
            // timeline 已经 start, 当 animations 中有元素的时候立即开始 tick
            this.state = 'running'
            this.tick()
        }
    }

    start() {
        if (this.state !== 'initial') {
            return
        }
        this.state = 'running'
        this.startTime = Date.now()
        this.tick()
    }

    pause() {
        if (this.state !== 'running') {
            return
        }
        this.state = 'paused'
        this.pauseTime = Date.now()
        cancelAnimationFrame(this.rafId)
    }

    resume() {
        if (this.state !== 'paused') {
            return
        }
        this.state = 'running'
        this.startTime += Date.now() - this.pauseTime
        this.tick()
    }

    reset() {
        this.animations = new Set()
        this.state = 'initial'
    }
}


class Animation {
    constructor(config) {
        this.object = null
        this.id = config.id
        this.property = config.property
        this.template = config.template
        this.start = config.start
        this.end = config.end
        this.duration = config.duration
        this.delay = config.delay || 0
        this.timingFunction = config.timingFunction || (progress => progress)
        this.find(config.component)
    }

    find(component) {
        if (component.props?.id === this.id) {
            this.object = component.style
            return
        }
        for (let child of component.children) {
            this.find(child)
        }
    }

    newValue(progress) {
        // 不同的 animation 需要重写此方法
        return this.start + (this.end - this.start) * progress
    }
}


function cubicBezier(x1, y1, x2, y2) {
    // 翻译自 WebKit 源码:
    // https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/UnitBezier.h

    const epsilon = 1e-6

    const ax = 3 * x1 - 3 * x2 + 1
    const bx = 3 * x2 - 6 * x1
    const cx = 3 * x1

    const ay = 3 * y1 - 3 * y2 + 1
    const by = 3 * y2 - 6 * y1
    const cy = 3 * y1

    function sampleCurveX(t) {
        return ((ax * t + bx) * t + cx ) * t
    }

    function sampleCurveY(t) {
        return ((ay * t + by) * t + cy ) * t
    }

    function sampleCurveDerivativeX(t) {
        return (3 * ax * t + 2 * bx) * t + cx
    }

    function solveCurveX(x) {
        let t0 = 0
        let t1 = 1
        let t2 = x
        let x2
        // 先尝试非常快的牛顿法
        for (let i = 0; i < 8; i++) {
            x2 = sampleCurveX(t2) - x
            if (Math.abs(x2) < epsilon) {
                return t2
            }
            let derivative = sampleCurveDerivativeX(t2)
            if (Math.abs(derivative) < epsilon) {
                break
            }
            t2 -= x2 / derivative
        }
        // 回到更可靠的二分法
        while (t1 > t0) {
            x2 = sampleCurveX(t2) - x
            if (Math.abs(x2) < epsilon) {
                return t2
            }
            if (x2 > 0) {
                t1 = t2
            } else {
                t0 = t2
            }
            t2 = (t1 + t0) / 2
        }
        return t2
    }

    function solve(x) {
        return sampleCurveY(solveCurveX(x))
    }

    return solve
}


let timeline = new Timeline()


function bindData(component, style, config) {
    let rootComponent = component
    let proxyCallbackMap = new Map()
    let currentProxyCallback = null
    // data
    let vm = proxy(config.data)
    vm.component = component
    // methods
    for (let name in config.methods) {
        config.methods[name].match(/([\S]+?\(([\s\S]*?)\))/)
        let functionHead = RegExp.$1
        let functionBody = config.methods[name].replace(functionHead, '')
        let functionArgs = []
        if (RegExp.$2 !== '') {
            functionArgs = RegExp.$2.split(',')
        }
        let args = []
        for (let arg of functionArgs) {
            args.push(arg.trim())
        }
        let f = new Function(...args, functionBody)
        vm[name] = f.bind(vm)
    }
    // 遍历 component 及其子组件, 收集依赖(对使用模板语法的 prop 注册回调函数)
    // 并绑定样式和设置盒模型
    traverse(rootComponent)

    function proxy(object) {
        return new Proxy(object, {
            get(object, property) {
                if (typeof object[property] === 'object' && !Array.isArray(object[property])) {
                    return proxy(object[property])
                } else {
                    if (currentProxyCallback) {
                        if (!proxyCallbackMap.has(object)) {
                            proxyCallbackMap.set(object, new Map())
                        }
                        if (!proxyCallbackMap.get(object).has(property)) {
                            proxyCallbackMap.get(object).set(property, new Set())
                        }
                        proxyCallbackMap.get(object).get(property).add(currentProxyCallback)
                    }
                    return object[property]
                }
            },
            set(object, property, value) {
                object[property] = value
                let callbacks = proxyCallbackMap.get(object)?.get(property) ?? (new Set())
                for (let callback of callbacks) {
                    callback()
                }
                return true
            }
        })
    }

    function registerProxyCallback(callback) {
        currentProxyCallback = callback
        callback(true)
        currentProxyCallback = null
    }

    function traverse(component) {
        for (let [prop, value] of Object.entries(component.props)) {
            if (value.match(/{([\s\S]+)}/)) {
                let name = RegExp.$1.trim()
                registerProxyCallback((registering) => {
                    // registering 用于标记当前是正在收集依赖还是真正触发了改动
                    // 有些操作必须是真正触发了改动了才会执行, 并不会在收集依赖的时候就执行
                    if (typeof vm[name] === 'function' || Array.isArray(vm[name])) {
                        component.props[prop] = vm[name]
                    } else {
                        component.props[prop] = value.replace(/{([\s\S]+)}/, vm[name])
                        if (prop === 'value') {
                            // 对于特殊的 input 类的组件, 当 UI 操作使其发生变化的时候, 也将相应的变化流向 vm
                            // 此处存下所绑定的变量名, 在组件中即可使用 this.vm[this.bind] = this.value 的方式传递数据
                            component.bind = name
                        }
                    }
                    // 在属性发生改变的时候 重新绑定样式 / 重新设置盒模型 / 重新排版
                    bindStyle(component, style)
                    component.setBox()
                    if (!registering) {
                        // 真正触发改动的时候才发生重排
                        layout(rootComponent, true)
                    }
                })
            }
        }
        component.vm = vm
        bindStyle(component, style)
        component.setBox()
        for (let child of component.children) {
            traverse(child)
        }
    }
}


function bindStyle(component, style) {
    traverse(component)

    function traverse(component) {
        compute(component)
        for (let child of component.children) {
            traverse(child)
        }
    }

    function match(component, selector) {
        if (selector[0] === '#') {
            let id = component.props.id
            if (id === selector.slice(1)) {
                return true
            }
        } else if (selector[0] === '.') {
            let classNames = component.props.class?.split(' ') ?? []
            for (let className of classNames) {
                if (className === selector.slice(1)) {
                    return true
                }
            }
        } else if (selector === component.tagName) {
            return true
        } else {
            return false
        }
    }

    function specificity(selectors) {
        let s = [0, 0, 0, 0]
        for (let part of selectors) {
            if (part[0] === '#') {
                s[1] += 1
            } else if (part[0] === '.') {
                s[2] += 1
            } else {
                s[3] += 1
            }
        }
        return s
    }

    function compare(s1, s2) {
        if (s1[0] !== s2[0]) {
            return s1[0] > s2[0]
        } else if (s1[1] !== s2[1]) {
            return s1[1] > s2[1]
        } else if (s1[2] !== s2[2]) {
            return s1[2] > s2[2]
        } else if (s1[3] !== s2[3]) {
            return s1[3] - s2[3]
        } else {
            return false
        }
    }

    function compute(component) {
        component.style = {}
        ruleLoop:
        for (let rule of style) {
            let selectors = rule.selector.split(' ').reverse()
            let parent = component
            for (let part of selectors) {
                if (match(parent, part)) {
                    parent = parent.parent
                } else {
                    continue ruleLoop
                }
            }
            let newSpecificity = specificity(selectors)
            let style = component.style
            for (let [property, value] of Object.entries(rule.declaration)) {
                style[property] = style[property] ?? {}
                style[property].specificity = style[property].specificity ?? newSpecificity
                if (compare(style[property].specificity, newSpecificity)) {
                    // 如果原样式比新样式的优先级更高, 则无需改变
                    continue
                }
                // 后来优先原则
                style[property].value = value
            }
        }
    }
}


class Canvas {
    constructor() {
        this.canvas = document.querySelector('canvas')
        this.context = this.canvas.getContext('2d')
        this.component = null
        this.responsive()
        this.setDefaultCursor()
    }

    launch(component) {
        this.component = component
        this.component.vm.init && this.component.vm.init()
        requestAnimationFrame(this.mainloop.bind(this))
    }

    mainloop() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.draw(this.component)
        requestAnimationFrame(this.mainloop.bind(this))
    }

    draw(component) {
        component.draw()
        for (let child of component.children) {
            this.draw(child)
        }
    }

    responsive() {
        let timer = null
        let resize = () => {
            let dpr = window.devicePixelRatio
            if ('ontouchstart' in document) {
                dpr = 1
            }
            this.canvas.width = window.innerWidth * dpr
            this.canvas.height = window.innerHeight * dpr
            this.canvas.style.width = `${window.innerWidth}px`
            this.canvas.style.height = `${window.innerHeight}px`
            this.context.scale(dpr, dpr)
        }
        resize()
        window.addEventListener('resize', () => {
            clearTimeout(timer)
            timer = setTimeout(() => {
                resize()
                this.component.style['width'].value = window.innerWidth
                this.component.style['height'].value = window.innerHeight
                layout(this.component, true)
            }, 100)
        })
    }

    setDefaultCursor() {
        document.addEventListener('mousemove', () => {
            document.body.style.cursor = 'auto'
        })
    }
}


class Component {
    constructor(template, context) {
        this.vm = null
        this.tagName = template.tagName
        this.parent = template.parent
        this.props = template.props
        this.style = template.style
        this.context = context
        this.layout = {}
        this.children = []
    }

    // 鼠标事件
    hover(enterCallback, leaveCallback) {
        document.addEventListener('mousemove', (event) => {
            if (event.clientX >= this.layout.left &&
                event.clientX <= this.layout.right &&
                event.clientY >= this.layout.top &&
                event.clientY <= this.layout.bottom)
            {
                enterCallback(event)
            } else {
                leaveCallback && leaveCallback(event)
            }
        })
    }

    mousedown(callback) {
        document.addEventListener('mousedown', (event) => {
            if (event.clientX >= this.layout.left &&
                event.clientX <= this.layout.right &&
                event.clientY >= this.layout.top &&
                event.clientY <= this.layout.bottom)
            {
                callback(event)
            }
        })
    }

    mouseup(callback) {
        document.addEventListener('mouseup', (event) => {
            if (event.clientX >= this.layout.left &&
                event.clientX <= this.layout.right &&
                event.clientY >= this.layout.top &&
                event.clientY <= this.layout.bottom)
            {
                callback(event)
            }
        })
    }

    mousemove(callback) {
        document.addEventListener('mousemove', (event) => {
            if (event.clientX >= this.layout.left &&
                event.clientX <= this.layout.right &&
                event.clientY >= this.layout.top &&
                event.clientY <= this.layout.bottom)
            {
                callback(event)
            }
        })
    }

    dblclick(callback) {
        document.addEventListener('dblclick', (event) => {
            if (event.clientX >= this.layout.left &&
                event.clientX <= this.layout.right &&
                event.clientY >= this.layout.top &&
                event.clientY <= this.layout.bottom)
            {
                callback(event)
            }
        })
    }

    // 手势事件
    // 轻点
    tap(callback) {
        document.addEventListener('tap', (event) => {
            if (event.detail.clientX >= this.layout.left &&
                event.detail.clientX <= this.layout.right &&
                event.detail.clientY >= this.layout.top &&
                event.detail.clientY <= this.layout.bottom)
            {
                callback(event.detail)
            }
        })
    }
    // 长按
    pressstart(callback) {
        document.addEventListener('pressstart', (event) => {
            if (event.detail.clientX >= this.layout.left &&
                event.detail.clientX <= this.layout.right &&
                event.detail.clientY >= this.layout.top &&
                event.detail.clientY <= this.layout.bottom)
            {
                callback(event.detal)
            }
        })
    }
    pressend(callback) {
        document.addEventListener('pressend', (event) => {
            if (event.detail.clientX >= this.layout.left &&
                event.detail.clientX <= this.layout.right &&
                event.detail.clientY >= this.layout.top &&
                event.detail.clientY <= this.layout.bottom)
            {
                callback(event.detail)
            }
        })
    }
    // 拖动
    panstart(callback) {
        document.addEventListener('panstart', (event) => {
            if (event.detail.startX >= this.layout.left &&
                event.detail.startX <= this.layout.right &&
                event.detail.startY >= this.layout.top &&
                event.detail.startY <= this.layout.bottom)
            {
                callback(event.detail)
            }
        })
    }
    panmove(callback) {
        document.addEventListener('panmove', (event) => {
            if (event.detail.clientX >= this.layout.left &&
                event.detail.clientX <= this.layout.right &&
                event.detail.clientY >= this.layout.top &&
                event.detail.clientY <= this.layout.bottom)
            {
                callback(event.detail)
            }
        })
    }
    panend(callback) {
        document.addEventListener('panend', (event) => {
            if (event.detail.clientX >= this.layout.left &&
                event.detail.clientX <= this.layout.right &&
                event.detail.clientY >= this.layout.top &&
                event.detail.clientY <= this.layout.bottom)
            {
                callback(event.detail)
            }
        })
    }
    // 快扫
    swipe(callback) {
        document.addEventListener('swipe', (event) => {
            if (event.detail.clientX >= this.layout.left &&
                event.detail.clientX <= this.layout.right &&
                event.detail.clientY >= this.layout.top &&
                event.detail.clientY <= this.layout.bottom)
            {
                callback(event.detail)
            }
        })
    }

    /*
    子类应实现如下方法:
    setBox()        // 设置宽高用于排版
    registerEvent() // 用于注册事件
    draw()          // 用于绘制组件
    */
}


class ButtonComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.borderColor = '#dcdfe6'
        this.backgroundColor = '#ffffff'
        this.labelColor = '#606266'
        this.registerEvent()
    }

    setBox() {
        this.style['width'] = {
            value: '100px',
        }
        this.style['height'] = {
            value: '40px',
        }
        this.context.font = '14px sans-serif'
        let labelWidth = this.context.measureText(this.props.label).width
        if (labelWidth >= 58) {
            this.style['width'].value = `${labelWidth + 42}px`
        }
    }

    registerEvent() {
        this.hover(() => {
            this.borderColor = '#c6e2ff'
            this.backgroundColor = '#ecf5ff'
            this.labelColor = '#409eff'
            document.body.style.cursor = 'pointer'
        }, () => {
            this.borderColor = '#dcdfe6'
            this.backgroundColor = '#ffffff'
            this.labelColor = '#606266'
        })
        this.mousedown(() => {
            this.borderColor = '#3a8ee6'
            this.labelColor = '#3a8ee6'
        })
        this.mouseup(() => {
            this.borderColor = '#c6e2ff'
            this.labelColor = '#409eff'
        })
        this.tap(() => {
            this.props['@click']()
        })
    }

    draw() {
        pen.reset()
        // 边框
        let width = parseInt(this.style['width'].value)
        let height = parseInt(this.style['height'].value)
        pen.drawRect(this.layout.left, this.layout.top, width, height, 4)
        pen.stroke(this.borderColor)
        // 背景
        pen.fill(this.backgroundColor)
        // 文字
        let x = this.layout.left + width / 2
        let y = this.layout.top + 13
        pen.drawText(this.props.label, x, y, 14, this.labelColor, 'center')
    }
}



class CheckboxComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.firstDraw = true
        this.value = false
        this.borderColor = '#dcdfe6'
        this.registerEvent()
    }

    get backgroundColor() {
        return this.value ? '#409eff' : '#ffffff'
    }

    get labelColor() {
        return this.value ? '#409eff' : '#606266'
    }

    setBox() {
        this.context.font = '14px sans-serif'
        let labelWidth = this.context.measureText(this.props.label).width
        this.style['width'] = {
            value: `${24 + labelWidth}px`,
        }
        this.style['height'] = {
            value: '14px',
        }
    }

    registerEvent() {
        this.hover(() => {
            this.borderColor = '#409eff'
            document.body.style.cursor = 'pointer'
        }, () => {
            this.borderColor = '#dcdfe6'
        })
        this.tap(() => {
            this.value = !this.value
            this.vm[this.bind] = this.value
        })
    }

    draw() {
        pen.reset()
        if (this.firstDraw) {
            this.firstDraw = false
            // 因为传入的属性值为字符串类型, 而不是布尔类型, 所以需要进一步判断
            this.value = {
                'true': true,
                'false': false,
            }[this.props.value]
        }
        // 边框
        pen.drawRect(this.layout.left, this.layout.top, 14, 14, 2)
        pen.stroke(this.borderColor)
        // 背景
        pen.fill(this.backgroundColor)
        // 对勾
        if (this.value) {
            pen.drawText('✔', this.layout.left + 1, this.layout.top, 14, 'white')
        }
        // 文字
        pen.drawText(this.props.label, this.layout.left + 24, this.layout.top, 14, this.labelColor)
    }
}


class ColorComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.firstDraw = true
        this.value = '#409eff'
        this.show = false
        this.registerEvent()
    }

    setBox() {
        this.style['width'] = {
            value: '40px',
        }
        this.style['height'] = {
            value: '40px',
        }
    }

    registerEvent() {
        this.tap(() => {
            this.show = !this.show
        })
        this.hover(() => {
            document.body.style.cursor = 'pointer'
        })
        document.addEventListener('tap', (event) => {
            if (event.detail.clientX >= this.layout.left - 50 &&
                event.detail.clientX <= this.layout.right + 50 &&
                event.detail.clientY >= this.layout.bottom + 5 &&
                event.detail.clientY <= this.layout.bottom + 145)
            {
                if (this.show) {
                    let dpr = window.devicePixelRatio
                    if ('ontouchstart' in document) {
                        dpr = 1
                    }
                    let [r, g, b] = this.context.getImageData(event.detail.clientX * dpr, event.detail.clientY * dpr, 1, 1).data
                    this.value = `rgb(${r}, ${g}, ${b})`
                    this.vm[this.bind] = this.value
                    this.show = false
                }
            }
        })
    }

    draw() {
        pen.reset()
        if (this.firstDraw) {
            this.firstDraw = false
            if (this.props.value !== '') {
                this.value = this.props.value
            }
        }
        // 选择按钮
        pen.drawRect(this.layout.left, this.layout.top, 40, 40, 4)
        pen.stroke('#dcdfe6')
        pen.drawRect(this.layout.left + 5, this.layout.top + 5, 30, 30, 2)
        pen.fill(this.value)
        // 箭头
        pen.drawText('▽', this.layout.left + 13, this.layout.top + 13, 14, 'white')
        // 色盘
        if (this.show) {
            for (let i = 0; i < 12; i++) {
                this.context.beginPath()
                this.context.moveTo(this.layout.left + 20, this.layout.top + 115)
                this.context.arc(this.layout.left + 20, this.layout.top + 115, 70, (Math.PI * 2) / 12 * i, (Math.PI * 2) / 12 * (i + 1))
                this.context.closePath()
                this.context.fillStyle = `hsl(${i * 30}, 100%, 50%)`
                this.context.fill()
            }
        }
    }
}


class CustomComponent extends Component {
    constructor(template, context) {
        super(template, context)
    }

    setBox() {
    }

    mount() {
        let { style, template, script } = componentJson[this.tagName]
        let component = construct(template, this.context)
        bindData(component, style, script)
        return component
    }
}


class DivComponent extends Component {
    constructor(template, context) {
        super(template, context)
    }

    setBox() {
    }

    draw() {
        pen.reset()
        let margin = parseInt(this.style['margin']?.value ?? 0)
        let borderWidth = parseInt(this.style['border']?.value.split(' ')[0] ?? 1)
        let borderStyle = this.style['border']?.value.split(' ')[1] ?? 'solid'
        let borderColor = this.style['border']?.value.split(' ')[2] ?? 'black'
        let radius = parseInt(this.style['border-radius']?.value ?? 0)

        let x = this.layout.left + margin
        let y = this.layout.top + margin
        let width = this.layout.width - margin * 2
        let height = this.layout.height - margin * 2

        pen.drawRect(x, y, width, height, radius, borderStyle, borderWidth)
        if (this.style.border) {
            pen.stroke(borderColor, borderWidth)
        }
        if (this.style.background) {
            pen.fill(this.style.background.value)
        }
    }
}


class ImageComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.image = null
    }

    setBox() {
        // 为了避免重排, <image> 必须通过 CSS 显式设置宽高
    }

    draw() {
        pen.reset()
        let width = parseInt(this.style['width'].value)
        let height = parseInt(this.style['height'].value)
        let radius = parseInt(this.style['border-radius']?.value ?? 0)
        pen.drawImage(this.image, this.layout.left, this.layout.top, width, height, radius)
    }
}


class InputComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.focus = false
        this.array = []
        this.index = -1
        this.selecting = false
        this.selected = { start: -1, end: -1 }
        this.borderColor = '#dcdfe6'
        this.caretColor = 'black'
        this.registerEvent()
        this.caretBlink()
    }

    get value() {
        return this.array.join('')
    }

    get selectedValue() {
        let start = Math.min(this.selected.start, this.selected.end)
        let end = Math.max(this.selected.start, this.selected.end) + 1
        return this.value.slice(start, end)
    }

    get startPosition() {
        return this.layout.left + 15
    }

    get endPosition() {
        this.context.font = '14px sans-serif'
        let width = this.context.measureText(this.value).width
        return this.startPosition + width
    }

    get caretPosition() {
        this.context.font = '14px sans-serif'
        let width = this.context.measureText(this.array.slice(0, this.index + 1).join('')).width
        return this.startPosition + width
    }

    setBox() {
        this.style['width'] = this.style['width'] ?? {
            value: '180px',
        }
        this.style['height'] = {
            value: '40px',
        }
    }

    registerEvent() {
        this.hover(() => {
            if (!this.focus) {
                this.borderColor = '#c0c4cc'
            }
            document.body.style.cursor = 'text'
        }, () => {
            if (!this.focus) {
                this.borderColor = '#dcdfe6'
            }
        })
        this.tap((event) => {
            this.focus = true
            this.borderColor = '#409eff'
            // 鼠标位置插入光标
            if (event.clientX <= this.startPosition) {
                this.index = -1
            } else if (event.clientX >= this.endPosition) {
                this.index = this.value.length - 1
            } else {
                for (let i = 1; i < this.value.length; i++) {
                    let width = this.context.measureText(this.value.slice(0, i)).width
                    if (Math.abs(this.startPosition + width - event.clientX) < 7) {
                        this.index = i - 1
                        break
                    }
                }
            }
        })
        this.dblclick(() => {
            this.selected = { start: 0, end: this.array.length - 1}
        })
        this.mousedown((event) => {
            this.selecting = true
            this.selected = { start: -1, end: -1 }
            if (event.clientX <= this.startPosition) {
                this.selected.start = 0
            } else if (event.clientX >= this.endPosition) {
                this.selected.start = this.value.length -  1
            } else {
                for (let i = 1; i < this.value.length; i++) {
                    let width = this.context.measureText(this.value.slice(0, i)).width
                    if (Math.abs(this.startPosition + width - event.clientX) < 7) {
                        this.selected.start = i
                        break
                    }
                }
            }
        })
        this.mousemove((event) => {
            if (this.selecting) {
                if (event.clientX <= this.startPosition) {
                    if (this.selected.start > 0) {
                        this.selected.end = 0
                    }
                } else if (event.clientX >= this.endPosition) {
                    if (this.selected.start < this.value.length -  1) {
                        this.selected.end = this.value.length - 1
                    }
                } else {
                    for (let i = 1; i < this.value.length; i++) {
                        let width = this.context.measureText(this.value.slice(0, i)).width
                        if (Math.abs(this.startPosition + width - event.clientX) < 7) {
                            this.selected.end = i
                            break
                        }
                    }
                }
            }
        })
        this.mouseup(() => {
            this.selecting = false
        })
        document.addEventListener('click', (event) => {
            if (!(event.clientX >= this.layout.left &&
                event.clientX <= this.layout.right &&
                event.clientY >= this.layout.top &&
                event.clientY <= this.layout.bottom))
            {
                this.focus = false
                this.borderColor = '#dcdfe6'
                this.selected = { start: -1, end: -1 }
            }
        })
        document.addEventListener('keydown', (event) => {
            if (this.focus) {
                let key = event.key
                if (key === 'Backspace') {
                    // 必须用嵌套的写法, 如果是逻辑与运算的话, 后面还有可能满足外层 if
                    if (this.value !== '') {
                        if (this.selected.start !== -1 && this.selected.end !== -1) {
                            let start = Math.min(this.selected.start, this.selected.end)
                            let end = Math.max(this.selected.start, this.selected.end)
                            this.array.splice(start, end - start + 1)
                            this.index = start - 1
                            this.selected = { start: -1, end: -1}
                        } else {
                            this.array.splice(this.index, 1)
                            this.index -= 1
                        }
                    }
                } else if (key === 'ArrowLeft') {
                    if (this.index > -1) {
                        this.index -= 1
                    }
                } else if (key === 'ArrowRight') {
                    if (this.index < this.array.length - 1) {
                        this.index += 1
                    }
                } else if (event.metaKey || event.ctrlKey) {
                    if (key === 'c') {
                        navigator.clipboard.writeText(this.selectedValue)
                    } else if (key === 'v') {
                        navigator.clipboard.readText().then((text) => {
                            if (this.selected.start !== -1 && this.selected.end !== -1) {
                                let start = Math.min(this.selected.start, this.selected.end)
                                let deleteLength = Math.abs(this.selected.start, this.selected.end)
                                // 检查所粘贴内容是否超出输入框
                                let temp = this.array.slice(0)
                                temp.splice(start, deleteLength, ...text.split(''))
                                temp = temp.join('')
                                this.context.font = '14px sans-serif'
                                let width = this.context.measureText(temp).width
                                if (width >= parseInt(this.style['width'].value) - 30) {
                                    return
                                }
                                this.array.splice(start, deleteLength, ...text.split(''))
                                this.selected = { start: -1, end: -1 }
                                this.index -= deleteLength
                                this.index += text.length
                                this.vm[this.bind] = this.value
                            } else {
                                // 检查所粘贴内容是否超出输入框
                                let temp = this.array.slice(0)
                                temp.splice(this.index + 1, 0, ...text.split(''))
                                temp = temp.join('')
                                this.context.font = '14px sans-serif'
                                let width = this.context.measureText(temp).width
                                if (width >= parseInt(this.style['width'].value) - 30) {
                                    return
                                }
                                this.array.splice(this.index + 1, 0, ...text.split(''))
                                this.index += text.length
                                this.vm[this.bind] = this.value
                            }
                        })
                    } else if (key === 'x') {
                        navigator.clipboard.writeText(this.selectedValue)
                        let start = Math.min(this.selected.start, this.selected.end)
                        let end = Math.max(this.selected.start, this.selected.end)
                        this.array.splice(start, end - start + 1)
                        this.index = start - 1
                        this.selected = { start: -1, end: -1}
                    } else if (key === 'a') {
                        this.selected = { start: 0, end: this.array.length - 1}
                    }
                } else {
                    if (key === 'Enter' || key === 'Shift' || key === 'Alt') {
                        return
                    }
                    this.context.font = '14px sans-serif'
                    if (this.selected.start !== -1 && this.selected.end !== -1) {
                        let start = Math.min(this.selected.start, this.selected.end)
                        let end = Math.max(this.selected.start, this.selected.end)
                        this.array.splice(start, end - start + 1, key)
                        this.index = start
                        this.selected = { start: -1, end: -1}
                    } else {
                        let width = this.context.measureText(this.value).width
                        if (width >= parseInt(this.style['width'].value) - 30) {
                            return
                        }
                        this.index += 1
                        this.array.splice(this.index, 0, key)
                    }
                }
                this.vm[this.bind] = this.value
            }
        })
    }

    caretBlink() {
        setInterval(() => {
            if (this.focus) {
                if (this.caretColor === 'black') {
                    this.caretColor = 'white'
                } else {
                    this.caretColor = 'black'
                }
            }
        }, 700)
    }

    draw() {
        pen.reset()
        this.array = this.props.value.split('')
        // 边框
        let width = parseInt(this.style['width'].value)
        let height = parseInt(this.style['height'].value)
        pen.drawRect(this.layout.left, this.layout.top, width, height, 4)
        pen.stroke(this.borderColor)
        // 光标
        if (this.focus) {
            let x = this.caretPosition
            let startY = this.layout.top + 12
            let endY = this.layout.bottom - 12
            pen.drawLine(x, startY, x, endY, this.caretColor)
        }
        // 选中状态
        if (this.selected.start !== -1 && this.selected.end !== -1) {
            let start = Math.min(this.selected.start, this.selected.end)
            let end = Math.max(this.selected.start, this.selected.end)
            start = this.startPosition + this.context.measureText(this.value.slice(0, start)).width
            end = this.startPosition + this.context.measureText(this.value.slice(0, end + 1)).width
            pen.drawRect(start, this.layout.top, end - start, 38, 0)
            pen.fill('#b2d2fd')
        }
        // 输入的文字本身
        pen.drawText(this.value, this.startPosition, this.layout.top + 12, 14, '#606266')
        // hint
        if (this.array.length === 0) {
            if (this.props.hint) {
                pen.drawText(this.props.hint, this.startPosition, this.layout.top + 12, 14, '#dcdfe6')
            }
        }
    }
}


class RadioComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.firstDraw = true
        this.checked = false
        this.borderColor = '#dcdfe6'
        this.registerEvent()
    }

    static group = {}

    setBox() {
        this.context.font = '14px sans-serif'
        let labelWidth = this.context.measureText(this.props.label).width
        this.style['width'] = {
            value: `${26 + labelWidth}px`,
        }
        this.style['height'] = {
            value: '16px',
        }
    }

    registerEvent() {
        this.tap(() => {
            for (let item of RadioComponent.group[this.bind]) {
                item.checked = false
            }
            this.checked = true
            this.vm[this.bind] = this.props.option
        })
        this.hover(() => {
            this.borderColor = '#409eff'
            document.body.style.cursor = 'pointer'
        }, () => {
            this.borderColor = '#dcdfe6'
        })
    }

    draw() {
        pen.reset()
        if (this.firstDraw) {
            this.firstDraw = false
            if (this.props.value === this.props.option) {
                this.checked = true
            }
            if (RadioComponent.group[this.bind]) {
                RadioComponent.group[this.bind].push(this)
            } else {
                RadioComponent.group[this.bind] = [this]
            }
        }
        // 选择框
        let x = this.layout.left + 8
        let y = this.layout.top + 8
        pen.drawCircle(x, y, 8)
        pen.fill('white')
        pen.stroke(this.borderColor)
        if (this.checked) {
            pen.drawCircle(x, y, 5)
            pen.stroke('#409eff', 5)
        }
        // 文字
        pen.drawText(this.props.label, this.layout.left + 26, this.layout.top + 1, 14, '#606266')
    }
}


class SelectComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.firstDraw = true
        this.options = []
        this.selected = ''
        this.show = false
        this.optionPositions = []
        this.borderColor = '#dcdfe6'
        this.registerEvent()
    }

    setBox() {
        this.style['width'] = {
            value: '240px',
        }
        this.style['height'] = {
            value: '40px',
        }
    }

    registerEvent() {
        this.hover(() => {
            if (!this.show) {
                this.borderColor = '#c0c4cc'
            }
        }, () => {
            if (!this.show) {
                this.borderColor = '#dcdfe6'
            }
        })
        this.tap(() => {
            this.borderColor = '#409eff'
            this.show = !this.show
        })
        this.hover(() => {
            document.body.style.cursor = 'pointer'
        })
        document.addEventListener('mousemove', (event) => {
            if (this.show) {
                for (let item of this.optionPositions) {
                    if (event.clientX >= this.layout.left &&
                        event.clientX <= this.layout.right &&
                        event.clientY >= this.layout.bottom + item.top &&
                        event.clientY <= this.layout.bottom + item.bottom)
                    {
                        item.selected = true
                        document.body.style.cursor = 'pointer'
                    } else {
                        item.selected = false
                    }
                }
            }
        })
        document.addEventListener('click', (event) => {
            if (this.show) {
                for (let i = 0; i < this.optionPositions.length; i++) {
                    let item = this.optionPositions[i]
                    if (event.clientX >= this.layout.left &&
                        event.clientX <= this.layout.right &&
                        event.clientY >= this.layout.bottom + item.top &&
                        event.clientY <= this.layout.bottom + item.bottom)
                    {
                        this.selected = this.options[i]
                        this.vm[this.bind] = this.selected
                        this.show = false
                        this.borderColor = '#dcdfe6'
                    }
                }
            }
        })
    }

    draw() {
        pen.reset()
        if (this.firstDraw) {
            this.firstDraw = false
            for (let item of this.props.options) {
                if (item === this.props.value) {
                    this.selected = item
                }
            }
            this.options = this.props.options
            for (let i = 0; i < this.options.length; i++) {
                let top = 12 + i * 36 + 6
                let bottom = top + 36
                this.optionPositions.push({
                    top: top,
                    bottom: bottom,
                    selected: false,
                })
            }
        }
        // 边框
        pen.drawRect(this.layout.left, this.layout.top, 240, 40, 4)
        pen.stroke(this.borderColor)
        // 箭头
        pen.drawText('▽', this.layout.right - 30, this.layout.top + 12, 14, '#c0c4cc')
        if (this.show) {
            // 菜单背景
            let width = parseInt(this.style['width'].value)
            let height = this.options.length * 36 + 15
            pen.drawRect(this.layout.left, this.layout.bottom + 12, width, height, 4)
            pen.stroke('#e4e7ed')
            pen.fill('white')
            pen.drawText('△', this.layout.left + 35, this.layout.bottom + 2, 12, '#e4e7ed')
            // 菜单内容
            for (let i = 0; i < this.options.length; i++) {
                let item = this.optionPositions[i]
                if (item.selected) {
                    pen.drawRect(this.layout.left, this.layout.bottom + item.top, 240, 40, 0)
                    pen.fill('#f5f7fa')
                }
                pen.drawText(this.options[i], this.layout.left + 20, this.layout.bottom + item.top + 10, 16, '#606266')
            }
        }
        if (this.selected) {
            // 选定内容
            pen.drawText(this.selected, this.layout.left + 16, this.layout.top + 11, 16, '#606266')
        } else {
            // 提示文字
            pen.drawText('Select', this.layout.left + 16, this.layout.top + 11, 16, '#b9bcc5')
        }
    }
}


class SliderComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.firstDraw = true,
        this.value = 0
        this.block = {
            mousedown: false,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            offsetX: 0,
        }
        this.registerEvent()
    }

    setBox() {
        this.style['width'] = this.style['width'] ?? {
            value: '300px',
        }
        this.style['height'] = {
            value: '20px',
        }
    }

    drag() {
        document.addEventListener('panstart', (event) => {
            if (event.detail.startX >= this.block.left &&
                event.detail.startX <= this.block.right &&
                event.detail.startY >= this.block.top &&
                event.detail.startY <= this.block.bottom)
            {
                this.block.mousedown = true
                this.block.offsetX = event.detail.startX - this.block.left
                document.body.style.cursor = 'grabbing'
            }
        })
        document.addEventListener('panmove', (event) => {
            if (this.block.mousedown){
                let left = event.detail.clientX - this.block.offsetX
                if (left < this.layout.left) {
                    left = this.layout.left
                } else if (left > this.layout.right - 20) {
                    left = this.layout.right - 20
                }
                this.block.left = left
                this.block.right = this.block.left + 20
                this.value = Math.floor((this.block.left - this.layout.left) / (this.layout.right - this.layout.left - 20) * 100)
                this.vm[this.bind] = this.value
                document.body.style.cursor = 'grabbing'
            }
        })
        document.addEventListener('panend', (event) => {
            this.block.mousedown = false
            document.body.style.cursor = 'grab'
        })
    }

    registerEvent() {
        this.drag()
        document.addEventListener('mousemove', (event) => {
            if (event.clientX >= this.block.left &&
                event.clientX <= this.block.right &&
                event.clientY >= this.block.top &&
                event.clientY <= this.block.bottom)
            {
                document.body.style.cursor = 'grab'
            }
        })
    }

    draw() {
        pen.reset()
        if (this.firstDraw) {
            this.firstDraw = false
            if (this.props.value) {
                this.value = Number(this.props.value)
            }
        }
        // 滑条
        let width = parseInt(this.style['width'].value) - 20
        let height = 6
        pen.drawRect(this.layout.left + 10, this.layout.top + 7, width, height, 3)
        pen.fill('#e4e7ed')
        // 滑块
        this.block.left = this.layout.left + (this.layout.right - this.layout.left - 20) / 100 * this.value
        this.block.right = this.block.left + 20
        this.block.top = this.layout.top
        this.block.bottom = this.layout.bottom
        let x = this.block.left + 10
        let y = this.layout.top + 10
        pen.drawCircle(x, y, 10)
        pen.fill('white')
        pen.stroke('#409eff', 2)
        // 文字
        if (this.block.mousedown) {
            pen.drawText(this.value, x, y - 6, 12, '#409eff', 'center')
        }
    }
}


class SwitchComponent extends Component {
    constructor(template, context) {
        super(template, context)
        this.firstDraw = true
        this.value = true
        this.registerEvent()
    }

    get backgroundColor() {
        return this.value ? '#49c45c' : '#dcdfe6'
    }

    setBox() {
        this.style['width'] = {
            value: '40px',
        }
        this.style['height'] = {
            value: '20px',
        }
    }

    registerEvent() {
        this.tap(() => {
            this.value = !this.value
            this.vm[this.bind] = this.value
        })
        this.hover(() => {
            document.body.style.cursor = 'pointer'
        })
    }

    draw() {
        pen.reset()
        if (this.firstDraw) {
            this.firstDraw = false
            // 因为传入的属性值为字符串类型, 而不是布尔类型, 所以需要进一步判断
            this.value = {
                'true': true,
                'false': false,
            }[this.props.value]
        }
        // 背景
        pen.drawRect(this.layout.left, this.layout.top, 40, 20, 10)
        pen.fill(this.backgroundColor)
        // 滑块
        let x = this.layout.right - 10
        let y = this.layout.top + 10
        if (!this.value) {
            x = this.layout.left + 10
        }
        pen.drawCircle(x, y, 8)
        pen.fill('white')
    }
}


class TemplateComponent extends Component {
    constructor(template, context) {
        super(template, context)
    }

    setBox() {
    }

    draw() {
        pen.reset()
        let x = this.layout.left
        let y = this.layout.top
        let width = this.layout.width
        let height = this.layout.height
        pen.drawRect(x, y, width, height, 0)
    }
}


class TextComponent extends Component {
    constructor(template, context) {
        super(template, context)
    }

    setBox() {
        this.context.font = `${this.style['font-size']?.value ?? '16px'} sans-serif`
        this.style['width'] = {
            value: this.context.measureText(this.props.content).width + 'px',
        }
        this.style['height'] = {
            value: this.style['font-size']?.value ?? '16px',
        }
    }

    draw() {
        pen.reset()
        let fontSize = parseInt(this.style['font-size']?.value ?? 16)
        let fontColor = this.style['color']?.value ?? 'black'
        pen.drawText(this.props.content, this.layout.left, this.layout.top, fontSize, fontColor)
    }
}


function construct(template, context) {
    return traverse(template)

    function traverse(template, parent=null) {
        let componentObj = new ({
            button: ButtonComponent,
            checkbox: CheckboxComponent,
            color: ColorComponent,
            div: DivComponent,
            image: ImageComponent,
            input: InputComponent,
            radio: RadioComponent,
            select: SelectComponent,
            slider: SliderComponent,
            switch: SwitchComponent,
            template: TemplateComponent,
            text: TextComponent,
        }[template.tagName] ?? CustomComponent)(template, context)
        if (parent) {
            componentObj.parent = parent
        }
        for (let child of template.children) {
            componentObj.children.push(traverse(child, componentObj))
        }
        return componentObj
    }
}


/*
派发的事件及相应属性:
    通用的
        start: clientX, clientY
        cancel: clientX, clientY
    轻点(Tap)
        tap: clientX, clientY
    长按(Press)
        pressstart: clientX, clientY
        pressend: clientX, clientY
        presscancel
    拖动(Pan)
        panstart: startX, startY, clientX, clientY
        panmove: startX, startY, clientX, clientY
        panend: startX, startY, clientX, clientY, speed, isSwipe
    轻扫(Swipe)
        swipe: startX, startY, clientX, clientY, speed
*/
class Gesture {
    constructor() {
        this.contexts = {}
        if ('ontouchstart' in document) {
            this.listenTouch()
        } else {
            this.listenMouse()
        }
    }

    listenTouch() {
        document.addEventListener('touchstart', (event) => {
            for (let touch of event.changedTouches) {
                this.contexts[touch.identifier] = {}
                this.start(touch, this.contexts[touch.identifier])
            }
        })
        document.addEventListener('touchmove', (event) => {
            for (let touch of event.changedTouches) {
                this.move(touch, this.contexts[touch.identifier])
            }
        })
        document.addEventListener('touchend', (event) => {
            for (let touch of event.changedTouches) {
                this.end(touch, this.contexts[touch.identifier])
                delete this.contexts[touch.identifier]
            }
        })
        document.addEventListener('touchcancel', (event) => {
            for (let touch of event.changedTouches) {
                this.cancel(touch, this.contexts[touch.identifier])
                delete this.contexts[touch.identifier]
            }
        })
    }

    listenMouse() {
        document.addEventListener('mousedown', (event) => {
            this.contexts['mouse'] = {}
            this.start(event, this.contexts['mouse'])
            let mousemove = (event) => {
                this.move(event, this.contexts['mouse'])
            }
            let mouseup = (event) => {
                this.end(event, this.contexts['mouse'])
                document.removeEventListener('mousemove', mousemove)
                document.removeEventListener('mouseup', mouseup)
            }
            document.addEventListener('mousemove', mousemove)
            document.addEventListener('mouseup', mouseup)
        })
    }

    start(point, context) {
        document.dispatchEvent(new CustomEvent('start', {
            detail: {
                clientX: point.clientX,
                clientY: point.clientY,
            }
        }))
        context.startX = point.clientX
        context.startY = point.clientY
        context.moves = []
        context.action = 'tap'
        context.timeoutHandler = setTimeout(() => {
            if (context.action === 'pan') {
                return
            }
            context.action = 'press'
            document.dispatchEvent(new CustomEvent('pressstart', {
                detail: {
                    clientX: point.clientX,
                    clientY: point.clientY,
                }
            }))
        }, 500)
    }

    move(point, context) {
        let offsetX = point.clientX - context.startX
        let offsetY = point.clientY - context.startY
        if (context.action !== 'pan' && offsetX ** 2 + offsetY ** 2 > 100) {
            if (context.action === 'press') {
                document.dispatchEvent(new CustomEvent('presscancel'))
            }
            context.action = 'pan'
            document.dispatchEvent(new CustomEvent('panstart', {
                detail: {
                    startX: context.startX,
                    startY: context.startY,
                    clientX: point.clientX,
                    clientY: point.clientY,
                }
            }))
        }
        if (context.action === 'pan') {
            context.moves.push({
                clientX: point.clientX,
                clientY: point.clientY,
                time: Date.now(),
            })
            context.moves = context.moves.filter(move => Date.now() - move.time < 300)
            document.dispatchEvent(new CustomEvent('panmove', {
                detail: {
                    startX: context.startX,
                    startY: context.startY,
                    clientX: point.clientX,
                    clientY: point.clientY,
                }
            }))
        }
    }

    end(point, context) {
        clearTimeout(context.timeoutHandler)
        if (context.action === 'tap') {
            document.dispatchEvent(new CustomEvent('tap', {
                detail: {
                    clientX: point.clientX,
                    clientY: point.clientY,
                }
            }))
        } else if (context.action === 'press') {
            document.dispatchEvent(new CustomEvent('pressend', {
                detail: {
                    clientX: point.clientX,
                    clientY: point.clientY,
                }
            }))
        } else if (context.action === 'pan') {
            let move = context.moves[0]
            let speed = Math.sqrt((point.clientX - move.clientX) ** 2 + (point.clientY - move.clientY) ** 2) / (Date.now() - move.time)
            let isSwipe = speed > 1.5
            document.dispatchEvent(new CustomEvent('panend', {
                detail: {
                    startX: context.startX,
                    startY: context.startY,
                    clientX: point.clientX,
                    clientY: point.clientY,
                    speed: speed,
                    isSwipe: isSwipe,
                }
            }))
            if (isSwipe) {
                document.dispatchEvent(new CustomEvent('swipe', {
                    detail: {
                        startX: context.startX,
                        startY: context.startY,
                        clientX: point.clientX,
                        clientY: point.clientY,
                        speed: speed,
                    }
                }))
            }
        }
    }

    cancel(point, context) {
        clearTimeout(context.timeoutHandler)
        document.dispatchEvent(new CustomEvent('cancel', {
            detail: {
                clientX: point.clientX,
                clientY: point.clientY,
            }
        }))
    }
}


new Gesture()


function layout(component, root) {
    // root 用于标记是从根节点开始重排, 还是在排版过程中子组件在递归调用 layout()
    let mainSize = ''      // 'width' | 'height'
    let mainStart = ''     // 'left' | 'right' | 'top' | 'bottom'
    let mainEnd = ''       // 'left' | 'right' | 'top' | 'bottom'
    let mainSign = 0       // +1 | -1
    let mainBase = 0       // 0 | style.width | style.height
    let crossSize = ''     // 'width' | 'height'
    let crossStart = ''    // 'left' | 'right' | 'top' | 'bottom'
    let crossEnd = ''      // 'left' | 'right' | 'top' | 'bottom'
    let crossSign = 0      // +1 | -1
    let crossBase = 0      // 0 | style.width | style.height
    let children = []
    let flexLines = []

    main()

    function main() {
        if (component.children.length === 0) {
            return
        }
        setup(component)    // 设置组件的 layout.width 和 layout.height (即整个盒模型最外层的宽高)
        setDefaultValue()   // 对于没有显式设置的 flex 相关的属性, 设置默认值
        setRuler()          // 根据 flex-direction 设置相应的尺度
        setChildren()       // 设置子组件的 layout.width 和 layout.height, 并按 order 排序
        splitLine()         // 分行(准确地说, 应该是分主轴)
        computeMainAxis()   // 计算主轴
        computeCrossAxis()  // 计算交叉轴
        for (let child of component.children) {
            layout(child)
        }
    }

    function setup(component) {
        // 因为默认为 border-box, 所以 width 包含 border 和 padding
        if (root) {
            // 从根组件重排的情况
            component.layout.width = parseInt(component.style.width?.value ?? 0) + parseInt(component.style.margin?.value ?? 0) * 2
            component.layout.height = parseInt(component.style.height?.value ?? 0) + parseInt(component.style.margin?.value ?? 0) * 2
        } else {
            // 递归调用的情况
            let width = parseInt(component.style.width?.value ?? 0) + parseInt(component.style.margin?.value ?? 0) * 2
            let height = parseInt(component.style.height?.value ?? 0) + parseInt(component.style.margin?.value ?? 0) * 2
            // 当 width, height 为 0 时, 取之前已经计算的 layout 的宽高 (layout 的宽高可能是因为组件具有 flex 属性而被 computeFlexLine 计算出来的)
            // 当 width, height 不为 0 时, 可能是显式设定的固定值, 也可能是 props 的数据改变进而改变了 style
            if (width === 0 && height === 0) {
                width = component.layout.width ?? 0
                height = component.layout.height ?? 0
            }
            component.layout.width = width
            component.layout.height = height
        }
    }

    function setDefaultValue() {
        let style = component.style
        style['justify-content'] = style['justify-content'] ?? { value: 'flex-start' }
        style['align-items'] = style['align-items'] ?? { value: 'stretch' }
        style['flex-direction'] = style['flex-direction'] ?? { value: 'row' }
        style['flex-wrap'] = style['flex-wrap'] ?? { value: 'nowrap' }
        style['align-content'] = style['align-content'] ?? { value: 'stretch' }
        if (style['flex-flow']) {
            style['flex-direction'] = { value: style['flex-flow'].value.split(' ')[0] }
            style['flex-wrap'] = { value: style['flex-flow'].value.split(' ')[1] }
        }
    }

    function setRuler() {
        let style = component.style
        let layout = component.layout
        if (style['flex-direction'].value === 'row') {
            mainSize = 'width'
            mainStart = 'left'
            mainEnd = 'right'
            mainSign = +1
            mainBase = (layout.left ?? 0) + parseInt(style.margin?.value ?? 0) + parseInt(style.border?.value.split(' ')[0] ?? 0) + parseInt(style.padding?.value ?? 0)

            crossSize = 'height'
            crossStart = 'top'
            crossEnd = 'bottom'
            crossSign = +1
            crossBase = (layout.top ?? 0) + parseInt(style.margin?.value ?? 0) + parseInt(style.border?.value.split(' ')[0] ?? 0) + parseInt(style.padding?.value ?? 0)
        } else if (style['flex-direction'].value === 'row-reverse') {
            mainSize = 'width'
            mainStart = 'right'
            mainEnd = 'left'
            mainSign = -1
            mainBase = (layout.right ?? layout.width) - parseInt(style.margin?.value ?? 0) - parseInt(style.border?.value.split(' ')[0] ?? 0) - parseInt(style.padding?.value ?? 0)

            crossSize = 'height'
            crossStart = 'top'
            crossEnd = 'bottom'
            crossSign = +1
            crossBase = (layout.top ?? 0) + parseInt(style.margin?.value ?? 0) + parseInt(style.border?.value.split(' ')[0] ?? 0) + parseInt(style.padding?.value ?? 0)
        } else if (style['flex-direction'].value === 'column') {
            mainSize = 'height'
            mainStart = 'top'
            mainEnd = 'bottom'
            mainSign = +1
            mainBase = (layout.top ?? 0) + parseInt(style.margin?.value ?? 0) + parseInt(style.border?.value.split(' ')[0] ?? 0) + parseInt(style.padding?.value ?? 0)

            crossSize = 'width'
            crossStart = 'left'
            crossEnd = 'right'
            crossSign = +1
            crossBase = (layout.left ?? 0) + parseInt(style.margin?.value ?? 0) + parseInt(style.border?.value.split(' ')[0] ?? 0) + parseInt(style.padding?.value ?? 0)
        } else if (style['flex-direction'].value === 'column-reverse') {
            mainSize = 'height'
            mainStart = 'bottom'
            mainEnd = 'top'
            mainSign = -1
            mainBase = (layout.bottom ?? layout.height) - parseInt(style.margin?.value ?? 0) - parseInt(style.border?.value.split(' ')[0] ?? 0) - parseInt(style.padding?.value ?? 0)

            crossSize = 'width'
            crossStart = 'left'
            crossEnd = 'right'
            crossSign = +1
            crossBase = (layout.left ?? 0) + parseInt(style.margin?.value ?? 0) + parseInt(style.border?.value.split(' ')[0] ?? 0) + parseInt(style.padding?.value ?? 0)
        }

        if (style['flex-wrap'].value === 'wrap-reverse') {
            [crossStart, crossEnd] = [crossEnd, crossStart]
            crossSign = -1
            crossBase = {
                'row': (layout.bottom ?? layout.height) - parseInt(style.margin?.value ?? 0) - parseInt(style.border?.value.split(' ')[0] ?? 0) - parseInt(style.padding?.value ?? 0),
                'row-reverse': (layout.bottom ?? layout.height) - parseInt(style.margin?.value ?? 0) - parseInt(style.border?.value.split(' ')[0] ?? 0) - parseInt(style.padding?.value ?? 0),
                'column': (layout.right ?? layout.width) - parseInt(style.margin?.value ?? 0) - parseInt(style.border?.value.split(' ')[0] ?? 0) - parseInt(style.padding?.value ?? 0),
                'column-reverse': (layout.right ?? layout.width) - parseInt(style.margin?.value ?? 0) - parseInt(style.border?.value.split(' ')[0] ?? 0) - parseInt(style.padding?.value ?? 0),
            }[style['flex-direction'].value]
        }
    }

    function setChildren() {
        for (let child of component.children) {
            setup(child)
            children.push(child)
        }
        children.sort((a, b) => {
            return (a.style.order?.value ?? 0) - (b.style.order?.value ?? 0)
        })
    }

    function createLine() {
        let newLine = []
        let margin = parseInt(component.style.margin?.value ?? 0)
        let border = parseInt(component.style.border?.value.split(' ')[0] ?? 0)
        let padding = parseInt(component.style.padding?.value ?? 0)
        newLine.mainSpace = component.layout[mainSize] - margin * 2 - border * 2 - padding * 2
        newLine.crossSpace = 0
        flexLines.push(newLine)
        return newLine
    }

    function splitLine() {
        let newLine = createLine()
        let style = component.style
        let layout = component.layout
        for (let child of children) {
            let childStyle = child.style
            let childLayout = child.layout
            if (childStyle['flex']) {
                // flex 属性意味着可伸缩, 无论剩余多少尺寸都能放进去
                newLine.push(child)
                newLine.crossSpace = Math.max(newLine.crossSpace, childLayout[crossSize])
            } else if (style['flex-wrap'].value === 'nowrap') {
                // 强行在一行中塞入全部元素
                newLine.push(child)
                newLine.mainSpace -= childLayout[mainSize]
                newLine.crossSpace = Math.max(newLine.crossSpace, childLayout[crossSize])
            } else {
                // 如果元素超过容器, 则压缩到容器大小
                let containerWidth = layout[mainSize] - parseInt(style.margin?.value ?? 0) * 2 - parseInt(style.border?.value.split(' ')[0] ?? 0) * 2 - parseInt(style.padding?.value ?? 0) * 2
                childLayout[mainSize] = Math.min(childLayout[mainSize], containerWidth)
                // 分行
                if (newLine.mainSpace < childLayout[mainSize]) {
                    newLine = createLine()
                }
                // 将元素收入行内
                newLine.push(child)
                newLine.mainSpace -= childLayout[mainSize]
                newLine.crossSpace = Math.max(newLine.crossSpace, childLayout[crossSize])
            }
        }
    }

    function computeFlexLine(line, flexTotal) {
        let currentMain = mainBase
        for (let child of line) {
            if (child.style['flex']) {
                child.layout[mainSize] = parseInt(child.style['flex'].value) / flexTotal * line.mainSpace
            }
            child.layout[mainStart] = currentMain
            child.layout[mainEnd] = currentMain + mainSign * child.layout[mainSize]
            currentMain = child.layout[mainEnd]
        }
    }

    function computeNotFlexLine(line) {
        let style = component.style
        let currentMain = mainBase
        let space = 0
        if (style['justify-content'].value === 'flex-start') {
            currentMain = mainBase
            space = 0
        } else if (style['justify-content'].value === 'flex-end') {
            currentMain = mainBase + mainSign * line.mainSpace
            space = 0
        } else if (style['justify-content'].value === 'center') {
            currentMain = mainBase + mainSign * line.mainSpace / 2
            space = 0
        } else if (style['justify-content'].value === 'space-between') {
            currentMain = mainBase
            space = mainSign * line.mainSpace / (line.length - 1)
        } else if (style['justify-content'].value === 'space-around') {
            currentMain = mainBase + mainSign * line.mainSpace / line.length / 2
            space = mainSign * line.mainSpace / line.length
        }
        for (let child of line) {
            let childLayout = child.layout
            childLayout[mainStart] = currentMain
            childLayout[mainEnd] = currentMain + mainSign * childLayout[mainSize]
            currentMain = childLayout[mainEnd] + space
        }
    }

    function computeNegativeSpaceLine(line) {
        let layout = component.layout
        let scale = layout[mainSize] / (layout[mainSize] + (-line.mainSpace))
        let currentMain = mainBase
        for (let child of line) {
            let childLayout = child.layout
            if (child.style['flex']) {
                // 将有 flex 属性的元素压缩到 0
                childLayout[mainSize] = 0
            }
            childLayout[mainSize] *= scale
            childLayout[mainStart] = currentMain
            childLayout[mainEnd] = currentMain + mainSign * childLayout[mainSize]
            currentMain = childLayout[mainEnd]
        }
    }

    function computeMainAxis() {
        for (let line of flexLines) {
            if (line.mainSpace >= 0) {
                let flexTotal = 0
                for (let child of line) {
                    flexTotal += parseInt(child.style['flex']?.value ?? 0)
                }
                if (flexTotal > 0) {
                    // 含有 [有 flex 属性的元素] 的行
                    computeFlexLine(line, flexTotal)
                } else {
                    // 没有 [有 flex 属性的元素] 的行
                    computeNotFlexLine(line)
                }
            } else {
                // 剩余空间为负, 说明 [flex-wrap: nowrap], 等比压缩不含有 flex 元素的属性
                computeNegativeSpaceLine(line)
            }
        }
    }

    function computeCrossAxis() {
        // 根据 align-content align-items align-self 确定元素位置
        let style = component.style
        let layout = component.layout
        // 如果交叉轴没有设置, 则自动撑开交叉轴
        if (layout[crossSize] === 0) {
            for (let line of flexLines) {
                layout[crossSize] += line.crossSpace
            }
            layout[crossSize] += parseInt(style.padding?.value ?? 0) * 2 + parseInt(style.border?.value.split(' ')[0] ?? 0) * 2 + parseInt(style.margin?.value ?? 0) * 2
        }
        // 计算交叉轴总空白
        let crossSpaceTotal = layout[crossSize] - parseInt(style.margin?.value ?? 0) * 2 - parseInt(style.border?.value.split(' ')[0] ?? 0) * 2 - parseInt(style.padding?.value ?? 0) * 2
        for (let line of flexLines) {
            crossSpaceTotal -= line.crossSpace
        }
        // 确定每一条主轴位于整个容器的交叉轴的位置
        let currentCross = crossBase
        let space = 0
        if (style['align-content'].value === 'flex-start') {
            currentCross = crossBase
            space = 0
        } else if (style['align-content'].value === 'flex-end') {
            currentCross = crossBase + crossSign * crossSpaceTotal
            space = 0
        } else if (style['align-content'].value === 'center') {
            currentCross = crossBase + crossSign * crossSpaceTotal / 2
            space = 0
        } else if (style['align-content'].value === 'space-between') {
            currentCross = crossBase
            space = crossSign * crossSpaceTotal / (flexLines.length - 1)
        } else if (style['align-content'].value === 'space-around') {
            currentCross = crossBase + crossSign * crossSpaceTotal / flexLines.length / 2
            space = crossSign * crossSpaceTotal / flexLines.length
        } else if (style['align-content'].value === 'stretch') {
            currentCross = crossBase
            space = 0
        }
        // 确定每个元素的具体位置
        for (let line of flexLines) {
            let lineCrossSize = line.crossSpace
            if (style['align-content'].value === 'stretch') {
                // 平分剩余的空白空间, 拉伸填满
                lineCrossSize = line.crossSpace + crossSpaceTotal / flexLines.length
            }
            for (let child of line) {
                let childLayout = child.layout
                let align = child.style['align-self']?.value || style['align-items'].value
                if (align === 'stretch') {
                    childLayout[crossStart] = currentCross
                    childLayout[crossSize] = childLayout[crossSize] || lineCrossSize
                    childLayout[crossEnd] = childLayout[crossStart] + crossSign * childLayout[crossSize]
                } else if (align === 'flex-start') {
                    childLayout[crossStart] = currentCross
                    childLayout[crossEnd] = childLayout[crossStart] + crossSign * childLayout[crossSize]
                } else if (align === 'flex-end') {
                    childLayout[crossStart] = currentCross + crossSign * lineCrossSize - crossSign * childLayout[crossSize]
                    childLayout[crossEnd] = childLayout[crossStart] + crossSign * childLayout[crossSize]
                } else if (align === 'center') {
                    childLayout[crossStart] = currentCross + crossSign * (lineCrossSize - childLayout[crossSize]) / 2
                    childLayout[crossEnd] = childLayout[crossStart] + crossSign * childLayout[crossSize]
                }
            }
            currentCross += crossSign * lineCrossSize + space
        }
    }
}


function loadImage(component) {
    if (component instanceof ImageComponent) {
        component.image = new Image()
        component.image.src = component.props.path
    }
    for (let child of component.children) {
        loadImage(child)
    }
}


const components = {}

function main() {
    // 创建 Canvas, 获取 context, pen 设置 context
    let canvas = new Canvas()
    pen.setContext(canvas.context)

    // 遍历 componentJson, 转换为若干 Component 对象, 并挂在 components 上
    for (let [key, value] of Object.entries(componentJson)) {
        let { style, template, script } = value
        let component = construct(template, canvas.context)
        bindData(component, style, script)
        components[key] = component
    }

    // 根组件
    let rootComponent = components.main

    // 挂载子组件
    mountChildren(rootComponent)

    // 如果 dpr 不为 1, 需要缩放 canvas. 但其 style 的宽高始终和视口是一致的.
    rootComponent.style['width'] = { value: canvas.canvas.style.width }
    rootComponent.style['height'] = { value: canvas.canvas.style.height }

    // 载入图片, 排版, 渲染
    loadImage(rootComponent)
    layout(rootComponent)
    canvas.launch(rootComponent)
}


function mountChildren(component) {
    for (let i = 0; i < component.children.length; i++) {
        if (component.children[i] instanceof CustomComponent) {
            component.children[i] = component.children[i].mount()
        }
        mountChildren(component.children[i])
    }
}


const pen = {
    context: null,
    setContext(context) {
        this.context = context
    },
    reset() {
        // 常用属性
        this.context.strokeStyle = 'black'
        this.context.fillStyle = 'white'
        this.context.lineWidth = 1
        this.context.lineCap = 'butt'
        this.context.setLineDash([])
        // 文字相关
        this.context.font = '14px sans-serif'
        this.context.textAlign = 'left'
        this.context.textBaseline = 'top'
        // 阴影相关
        this.context.shadowOffsetX = 0
        this.context.shadowOffsetY = 0
        this.context.shadowBlur = 0
        this.context.shadowColor = 'black'
    },
    stroke(color, lineWidth=1) {
        this.context.strokeStyle = color
        this.context.lineWidth = lineWidth
        this.context.stroke()
        this.context.lineWidth = 1
    },
    fill(color) {
        this.context.fillStyle = color
        this.context.fill()
    },
    // 需要手动 stroke 或 fill 的
    drawRect(x, y, width, height, radius, style='solid', lineWidth=1) {
        if (style === 'dotted') {
            this.context.setLineDash([lineWidth, lineWidth])
        } else if (style === 'dashed') {
            this.context.setLineDash([4 * lineWidth, 4 * lineWidth])
        } else {
            this.context.lineCap = 'square'
        }
        x += lineWidth / 2
        y += lineWidth / 2
        width -= lineWidth
        height -= lineWidth
        this.context.beginPath()
        this.context.moveTo(x, y + radius)
        this.context.lineTo(x, y + height - radius)
        this.context.quadraticCurveTo(x, y + height, x + radius, y + height)
        this.context.lineTo(x + width - radius, y + height)
        this.context.quadraticCurveTo(x + width, y + height, x + width, y + height - radius)
        this.context.lineTo(x + width, y + radius)
        this.context.quadraticCurveTo(x + width, y, x + width - radius, y)
        this.context.lineTo(x + radius, y)
        this.context.quadraticCurveTo(x, y, x, y + radius)
    },
    drawCircle(x, y, radius) {
        this.context.beginPath()
        this.context.arc(x, y, radius, 0, 2 * Math.PI)
    },
    // 无需手动 stroke 或 fill 的
    drawLine(startX, startY, endX, endY, color='black') {
        this.context.beginPath()
        this.context.moveTo(startX, startY)
        this.context.lineTo(endX, endY)
        this.context.strokeStyle = color
        this.context.stroke()
    },
    drawText(content, x, y, fontSize, fontColor, align='left') {
        this.context.font = `${fontSize}px sans-serif`
        this.context.fillStyle = fontColor
        this.context.textAlign = align
        this.context.fillText(content, x, y)
    },
    drawImage(image, x, y, width, height, radius=0) {
        if (radius !== 0) {
            this.context.save()
            this.context.beginPath()
            this.context.moveTo(x + radius, y)
            this.context.arcTo(x + width, y, x + width, y + height, radius)
            this.context.arcTo(x + width, y + height, x, y + height, radius)
            this.context.arcTo(x, y + height, x, y, radius)
            this.context.arcTo(x, y, x + width, y, radius)
            this.context.closePath()
            this.context.clip()
            this.context.drawImage(image, x, y, width, height)
            this.context.restore()
        } else {
            this.context.drawImage(image, x, y, width, height)
        }
    }
}


