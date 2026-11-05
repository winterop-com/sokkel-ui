import type { Meta, StoryObj } from '@storybook/react-vite'
import { icons, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { SearchField } from '../components/SearchField'
import { Segmented } from '../components/Segmented'
import { cn } from '../lib/cn'

/**
 * The one icon set: Lucide, from `lucide-react`. Every icon in the library and its stories comes
 * from it. Press an icon to copy its import.
 */
const meta: Meta = { title: 'Foundations/Icons' }
export default meta

const SOURCES = import.meta.glob('../components/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

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
        <div className="min-h-svh bg-background p-6 text-foreground">
            <header className="mb-4 flex flex-col gap-1">
                <h1 className="text-page font-medium">Icons</h1>
                <p className="text-sm text-muted-foreground">
                    Lucide, from <span className="font-mono">lucide-react</span>. {USED.length} are used in the library, of{' '}
                    {EVERY.length.toLocaleString('en-US')}.
                </p>
            </header>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <SearchField value={query} onChange={setQuery} placeholder="Search icons" className="w-72" />
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
                <span className="ml-auto text-sm text-muted-foreground tabular-nums">{shown.length.toLocaleString('en-US')} shown</span>
            </div>
            {shown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No icon matches.</p>
            ) : (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
                    {shown.map((name) => {
                        const Icon = ALL[name]
                        return (
                            <li key={name}>
                                <button
                                    type="button"
                                    title={`Copy import { ${name} } from 'lucide-react'`}
                                    onClick={() => copy(name)}
                                    className={cn(
                                        'flex h-24 w-full flex-col items-center justify-center gap-2.5 rounded-lg border border-border bg-card px-2 text-card-foreground outline-none hover:border-border-strong hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50',
                                        copied === name && 'border-primary/60',
                                    )}
                                >
                                    <Icon style={{ width: Number(size), height: Number(size) }} aria-hidden />
                                    <span className="w-full truncate text-center font-mono text-[11px] text-muted-foreground">
                                        {copied === name ? 'Copied' : name}
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

/** The icons the library's components use, read from their source. */
export const Library: StoryObj = { name: 'In the library', render: () => <Gallery /> }

/** Every Lucide icon, searchable. */
export const All: StoryObj = { render: () => <Gallery start="all" /> }

/** A search across every icon: "arrow" finds the arrows, chevrons excluded. */
export const Search: StoryObj = { render: () => <Gallery start="all" query="arrow" /> }
