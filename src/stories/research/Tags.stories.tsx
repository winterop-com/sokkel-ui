import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, X } from 'lucide-react'
import type { CSSProperties } from 'react'

import { cn } from '../../lib/cn'

/**
 * Shapes for tags and chips, to pick from. Today's pills are drawn first; the four options after it
 * come from a design round and take every corner from the radius tokens, so a theme's `--radius`
 * still decides how round they are. Each column shows the same parts: badges, removable address
 * chips with one that is not an address, toggle chips, a count over an icon, and status chips.
 * Stepped was picked and is what the library draws now; Today shows the pills it replaced.
 */
const meta: Meta = { title: 'Research/Tags', tags: ['no-screenshot'] }
export default meta

interface Shape {
    id: string
    name: string
    why: string
    badge: string
    chip: string
    remove: string
    toggle: string
    count: string
    status: string
    /** A corner no token gives yet, for the option that proposes one. */
    style?: CSSProperties
}

const TAG: CSSProperties = { borderRadius: 'calc(var(--radius) / 4)' }

const SHAPES: Shape[] = [
    {
        id: 'today',
        name: 'Today',
        why: 'Pills for badges, address chips, toggles and counts; status chips already use the chip radius.',
        badge: 'rounded-4xl h-5 px-2',
        chip: 'rounded-full h-6 pl-2 pr-0.5',
        remove: 'rounded-full size-5',
        toggle: 'rounded-full h-6 px-2.5',
        count: 'rounded-full h-4 min-w-4 px-1',
        status: 'rounded-chip px-1.5 py-0.5',
    },
    {
        id: 'clipped',
        name: 'Clipped',
        why: 'Nearly square throughout, from a new token at a quarter of the radius.',
        badge: 'h-5 px-1.5',
        chip: 'h-6 pl-2 pr-0.5',
        remove: 'size-5',
        toggle: 'h-6 px-2',
        count: 'h-5 min-w-5 px-1',
        status: 'h-6 px-1.5',
        style: TAG,
    },
    {
        id: 'crisp',
        name: 'Crisp',
        why: 'Small corners everywhere: the chip radius, and the mini radius for counts and remove buttons.',
        badge: 'rounded-chip h-5 px-1.5',
        chip: 'rounded-chip h-6 pl-2 pr-0.5',
        remove: 'rounded-mini size-5',
        toggle: 'rounded-chip h-6 px-2',
        count: 'rounded-mini h-5 min-w-5 px-1',
        status: 'rounded-chip h-6 px-1.5',
    },
    {
        id: 'stepped',
        name: 'Stepped',
        why: 'Labels crisp, things you act on as round as a field: chips and toggles take the control radius. Picked.',
        badge: 'rounded-chip h-5 px-1.5',
        chip: 'rounded-control h-6 pl-2 pr-0.5',
        remove: 'rounded-mini size-5',
        toggle: 'rounded-control h-6 px-2.5',
        count: 'rounded-mini h-5 min-w-5 px-1',
        status: 'rounded-chip h-6 px-1.5',
    },
    {
        id: 'soft',
        name: 'Soft',
        why: 'One moderate rounding for every tag: the control radius.',
        badge: 'rounded-control h-5 px-2',
        chip: 'rounded-control h-6 pl-2 pr-0.5',
        remove: 'rounded-mini size-5',
        toggle: 'rounded-control h-6 px-2.5',
        count: 'rounded-control h-5 min-w-5 px-1',
        status: 'rounded-control h-6 px-2',
    },
]

function Part({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">{title}</span>
            <div className="flex flex-wrap items-center gap-1.5">{children}</div>
        </div>
    )
}

function Column({ shape }: { shape: Shape }) {
    const s = shape.style
    return (
        <section className="flex min-w-0 flex-col gap-5 rounded-surface border border-border bg-card p-4 text-card-foreground">
            <div>
                <h2 className="text-title font-semibold">{shape.name}</h2>
                <p className="text-xs text-muted-foreground">{shape.why}</p>
            </div>
            <Part title="Badges">
                <span
                    style={s}
                    className={cn('inline-flex items-center bg-primary text-xs font-medium text-primary-foreground', shape.badge)}
                >
                    New
                </span>
                <span style={s} className={cn('inline-flex items-center bg-secondary text-xs font-medium', shape.badge)}>
                    Current
                </span>
                <span style={s} className={cn('inline-flex items-center border border-border text-xs font-medium', shape.badge)}>
                    juniper
                </span>
            </Part>
            <Part title="Address chips">
                <span className="flex flex-wrap items-center gap-1 rounded-control border border-input bg-field px-1.5 py-1">
                    {['data@example.org', 'support@example.org', 'margaret@example'].map((address, index) => {
                        const bad = index === 2
                        return (
                            <span
                                key={address}
                                style={s}
                                className={cn(
                                    'inline-flex items-center gap-1 text-xs',
                                    shape.chip,
                                    bad ? 'bg-destructive/10 text-destructive ring-1 ring-destructive/40' : 'bg-secondary',
                                )}
                            >
                                {address}
                                <span style={s} className={cn('flex items-center justify-center text-muted-foreground', shape.remove)}>
                                    <X className="size-3" aria-hidden />
                                </span>
                            </span>
                        )
                    })}
                </span>
            </Part>
            <Part title="Toggle chips">
                {['read', 'write', 'admin'].map((name, index) => (
                    <span
                        key={name}
                        style={s}
                        className={cn(
                            'inline-flex items-center border text-xs',
                            shape.toggle,
                            index < 2 ? 'border-primary/40 bg-accent text-foreground' : 'border-border text-muted-foreground',
                        )}
                    >
                        {name}
                    </span>
                ))}
            </Part>
            <Part title="Counts">
                <span className="relative flex size-9 items-center justify-center rounded-control text-muted-foreground">
                    <Bell className="size-4.5" aria-hidden />
                    <span
                        style={s}
                        className={cn(
                            'absolute -top-1 -right-1 flex items-center justify-center bg-critical text-xs leading-none font-semibold text-white tabular-nums',
                            shape.count,
                        )}
                    >
                        3
                    </span>
                </span>
                <span className="relative flex size-9 items-center justify-center rounded-control text-muted-foreground">
                    <Bell className="size-4.5" aria-hidden />
                    <span
                        style={s}
                        className={cn(
                            'absolute -top-1 -right-1 flex items-center justify-center bg-critical text-xs leading-none font-semibold text-white tabular-nums',
                            shape.count,
                        )}
                    >
                        12
                    </span>
                </span>
            </Part>
            <Part title="Status chips">
                <span
                    style={s}
                    className={cn('inline-flex items-center bg-status-succeeded/15 text-xs text-status-succeeded-ink', shape.status)}
                >
                    succeeded
                </span>
                <span style={s} className={cn('inline-flex items-center bg-status-failed/15 text-xs text-status-failed-ink', shape.status)}>
                    failed
                </span>
                <span
                    style={s}
                    className={cn('inline-flex items-center bg-status-running/15 text-xs text-status-running-ink', shape.status)}
                >
                    running
                </span>
            </Part>
        </section>
    )
}

/** Today's pills and the four options side by side, in the toolbar's theme and scheme. */
export const Options: StoryObj = {
    render: () => (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {SHAPES.map((shape) => (
                    <Column key={shape.id} shape={shape} />
                ))}
            </div>
        </div>
    ),
}
