# Architectural Overview


## 1. Based on canvas
The underlying of CanvasUI relies on the HTML &lt;canvas&gt; element, which continuously clears/draws the canvas at a frequency of 60FPS (using requestAnimationFrame). The drawing process, at this level, can be seen as various drawLine / drawRect / fillColor and other operations.

## 2. Object Oriented abstraction
Next, CanvasUI abstracts the tedious drawing process and wraps it in various component objects (for example: ButtonComponent / InputComponent / ImageComponent, etc.), each object has its own box model, its own drawing method, and its own event.

## 3. Layout
After having the box model of each component, CanvasUI implements a complex layout engine to calculate the specific position of each component on the page, supporting Flex layout.

## 4. Declarative syntax
CanvasUI implements an XML Parser using a finite state machine, so that the user interface can be written using a simple declarative syntax, and the tags will be compiled into a component tree through Tokenization and Tree Construction.

## 5. MVVM
CanvasUI implements MVVM based on Proxy, and collects the corresponding dependencies in the getter. When the data changes and triggers the setter, the view will be automatically updated. The two-way binding of data can be achieved only through simple template syntax.
