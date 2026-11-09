import { Dot } from '@winterop-com/sokkel-ui/Dot'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { SwitchField } from '@winterop-com/sokkel-ui/SwitchField'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { KIND_COLORS, type KindColor } from '@winterop-com/sokkel-ui/lib/kind'
import { NetworkGraph, type NetworkLink, type NetworkNode } from '@winterop-com/sokkel-ui-graph/NetworkGraph'
import { useMemo, useState } from 'react'

import type { Note } from '../model'
import { useVault } from '../state'
import type { Vault } from '../vault'

/** The folder at the top of the vault a note sits under, which colors it. */
function topFolder(vault: Vault, note: Note): string | null {
    let at = note.folder
    for (let steps = 0; at !== null && steps < 32; steps += 1) {
        const parent = vault.folderById.get(at)?.parent ?? null
        if (parent === null) return at
        at = parent
    }
    return at
}

/** The notes within `depth` links of one note, either way. */
function around(vault: Vault, id: string, depth: number): Set<string> {
    const near = new Set([id])
    for (let step = 0; step < depth; step += 1) {
        for (const note of vault.notes) {
            for (const link of vault.links.get(note.id) ?? []) {
                const to = vault.resolve(link.target)
                if (to === undefined) continue
                if (near.has(note.id) && !near.has(to.id)) near.add(to.id)
                else if (near.has(to.id) && !near.has(note.id)) near.add(note.id)
            }
        }
    }
    return near
}

/** The vault as a network of its notes and their links, or the notes around the one open; a dot opens its note. */
export function GraphPage() {
    const { vault, prefs, setPrefs, open, follow } = useVault()
    const current = prefs.active !== null && vault.byId.has(prefs.active) ? prefs.active : null
    const [scope, setScope] = useState<'vault' | 'around'>('vault')
    const [missing, setMissing] = useState(true)
    const local = scope === 'around' && current !== null

    const colors = useMemo(() => {
        const tops = vault.folders.filter((folder) => folder.parent === null).sort((a, b) => a.name.localeCompare(b.name))
        return new Map<string, KindColor>(tops.map((folder, index) => [folder.id, KIND_COLORS[index % KIND_COLORS.length] as KindColor]))
    }, [vault.folders])

    const { nodes, links } = useMemo(() => {
        const keep = local && current !== null ? around(vault, current, 2) : null
        const shown = vault.notes.filter((note) => keep === null || keep.has(note.id))
        const ids = new Set(shown.map((note) => note.id))
        const edges: NetworkLink[] = []
        const ghosts = new Map<string, NetworkNode>()
        for (const note of shown) {
            for (const link of vault.links.get(note.id) ?? []) {
                const to = vault.resolve(link.target)
                if (to !== undefined) {
                    if (ids.has(to.id) && to.id !== note.id) edges.push({ source: note.id, target: to.id })
                } else if (missing) {
                    const id = `missing:${link.target.toLowerCase()}`
                    ghosts.set(id, { id, label: link.target, faint: true })
                    edges.push({ source: note.id, target: id })
                }
            }
        }
        const linked = new Set(edges.flatMap((edge) => [edge.source, edge.target]))
        const notes: NetworkNode[] = shown
            .filter((note) => prefs.orphans || linked.has(note.id))
            .map((note) => {
                const top = topFolder(vault, note)
                const color = top === null ? undefined : colors.get(top)
                return { id: note.id, label: note.title, ...(color === undefined ? {} : { color }) }
            })
        return { nodes: [...notes, ...ghosts.values()], links: edges }
    }, [vault, local, current, missing, prefs.orphans, colors])

    const legend = vault.folders
        .filter((folder) => folder.parent === null)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((folder) => ({ id: folder.id, name: folder.name, color: colors.get(folder.id) }))

    return (
        <Page className="h-full">
            <PageHeader
                title="Graph"
                count={`${String(nodes.length)} notes, ${String(links.length)} links`}
                description="Each dot a note, colored by its folder, larger the more it links; point at one to see its neighbors, press it to open it."
            />
            <Toolbar
                end={
                    <Segmented
                        size="sm"
                        label="Show"
                        value={local ? 'around' : 'vault'}
                        onValueChange={setScope}
                        options={[
                            { value: 'vault', label: 'Whole vault' },
                            {
                                value: 'around',
                                label: 'Around the open note',
                                disabled: current === null,
                                ...(current === null ? { hint: 'Open a note first.' } : {}),
                            },
                        ]}
                    />
                }
            >
                <SwitchField
                    id="orphans"
                    label="Notes with no link"
                    checked={prefs.orphans}
                    onCheckedChange={(orphans) => void setPrefs({ orphans })}
                />
                <SwitchField id="missing" label="Notes not made yet" checked={missing} onCheckedChange={setMissing} />
            </Toolbar>
            <Stack gap="sm" className="min-h-0 flex-1">
                <NetworkGraph
                    nodes={nodes}
                    links={links}
                    current={current}
                    onSelect={(id) => {
                        if (id === null) return
                        if (id.startsWith('missing:')) follow(nodes.find((node) => node.id === id)?.label ?? '', undefined)
                        else open(id)
                    }}
                    words={{ label: 'The notes and their links', empty: 'No note to show.' }}
                    className="min-h-80 flex-1"
                />
                <Row gap="lg" wrap rowGap="2xs" className="text-xs text-muted-foreground">
                    {legend.map((entry) => (
                        <Row key={entry.id} gap="2xs" inline>
                            <Dot {...(entry.color === undefined ? {} : { kind: entry.color })} />
                            {entry.name}
                        </Row>
                    ))}
                    <Row gap="2xs" inline>
                        <Dot color="var(--muted-foreground)" />
                        At the top
                    </Row>
                    <Row gap="2xs" inline>
                        <Dot color="var(--muted-foreground)" className="opacity-50" />
                        Not made yet
                    </Row>
                </Row>
            </Stack>
        </Page>
    )
}
