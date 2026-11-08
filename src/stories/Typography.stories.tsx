import type { Meta, StoryObj } from '@storybook/react-vite'

import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'

/**
 * Mono beside sans at every text size, to check the `font-size-adjust` rule: each row sets the same
 * words in sans, then in mono, then mono inside a sans sentence, so their x-heights, cap heights and
 * widths can be compared by eye. Mono inside `text-xs` takes the larger small-text share.
 */
const meta: Meta = { title: 'Foundations/Typography', parameters: { frame: 'padded' } }
export default meta

const SIZES = [
    { token: 'text-2xs', className: 'text-2xs' },
    { token: 'text-xs', className: 'text-xs' },
    { token: 'text-sm', className: 'text-sm' },
    { token: 'text-base', className: 'text-base' },
    { token: 'text-title', className: 'text-title' },
    { token: 'text-page', className: 'text-page' },
    { token: 'text-stat', className: 'text-stat' },
    { token: 'text-display', className: 'text-display' },
] as const

function Grid({ face }: { face: string }) {
    return (
        <Stack gap="xl">
            <PageHeader title="Mono size grid" description={`${face}: sans, mono, and mono inside a sans line, at every text size.`} />
            {SIZES.map((size) => (
                <Section key={size.token} title={<span className="font-mono">{size.token}</span>}>
                    <Stack gap="sm" className={size.className}>
                        <Row wrap gap="lg" align="baseline">
                            <span className="min-w-0">nightly-export failed</span>
                            <span className="min-w-0 font-mono">nightly-export failed</span>
                        </Row>
                        <p className="min-w-0">
                            The job <code>nightly-export</code> failed at <code>upload</code> after 4.2s.
                        </p>
                    </Stack>
                </Section>
            ))}
        </Stack>
    )
}

/** IBM Plex Sans beside IBM Plex Mono, the default typeface. */
export const Plex: StoryObj = { globals: { look: 'default', typeface: 'theme' }, render: () => <Grid face="IBM Plex" /> }

/** Geist beside Geist Mono, with the face's own mono x-heights. */
export const Geist: StoryObj = { globals: { look: 'default', typeface: 'geist' }, render: () => <Grid face="Geist" /> }
