import type { Meta, StoryObj } from '@storybook/react-vite'

import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'

/**
 * The type roles, and mono beside sans at every text size, to check the `font-size-adjust` rule:
 * each row sets the same words in sans, then in mono, then mono inside a sans sentence, so their
 * x-heights, cap heights and widths can be compared by eye. Mono inside `text-xs` takes the larger
 * small-text share.
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

const ROLES = [
    { name: 'text-page-title', role: 'Page title, 24/32 at 500', sample: 'nightly-export' },
    { name: 'text-detail-title', role: 'Detail or dialog title, 16/24 at 600', sample: 'Run 4812 of sync-inventory' },
    { name: 'text-section-title', role: 'Section or card title, 15/22 at 500', sample: 'Recent runs' },
    { name: 'text-head', role: 'Compact panel or table head, 13/20 at 600', sample: 'Steps' },
    { name: 'text-body', role: 'Body and controls, 15/22 at 400', sample: 'The job rebuilds the search index every night.' },
    { name: 'text-action', role: 'Actions, 15/22 at 500', sample: 'Run again' },
    { name: 'text-label', role: 'Field label, 15/20 at 500', sample: 'Schedule' },
    { name: 'text-help', role: 'Help and metadata, 13/20 at 400', sample: 'Started by ada, 4 minutes ago' },
    { name: 'text-badge', role: 'Badge and status, 13/20 at 500', sample: 'succeeded' },
    { name: 'text-statistic', role: 'Main statistic, 32/36 at 600', sample: '1,284' },
    { name: 'text-media-title', role: 'Fullscreen media title, 48/56 at 600', sample: 'Harbor at dawn' },
] as const

/** Each role drawn in its own class, under its name; code takes the size around it, adjusted. */
function RoleList() {
    return (
        <Stack gap="lg">
            {ROLES.map((role) => (
                <Stack key={role.name} gap="xs">
                    <span className="text-help text-muted-foreground">
                        <code>{role.name}</code> {role.role}
                    </span>
                    <span className={cn('min-w-0 break-words', role.name)}>
                        {role.sample} <code>upload</code>
                    </span>
                </Stack>
            ))}
        </Stack>
    )
}

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

/** Every type role in its class, named: titles, heads, body, labels, help, badges and statistics. */
export const Roles: StoryObj = { render: () => <RoleList /> }

/** IBM Plex Sans beside IBM Plex Mono, the default typeface. */
export const Plex: StoryObj = { globals: { look: 'default', typeface: 'theme' }, render: () => <Grid face="IBM Plex" /> }

/** Geist beside Geist Mono, with the face's own mono x-heights. */
export const Geist: StoryObj = { globals: { look: 'default', typeface: 'geist' }, render: () => <Grid face="Geist" /> }
