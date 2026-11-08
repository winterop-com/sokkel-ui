import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Empty, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { icons, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { cn } from '@winterop-com/sokkel-ui/lib/cn'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'

/**
 * The one icon set: Lucide, from `lucide-react`. Every icon in the library and its stories comes
 * from it. Press an icon to copy its import. Not screenshot: the gallery lists every icon the
 * packages import, so it would change with any change that adds one.
 */
const meta: Meta = { title: 'Foundations/Icons', parameters: { frame: 'padded' }, tags: ['no-screenshot'] }
export default meta

const SOURCES = import.meta.glob(['../../packages/*/src/**/*.tsx', '!**/*.test.tsx'], {
    query: '?raw',
    import: 'default',
    eager: true,
}) as Record<string, string>

const ALL = icons as Record<string, LucideIcon>

/** The icons the library's components import, read from their source when Storybook builds. */
function usedByLibrary(): string[] {
    const names = new Set<string>()
    for (const source of Object.values(SOURCES)) {
        for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*'lucide-react'/g)) {
            for (const part of match[1].split(',')) {
                const name = part
                    .trim()
                    .replace(/^type\s+/, '')
                    .replace(/\s+as\s+.*$/, '')
                if (name === '' || name.startsWith('Lucide')) continue
                const known = name in ALL ? name : name.replace(/Icon$/, '')
                if (known in ALL) names.add(known)
            }
        }
    }
    return [...names].sort()
}

const USED = usedByLibrary()
const EVERY = Object.keys(ALL).sort()

/** `ArrowUpRight` read as `arrow up right`, so a search finds it by any of its words. */
function words(name: string): string {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .toLowerCase()
}

const SIZES = [
    { value: '16', label: '16' },
    { value: '20', label: '20' },
    { value: '24', label: '24' },
]

function Gallery({ start = 'library', query: initial = '' }: { start?: 'library' | 'all'; query?: string }) {
    const [set, setSet] = useState<'library' | 'all'>(start)
    const [query, setQuery] = useState(initial)
    const [size, setSize] = useState('20')
    const [copied, setCopied] = useState<string | null>(null)
    const names = set === 'library' ? USED : EVERY
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase()
        return q === '' ? names : names.filter((name) => words(name).includes(q) || name.toLowerCase().includes(q.replaceAll(' ', '')))
    }, [names, query])
    const copy = (name: string) => {
        void navigator.clipboard?.writeText(`import { ${name} } from 'lucide-react'`).catch(() => undefined)
        setCopied(name)
        window.setTimeout(() => setCopied((current) => (current === name ? null : current)), 1200)
    }
    return (
        <>
            <div className="mb-4">
                <PageHeader
                    title="Icons"
                    description={
                        <>
                            Lucide, from <span className="font-mono">lucide-react</span>. {USED.length} are used in the library, of{' '}
                            {EVERY.length.toLocaleString('en-US')}.
                        </>
                    }
                />
            </div>
            <Toolbar
                className="mb-4"
                search={<SearchField value={query} onChange={setQuery} placeholder="Search" />}
                end={<span className="text-sm text-muted-foreground tabular-nums">{shown.length.toLocaleString('en-US')} shown</span>}
            >
                <Segmented
                    label="Which icons"
                    value={set}
                    onChoose={(next) => setSet(next as 'library' | 'all')}
                    options={[
                        { value: 'library', label: `In the library (${String(USED.length)})` },
                        { value: 'all', label: `All (${EVERY.length.toLocaleString('en-US')})` },
                    ]}
                />
                <Segmented label="Size" value={size} onChoose={setSize} options={SIZES} />
            </Toolbar>
            {shown.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No icon matches</EmptyTitle>
                    </EmptyHeader>
                </Empty>
            ) : (
                <Columns as="ul" count="fill" min="xs" gap="sm">
                    {shown.map((name) => {
                        const Icon = ALL[name]
                        return (
                            <li key={name}>
                                <button
                                    type="button"
                                    title={`Copy import { ${name} } from 'lucide-react'`}
                                    onClick={() => copy(name)}
                                    className={cn(
                                        'h-24 w-full rounded-lg border border-border bg-card px-2 text-card-foreground outline-none hover:border-border-strong hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring/50',
                                        copied === name && 'border-primary/60',
                                    )}
                                >
                                    <Stack as="span" gap="sm" align="center" justify="center" className="h-full">
                                        <Icon style={{ width: Number(size), height: Number(size) }} aria-hidden />
                                        <span className="w-full truncate text-center font-mono text-xs text-muted-foreground">
                                            {copied === name ? 'Copied' : name}
                                        </span>
                                    </Stack>
                                </button>
                            </li>
                        )
                    })}
                </Columns>
            )}
        </>
    )
}

/** The icons the library's components use, read from their source. */
export const Library: StoryObj = { name: 'In the library', render: () => <Gallery /> }

/** Every Lucide icon, searchable. */
export const All: StoryObj = { render: () => <Gallery start="all" /> }

/** A search across every icon: "arrow" finds the arrows, chevrons excluded. */
export const Search: StoryObj = { render: () => <Gallery start="all" query="arrow" /> }
