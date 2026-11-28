import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ColorField, ColorPicker, type ColorSwatch } from '@winterop-com/sokkel-ui/ColorField'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { fromHsv } from '@winterop-com/sokkel-ui/lib/color-value'

/**
 * A color typed or picked: six or three hex digits after `#`, or `rgb(r, g, b)`, always kept as
 * `#rrggbb`, with a picker of saturation and brightness, hue and swatches behind its swatch.
 */
const meta: Meta = { title: 'Primitives/Inputs/Color field', parameters: { frame: 'column' } }
export default meta

/** Eight label colors around the hue circle, as a tag editor offers them. */
const SWATCHES: ColorSwatch[] = [
    { name: 'Red', h: 4 },
    { name: 'Orange', h: 28 },
    { name: 'Yellow', h: 48 },
    { name: 'Green', h: 140 },
    { name: 'Teal', h: 176 },
    { name: 'Blue', h: 212 },
    { name: 'Violet', h: 262 },
    { name: 'Pink', h: 326 },
].map(({ name, h }) => ({ name, value: fromHsv({ h, s: 0.7, v: 0.85 }) }))

/** A color with a value, an empty optional one, and a required one. Type text that is not a color and leave the field to see it said. */
export const Plain: StoryObj = {
    render: function Render() {
        const [color, setColor] = useState<string | null>(SWATCHES[5].value)
        return (
            <Stack gap="lg" className="max-w-sm">
                <ColorField id="plain-label" label="Label color" value={color} onValueChange={setColor} swatches={SWATCHES} />
                <ColorField id="plain-accent" label="Accent" help="Leave it empty to follow the theme." swatches={SWATCHES} />
                <ColorField id="plain-zone" label="Zone color" required defaultValue={SWATCHES[0].value} swatches={SWATCHES} />
            </Stack>
        )
    },
}

/** The picker open under its field. */
export const Open: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm">
            <ColorField id="open-label" label="Label color" defaultValue={SWATCHES[3].value} swatches={SWATCHES} defaultOpen />
        </Stack>
    ),
}

/** The picker on its own, as a settings panel holds it: drag the area or the hue, or focus the area and use the arrow keys. */
export const Picker: StoryObj = {
    render: function Render() {
        const [color, setColor] = useState(SWATCHES[6].value)
        return <ColorPicker value={color} onValueChange={setColor} swatches={SWATCHES} />
    },
}
