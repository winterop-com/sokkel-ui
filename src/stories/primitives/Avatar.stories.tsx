import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check } from 'lucide-react'

import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '../../components/ui/avatar'

const meta: Meta = { title: 'Primitives/Display/Avatar' }
export default meta

const PICTURE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#5b7a99"/><circle cx="20" cy="16" r="7" fill="#dbe4ee"/><rect x="8" y="26" width="24" height="14" rx="7" fill="#dbe4ee"/></svg>',
    )

function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            {children}
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    )
}

const SIZES = ['sm', 'default', 'lg'] as const

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-end gap-6">
                {SIZES.map((size) => (
                    <Labeled key={size} label={`${size}, fallback`}>
                        <Avatar size={size}>
                            <AvatarFallback>AL</AvatarFallback>
                        </Avatar>
                    </Labeled>
                ))}
                {SIZES.map((size) => (
                    <Labeled key={`image-${size}`} label={`${size}, image`}>
                        <Avatar size={size}>
                            <AvatarImage src={PICTURE} alt="ada" />
                            <AvatarFallback>AL</AvatarFallback>
                        </Avatar>
                    </Labeled>
                ))}
                {SIZES.map((size) => (
                    <Labeled key={`badge-${size}`} label={`${size}, badge`}>
                        <Avatar size={size}>
                            <AvatarFallback>GH</AvatarFallback>
                            <AvatarBadge>
                                <Check />
                            </AvatarBadge>
                        </Avatar>
                    </Labeled>
                ))}
            </div>
        </Ground>
    ),
}

const CHANGES = [
    ['AL', 'ada', 'changed the schedule of nightly-export', '2026-11-04 14:02'],
    ['GH', 'grace', 'added the validate step', '2026-11-03 09:15'],
    ['LT', 'linus', 'renamed the job to nightly-export', '2026-11-02 17:40'],
] as const

export const Group: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap items-center gap-8">
                <Labeled label="group">
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
                </Labeled>
                <Labeled label="group with count">
                    <AvatarGroup>
                        <Avatar size="lg">
                            <AvatarFallback>AL</AvatarFallback>
                        </Avatar>
                        <Avatar size="lg">
                            <AvatarFallback>MH</AvatarFallback>
                        </Avatar>
                        <AvatarGroupCount>+4</AvatarGroupCount>
                    </AvatarGroup>
                </Labeled>
            </div>
            <div className="flex max-w-md flex-col gap-3">
                <p className="text-sm font-medium">Who changed nightly-export</p>
                {CHANGES.map(([initials, user, what, when]) => (
                    <div key={user} className="flex flex-wrap items-center gap-3">
                        <Avatar size="sm">
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <p className="min-w-0 flex-1 text-sm">
                            <span className="font-mono">{user}</span> {what}
                        </p>
                        <span className="text-xs text-muted-foreground tabular-nums">{when}</span>
                    </div>
                ))}
            </div>
        </Ground>
    ),
}
