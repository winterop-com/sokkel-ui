import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { BarList } from '@winterop-com/sokkel-ui/BarList'
import { ImageAnnotations, type ImageBox } from '@winterop-com/sokkel-ui/ImageAnnotations'
import { Split } from '@winterop-com/sokkel-ui/Layout'
import { HARBOR_DUSK } from '../fixtures/photos'

/**
 * An image with boxes over it, each given in shares of the image's size, so the boxes hold at any
 * size the image is drawn. A box's tag carries its number, label and confidence.
 */
const meta: Meta = { title: 'Patterns/Image annotations', parameters: { frame: 'padded' } }
export default meta

const BOXES: ImageBox[] = [
    { id: 'boat-near', x: 0.14, y: 0.64, w: 0.17, h: 0.18, label: 'boat', confidence: 0.94 },
    { id: 'boat-far', x: 0.615, y: 0.72, w: 0.195, h: 0.165, label: 'boat', confidence: 0.88 },
    { id: 'sun', x: 0.625, y: 0.365, w: 0.2, h: 0.265, label: 'sun', confidence: 0.71 },
    { id: 'breakwater', x: 0.415, y: 0.605, w: 0.175, h: 0.065, label: 'breakwater', confidence: 0.46 },
]

/** Boxes with no tags, over an image as wide as its container. */
export const Plain: StoryObj = {
    render: () => (
        <ImageAnnotations
            src={HARBOR_DUSK}
            alt="A harbor at dusk"
            boxes={BOXES.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }))}
            className="max-w-xl"
        />
    ),
}

/** Each box numbered, with its label and its confidence. */
export const Tagged: StoryObj = {
    render: () => <ImageAnnotations src={HARBOR_DUSK} alt="A harbor at dusk" boxes={BOXES} numbered className="max-w-xl" />,
}

function Linked() {
    const [active, setActive] = useState<string | undefined>('boat-far')
    return (
        <Split
            width="md"
            aside={
                <BarList
                    label="Found"
                    items={BOXES.map((box, index) => ({
                        id: box.id,
                        label: `${String(index + 1)} ${box.label ?? ''}`,
                        value: box.confidence ?? 0,
                    }))}
                    active={active}
                    onActiveChange={setActive}
                />
            }
        >
            <ImageAnnotations src={HARBOR_DUSK} alt="A harbor at dusk" boxes={BOXES} numbered active={active} onActiveChange={setActive} />
        </Split>
    )
}

/** The boxes beside a list of what was found: the pointer over a box or its bar draws both as active. The far boat starts active. */
export const WithList: StoryObj = {
    name: 'With a list',
    render: () => <Linked />,
}
