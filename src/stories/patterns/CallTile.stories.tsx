import type { Meta, StoryObj } from '@storybook/react-vite'

import { CallTile } from '@winterop-com/sokkel-ui/CallTile'
import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { HARBOR_DUSK } from '../fixtures/photos'
import { pictureOf } from '../fixtures/portraits'

const meta: Meta = { title: 'Patterns/Call tile', parameters: { frame: 'padded' } }
export default meta

/** One person's tile: their picture centered and sized to the tile, their name at its foot. */
export const Picture: StoryObj = {
    render: () => (
        <Columns count={2} min="sm" gap="sm">
            <CallTile name="Grace Holm" image={pictureOf('grace')} />
        </Columns>
    ),
}

/** A muted microphone and a raised hand, marked before the name; a person with no picture wears their initials. */
export const Marks: StoryObj = {
    name: 'Muted and hand raised',
    render: () => (
        <Columns count={2} min="sm" gap="sm">
            <CallTile name="Linus Dahl" image={pictureOf('linus')} muted />
            <CallTile name="Margaret Lund" handRaised muted />
        </Columns>
    ),
}

/** The picture follows the tile: small tiles keep it at 64, a large one grows it toward 160. */
export const Sizes: StoryObj = {
    render: () => (
        <Columns count={4} min="xs" gap="sm">
            <CallTile name="Ada" image={pictureOf('ada')} />
            <CallTile name="Grace Holm" image={pictureOf('grace')} />
            <CallTile name="Linus Dahl" image={pictureOf('linus')} />
            <CallTile name="Margaret Lund" />
        </Columns>
    ),
}

/** Video fills the tile in place of the picture, the name still at its foot. */
export const Video: StoryObj = {
    render: () => (
        <Columns count={2} min="sm" gap="sm">
            <CallTile name="Grace Holm">
                <img src={HARBOR_DUSK} alt="" />
            </CallTile>
        </Columns>
    ),
}
