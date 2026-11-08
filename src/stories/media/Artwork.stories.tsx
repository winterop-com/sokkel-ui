import type { Meta, StoryObj } from '@storybook/react-vite'

import { Columns } from '@winterop-com/sokkel-ui/Layout'
import { ARTWORK_MOTIFS, Artwork, type ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { HARBOR_DUSK } from '../fixtures/photos'

/**
 * A record's cover: its picture, or one drawn in the theme's hues, a gradient between two with a
 * motif over it, chosen from a stable seed such as the record's id.
 */
const meta: Meta = { title: 'Media/Artwork', parameters: { frame: 'padded' } }
export default meta

const COVERS: readonly ArtworkCover[] = [
    { motif: 'sun', from: 'amber', to: 'pink' },
    { motif: 'rings', from: 'teal', to: 'jade' },
    { motif: 'bands', from: 'blue', to: 'violet' },
    { motif: 'dots', from: 'coral', to: 'amber' },
    { motif: 'wave', from: 'blue', to: 'teal' },
    { motif: 'peaks', from: 'violet', to: 'blue' },
]

/** Each motif, square for an album. */
export const Motifs: StoryObj = {
    render: () => (
        <Columns count={6} min="xs" gap="md">
            {ARTWORK_MOTIFS.map((motif, index) => (
                <Section key={motif} title={motif} flush>
                    <div className="aspect-square">
                        <Artwork cover={COVERS[index]} />
                    </div>
                </Section>
            ))}
        </Columns>
    ),
}

/** The same motifs drawn for a wide frame, as a video's. */
export const Wide: StoryObj = {
    render: () => (
        <Columns count={3} min="sm" gap="md">
            {COVERS.map((cover) => (
                <div key={cover.motif} className="aspect-video overflow-hidden rounded-surface">
                    <Artwork cover={cover} wide />
                </div>
            ))}
        </Columns>
    ),
}

/**
 * A picture over the cover drawn from its seed: the one that loads takes the drawn cover's place,
 * and the broken one leaves the drawn cover standing.
 */
export const Picture: StoryObj = {
    render: () => (
        <Columns count={3} min="xs" gap="md">
            <Section title="Loaded" flush>
                <div className="aspect-square">
                    <Artwork src={HARBOR_DUSK} alt="A harbor at dusk" seed="album-1" />
                </div>
            </Section>
            <Section title="Broken" flush>
                <div className="aspect-square">
                    <Artwork src="data:image/png;base64,AAAA" seed="album-2" />
                </div>
            </Section>
            <Section title="None" flush>
                <div className="aspect-square">
                    <Artwork seed="album-3" />
                </div>
            </Section>
        </Columns>
    ),
}
