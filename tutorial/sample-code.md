# Sample code

```html
<script>
let count = 0

function increment() {
    count += 1
}

return { count, increment }
</script>

<template>
    <button label="click { count } times" @click="{ increment }"></button>
</template>

<style>
template {
    justify-content: center;
    align-items: center;
}
</style>
```
Each `.ui` file represents a component (the default `main.ui` file is generated in the `/src` directory, which is the root component of the component tree).
