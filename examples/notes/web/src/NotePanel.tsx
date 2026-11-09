import { Highlight } from '@winterop-com/sokkel-ui/Highlight'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { markdownHeadings } from '@winterop-com/sokkel-ui/Markdown'
import { PanelSection, SidePanel } from '@winterop-com/sokkel-ui/SidePanel'
import { TableOfContents } from '@winterop-com/sokkel-ui/TableOfContents'
import { literalRanges } from '@winterop-com/sokkel-ui/lib/search'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@winterop-com/sokkel-ui/primitives/item'
import { CalendarDays, FilePlus, FileText, FileX, Link2 } from 'lucide-react'
import { useState } from 'react'

import { go } from 'tidevann-shared/router'
import type { Note } from './model'
import { useVault } from './state'
import { unlinkedMentions } from './vault'

/** A note another note's line points at: its name, the line with the words marked, and what can be done. */
function NoteItem({ note, line, mark, action }: { note: Note; line: string; mark: string; action?: React.ReactNode }) {
    const Icon = note.day === undefined ? FileText : CalendarDays
    return (
        <Item size="xs" render={<a href={`#/note/${note.id}`} />}>
            <ItemMedia variant="icon">
                <Icon />
            </ItemMedia>
            <ItemContent>
                <ItemTitle>{note.title}</ItemTitle>
                <ItemDescription>
                    <Highlight text={line} ranges={literalRanges(line, mark)} />
                </ItemDescription>
            </ItemContent>
            {action !== undefined && <ItemActions>{action}</ItemActions>}
        </Item>
    )
}

/** Beside a note: what links to it, where it is named without a link, what it links to, its tags and its outline. */
export function NotePanel({ note }: { note: Note }) {
    const { vault, rewrite, follow, drafts } = useVault()
    const [tab, setTab] = useState('links')
    const [linking, setLinking] = useState<string | null>(null)
    const body = drafts[note.id] ?? note.body
    const backlinks = vault.backlinks.get(note.id) ?? []
    const mentions = unlinkedMentions(vault, note)
    const out = vault.links.get(note.id) ?? []
    const targets = [...new Map(out.map((link) => [link.target.toLowerCase(), link.target])).values()]
    const tags = vault.tagsOf.get(note.id) ?? []
    const headings = markdownHeadings(body, [1, 2, 3, 4])

    /** Turns the first place another note names this one into a link to it. */
    const link = (from: Note, at: { from: number; to: number }) => {
        setLinking(from.id)
        const written = from.body.slice(at.from, at.to)
        const text = written === note.title ? `[[${note.title}]]` : `[[${note.title}|${written}]]`
        void rewrite(from.id, (current) => current.slice(0, at.from) + text + current.slice(at.to)).finally(() => setLinking(null))
    }

    const links = (
        <>
            <PanelSection title={`Linked mentions ${String(backlinks.length)}`}>
                {backlinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No note links here yet.</p>
                ) : (
                    <ItemGroup flush>
                        {backlinks.map(({ from, link: one, line }) => (
                            <NoteItem key={from.id} note={from} line={line} mark={one.label ?? one.target} />
                        ))}
                    </ItemGroup>
                )}
            </PanelSection>
            <PanelSection title={`Unlinked mentions ${String(mentions.length)}`}>
                {mentions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No note names it without a link.</p>
                ) : (
                    <ItemGroup flush>
                        {mentions.map(({ from, at, line }) => (
                            <NoteItem
                                key={from.id}
                                note={from}
                                line={line}
                                mark={note.title}
                                action={
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        disabled={linking === from.id}
                                        onClick={(event) => {
                                            event.preventDefault()
                                            link(from, at)
                                        }}
                                    >
                                        <Link2 />
                                        Link
                                    </Button>
                                }
                            />
                        ))}
                    </ItemGroup>
                )}
            </PanelSection>
            <PanelSection title={`Links out ${String(targets.length)}`}>
                {targets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">This note links nowhere. Type [[ to link one.</p>
                ) : (
                    <ItemGroup flush>
                        {targets.map((target) => {
                            const to = vault.resolve(target)
                            return to === undefined ? (
                                <Item key={target} size="xs">
                                    <ItemMedia variant="icon">
                                        <FileX />
                                    </ItemMedia>
                                    <ItemContent>
                                        <ItemTitle>{target}</ItemTitle>
                                        <ItemDescription>Not made yet</ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        <Button size="xs" variant="outline" onClick={() => follow(target, note)}>
                                            <FilePlus />
                                            Make
                                        </Button>
                                    </ItemActions>
                                </Item>
                            ) : (
                                <Item key={target} size="xs" render={<a href={`#/note/${to.id}`} />}>
                                    <ItemMedia variant="icon">{to.day === undefined ? <FileText /> : <CalendarDays />}</ItemMedia>
                                    <ItemContent>
                                        <ItemTitle>{to.title}</ItemTitle>
                                        {to.folder !== null && <ItemDescription>{vault.path(to.folder)}</ItemDescription>}
                                    </ItemContent>
                                </Item>
                            )
                        })}
                    </ItemGroup>
                )}
            </PanelSection>
            <PanelSection title="Tags">
                {tags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tags. Write # and a word to tag the note.</p>
                ) : (
                    <Row gap="2xs" wrap>
                        {tags.map((tag) => (
                            <Button key={tag} size="xs" variant="outline" onClick={() => go(`/tags/${encodeURIComponent(tag)}`)}>
                                #{tag}
                            </Button>
                        ))}
                    </Row>
                )}
            </PanelSection>
        </>
    )

    const outline =
        headings.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No headings. Start a line with # to make one.</p>
        ) : (
            <div className="p-4">
                <TableOfContents
                    entries={headings}
                    onJump={(id) => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
                    words={{ title: note.title }}
                />
            </div>
        )

    return (
        <SidePanel
            active={tab}
            onActiveChange={setTab}
            tabs={[
                { id: 'links', label: 'Links', content: links },
                { id: 'outline', label: 'Outline', content: outline },
            ]}
        />
    )
}
