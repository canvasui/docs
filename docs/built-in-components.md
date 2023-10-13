# Built-in components

## common
### Common prop of components
- All components support `id` and `class` props.
- The prop values of all components can be literal values or variables of the form `"{ xx }"`.
- All input components (e.g. &lt;input&gt;, &lt;checkbox&gt;, &lt;slider&gt;) can use `value="{ variable }"` to achieve two-way data binding.

### Common style of components
- All components can set the `order` property, which is used to set the order in flex layout.


## &lt;button&gt;
The `<button>` component is a button.
```html
<button label="Button" @click="{ reverse }"></button>
```
### supported props
- `label`: Set the text of the button.
- `@click`: Set the callback function when the button is clicked.


## &lt;checkbox&gt;
The `<checkbox>` component is a checkbox.
```html
<checkbox value="{ checked }" label="Checkbox"></checkbox>
```
### supported props
- `value`: Set the value of the checkbox, support two-way data binding.
- `label`: Set the text of the checkbox.


## &lt;color&gt;
The `<color>` component is a color picker that supports selecting 12 colors.
```html
<color value="{ colorValue }"></color>
```
### supported props
- `value`: Set the value of the color, support two-way data binding.


## &lt;div&gt;
The `<div>` component is a flex container, the box model can be applied to it, it can be nested.
```html
<div>
    <button label="Button" @click="{ reverse }"></button>
</div>
```
### supported CSS
- `width`, `height`: Set width and height (includes padding and border).
- `padding`: Set padding, only supports writting like `padding: length;`.
- `margin`: Set margin, only supports writting like `margin: length;`.
- `border`: Set the width / style / color of its border, only supports writting like `border: border-width border-style border-color;`.
- `border-radius`: Set round corners, only supports writting like `border-radius: length;`.
- `background`: Set background color.
- `justify-content`: Set how the main axis aligns components.
- `align-items`: Set how the cross axis aligns components.
- `flex-direction`: Set the direction of the components in the container.
- `flex-wrap`: Set whether to wrap.
- `align-content`: Set line spacing.
- `flex-flow`: Set both flex-direction and flex-wrap.


## &lt;image&gt;
The `<image>` component is an image.
```html
<image path="{ imagePath }"></image>
```
### supported props
- `path`: Set the path of the image resource.
### supported CSS
- `width`, `height`: Set the width and height of the image (in order to avoid the performance loss caused by reflow, CanvasUI requires that the width and height must be explicitly specified when using image).
- `border-radius`: Set round corners, only supports writting like `border-radius: length;`.


## &lt;input&gt;
The `<input>` component is a text input.
```html
<input value="{ name }" hint="Please input..."></input>
```
### supported features
- Keyboard input characters, delete characters, move the caret left and right.
- Insert caret at mouse position.
- Mouse drag and drop to select, double click to select all.
- copy (command-c), paste (command-c), cut (command-x), select all (command-a).
### supported props
- `value`: Set the value of the input, support two-way data binding.
- `hint`: Set the hint text of the input.
### supported CSS
- `width`: Set the width of the input.


## &lt;radio&gt;
The `<radio>` component is a radio button, which can group multiple radio buttons into a group.
```html
<radio value="{ radioValue }" label="Radio1" option="foo"></radio>
<radio value="{ radioValue }" label="Radio2" option="bar"></radio>
```
### supported props
- `value`: The value bound to the radio of the same group should point to the same data, support two-way data binding.
- `option`: Set the value of each radio button.
- `label`: Set the text of the radio.


## &lt;select&gt;
The `<select>` component is a dropdown menu.
```html
<select value="{ selectValue }" options="{ selectOptions }"></select>
```
### supported props
- `value`: Set the value of the select, support two-way data binding.
- `options`: Set options, which are bound to an array.


## &lt;slider&gt;
The `<slider>` component is a slider.
```html
<slider value="{ percent }"></slider>
```
### supported props
- `value`: Set the value of the slider, it should be a number between 0-100, support two-way data binding.
### supported CSS
- `width`: Set the width of the slider.


## &lt;switch&gt;
The `<switch>` component is a switch.
```html
<switch value="{ switchValue }"></switch>
```
### supported props
- `value`: Set the value of the switch, it should be a boolean value, support two-way data binding.


## &lt;text&gt;
The `<text>` component is text.
Unlike HTML, CanvasUI needs to use `<text>` tags to represent text in order to make the code more concise and consistent.
```html
<text class="hello" content="hello { name } !"></text>
```
### supported props
- `content`: Set the content of the text, which can be a mix of literal and template syntax.
### supported CSS
- `font-size`: Set font size.
- `color`: Set font color.
