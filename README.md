# Obsidian Style Settings Plugin

This plugin allows snippet, theme, and plugin CSS files to define a dynamic set of configuration options. It then allows users to see all of the tweakable settings in one settings pane. It allows both toggling classes on and off the `body` element, as well as setting numeric, string, and color CSS variables.

Configurable settings are defined by a comment at the top of the CSS file. These comments must begin with `/* @settings` and contain YAML with `name`, `id`, and `settings` properties.

<img src="https://raw.githubusercontent.com/mgmeyers/obsidian-style-settings/main/screenshots/example01.png" alt="Example output of plugin" />

```css
/* @settings

name: Your Section Name Here
id: a-unique-id
settings:
    - 
        id: my-title
        title: My Settings
        type: heading
        level: 3
    - 
        id: accent
        title: Accent Color
        type: variable-color
        format: hsl-split
        default: '#007AFF'
    - 
        id: text
        title: UI font
        description: Font used for the user interface
        type: variable-text
        default: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif

*/
```

See [example.css](example.css) for a more detailed example taken from the [California Coast Theme](https://github.com/mgmeyers/obsidian-california-coast-theme).

Each setting definition must be separated by a dash (`-`). There are 7 setting types.

All settings definitions must have these parameters:

- `id`: A unique id for the setting parameter
- `title`: The name of the setting
- `description` (optional): a description of the setting
- `type`: The type of setting. Can be one of:
  - `heading`: a heading element for organizing settings
  - `class-toggle`: a switch to toggle classes on the `body` element
  - `variable-text`: a text-based CSS variable
  - `variable-number`: a numeric CSS variable
  - `variable-number-slider`: a numeric CSS variable represented by a slider
  - `variable-select`: a text-based CSS variable displayed as a dropdown menu of predefined options
  - `variable-color`: a color CSS variable with corresponding color picker

## `heading`

`heading`s can be used to organize and group settings, but do not add any functionality. Along with the required attributes, `heading`s must contain a `level` attribute:

```css
/* @settings

name: Your Section Name Here
id: a-unique-id
settings:
    - 
        id: this-is-a-heading
        title: My Heading
        type: heading
        level: 2

*/
```

## `class-toggle`

`class-toggle`s will toggle a css class on and off of the `body` element, allowing CSS themes and snippets to toggle features on and off. The `id` of the setting will be used as the class name.

```css
/* @settings

name: Your Section Name Here
id: a-unique-id
settings:
    - 
        id: my-css-class
        title: My Toggle
        description: Adds my-css-class to the body element
        type: class-toggle

*/
```

## `variable-text`

`variable-text` represents any text based CSS value. The `id` of the setting will be used as the variable name. `variable-text` settings require a `default` attribute.

```css
/* @settings

name: Your Section Name Here
id: a-unique-id
settings:
    - 
        id: text
        title: UI font
        description: Font used for the user interface
        type: variable-text
        default: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif

*/
```

This will output the variable:

```
--text: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
```

## `variable-number`

`variable-number` represents any numeric CSS value. The `id` of the setting will be used as the variable name. `variable-number` settings require a `default` attribute.

```css
/* @settings

name: Your Section Name Here
id: a-unique-id
settings:
    - 
        id: line-width
        title: Line width
        description: The maximum line width in rem units
        type: variable-number
        default: 42

*/
```

This will output the variable:

```
--line-width: 42;
```

## `variable-number-slider`

`variable-number-slider` represents any numeric CSS value. The `id` of the setting will be used as the variable name. `variable-number` settings require a `default` attribute, as well as these three attributes:

- `min`: The minimum possible value of the slider
- `max`: The maximum possible value of the slider
- `step`: The size of each "tick" of the slider. For example, a step of 100 will only allow the slider to move in increments of 100.

```css
/* @settings

name: Your Section Name Here
id: a-unique-id
settings:
    - 
        id: line-width
        title: Line width
        description: The maximum line width in rem units
        type: variable-number-slider
        default: 42
        min: 10
        max: 100
        step: 1

*/
```

This will output the variable:

```
--line-width: 42;
```

## `variable-select`

`variable-select` creates a dropdown of predefined options for a CSS variable. The `id` of the setting will be used as the variable name. `variable-select` settings require a `default` attribute as well as a list of `options`.

```css
/* @settings

name: Your Section Name Here
id: a-unique-id
settings:
    - 
        id: text
        title: UI font
        description: Font used for the user interface
        type: variable-select
        default: Roboto
        options:
            - Roboto
            - Helvetica Neue
            - sans-serif
            - Segoe UI

*/
```

This will output the variable:

```
--text: Roboto;
```

## `variable-color`

`variable-color` creates a color picker with a variety of formatting options. A `default` attribute is required in `hex` format. **Note: hex color values must be wrapped in quotes.** A `format` attribute is also required.

```css
/* @settings

name: Your Section Name Here
id: a-unique-id
settings:
    - 
        id: accent
        title: Accent Color
        type: variable-color
        format: hex
        default: '#007AFF'

*/
```

This will output the variable:

```
--accent: #007AFF;
```

### `variable-color` formatting options

There are 7 formatting options:

- `hex`

This will output the color in hex format:

```
--accent: #007AFF;
```

- `rgb`

This will output:

```
--accent: rgb(0, 122, 255);
```

- `rgb-values`

This will output:

```
--accent: 0, 122, 255;
```

- `rgb-split`

This will output:

```
--accent-r: 0;
--accent-g: 122;
--accent-b: 255;
```

- `hsl`

This will output:

```
--accent: hsl(211, 100%, 50%);
```

- `hsl-values`

This will output:

```
--accent: 211, 100%, 50%;
```

- `hsl-split`

This will output:

```
--accent-h: 211;
--accent-s: 100%;
--accent-l: 50%;
```