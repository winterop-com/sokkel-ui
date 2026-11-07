import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check } from 'lucide-react'

import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@winterop-com/sokkel-ui/primitives/avatar'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Display/Avatar', parameters: { frame: 'column' } }
export default meta

const PICTURE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#5b7a99"/><circle cx="20" cy="16" r="7" fill="#dbe4ee"/><rect x="8" y="26" width="24" height="14" rx="7" fill="#dbe4ee"/></svg>',
    )

const SIZES = ['sm', 'default', 'lg'] as const

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="end" wrap>
            {SIZES.map((size) => (
                <Specimen below key={size} label={`${size}, fallback`}>
                    <Avatar size={size}>
                        <AvatarFallback>AL</AvatarFallback>
                    </Avatar>
                </Specimen>
            ))}
            {SIZES.map((size) => (
                <Specimen below key={`image-${size}`} label={`${size}, image`}>
                    <Avatar size={size}>
                        <AvatarImage src={PICTURE} alt="ada" />
                        <AvatarFallback>AL</AvatarFallback>
                    </Avatar>
                </Specimen>
            ))}
            {SIZES.map((size) => (
                <Specimen below key={`badge-${size}`} label={`${size}, badge`}>
                    <Avatar size={size}>
                        <AvatarFallback>GH</AvatarFallback>
                        <AvatarBadge>
                            <Check />
                        </AvatarBadge>
                    </Avatar>
                </Specimen>
            ))}
        </Row>
    ),
}

const CHANGES = [
    ['AL', 'ada', 'changed the schedule of nightly-export', '2026-11-04 14:02'],
    ['GH', 'grace', 'added the validate step', '2026-11-03 09:15'],
    ['LT', 'linus', 'renamed the job to nightly-export', '2026-11-02 17:40'],
] as const

export const Group: StoryObj = {
    render: () => (
        <>
            <Row gap="2xl" wrap>
                <Specimen below label="group">
                    <AvatarGroup>
                        <Avatar>
                            <AvatarFallback>AL</AvatarFallback>
                        </Avatar>
                        <Avatar>
                            <AvatarFallback>GH</AvatarFallback>
                        </Avatar>
                        <Avatar>
                            <AvatarFallback>LT</AvatarFallback>
                        </Avatar>
                    </AvatarGroup>
                </Specimen>
                <Specimen below label="group with count">
                    <AvatarGroup>
                        <Avatar size="lg">
                            <AvatarFallback>AL</AvatarFallback>
                        </Avatar>
                        <Avatar size="lg">
                            <AvatarFallback>MH</AvatarFallback>
                        </Avatar>
                        <AvatarGroupCount>+4</AvatarGroupCount>
                    </AvatarGroup>
                </Specimen>
            </Row>
            <Stack className="max-w-md">
                <p className="text-sm font-medium">Who changed nightly-export</p>
                {CHANGES.map(([initials, user, what, when]) => (
                    <Row key={user} gap="md" wrap>
                        <Avatar size="sm">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <p className="min-w-0 flex-1 text-sm">
                            <span className="font-mono">{user}</span> {what}
                        </p>
                        <span className="text-xs text-muted-foreground tabular-nums">{when}</span>
                    </Row>
                ))}
            </Stack>
        </>
    ),
}
