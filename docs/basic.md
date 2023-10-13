# Basic

## &lt;script&gt;
Inside the `<script>`, you can declare `variables` and `functions` for the component, and finally put them in curly braces and return.
```html
<script>
let count = 0

function increment() {
    count += 1
}

return { count, increment }
</script>
```
The defined variable can be used in the component.
In `<template>`, use `value="{ count }"` to bind the variable named "count" just declared.
If this variable is changed, the value in the template will also be updated.

The declared function can be used to manipulate variables.
In `<template>`, it can be called when an event be dispatched.
For example, in the form of `@click="{ increment }"`, the function named "increment" will be called when the click event is dispatched.

In particular, there is a hook function named `init` that will be called after the component has been initialized.
If you want to perform some action at that time, you can call it and pass a callback function.

In each `<script>`, a variable named `component` is exposed, representing the current component object, which you may use when adding animation in the future.
```js
init(() => {
    console.log('component init done', component)
})
```


## &lt;template&gt;
The `<template>` is used to define the template of the component.
```html
<template>
    <button label="click { count } times" @click="{ increment }"></button>
</template>
```
Compared with HTML, template uses a stricter XML syntax to keep the code concise and consistent.
Therefore, all tags must have their corresponding closing tags, and prop values must be enclosed in double quotes.

All components support `id` and `class` props that can be selected by CSS selectors to style it.


## &lt;style&gt;
The `<style>` is used to define the style of the component, which is a subset of CSS.
```html
<style>
template {
    justify-content: center;
    align-items: center;
}
</style>
```
In each component's documentation, the styles it supports are described.

Note that:
- Flex is the default and only layout method, no need to write "display: flex;".
- The supported flex-related properties are: justify-content, align-items, flex-direction, flex-wrap, align-content, flex-flow, order.
- Naturally supports border-box, so `width` includes border and padding.
- CSS selectors support selection of A's direct child B in the form of `A B`.
