import { MetaLine } from '@winterop-com/sokkel-ui/MetaLine'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { RelativeTime } from '@winterop-com/sokkel-ui/RelativeTime'
import { Artwork } from '@winterop-com/sokkel-ui-media/Artwork'
import { MediaCard, MediaGrid } from '@winterop-com/sokkel-ui-media/MediaCard'
import { Copy, ExternalLink, PencilLine, Plus, Trash2 } from 'lucide-react'

import { go } from 'tidevann-shared/router'
import { posterOf, sourceOf } from './media'
import { lengthOf, lengthText, type Project } from './model'
import { pictureAt } from './render'

/** The still a project's card shows: its picture a second into the edit, or none for an edit without one. */
function thumbnailOf(project: Project): string | undefined {
    const first = [...project.clips].filter((clip) => sourceOf(clip.source)?.kind === 'video').sort((a, b) => a.start - b.start)[0]
    const at = first === undefined ? undefined : first.start + Math.min(1, first.duration / 2)
    const clip = at === undefined ? undefined : pictureAt(project, at)
    const source = sourceOf(clip?.source)
    if (clip === undefined || source === undefined || at === undefined) return undefined
    return posterOf(source, clip.inPoint + at - clip.start)
}

/** Every project, the one edited last first: each opened in the editor, renamed, duplicated or deleted. */
export function ProjectsPage({
    projects,
    onCreate,
    onRename,
    onDuplicate,
    onDelete,
}: {
    projects: readonly Project[]
    onCreate: () => void
    onRename: (project: Project) => void
    onDuplicate: (project: Project) => void
    onDelete: (project: Project) => void
}) {
    return (
        <>
            <PageHeader
                title="Projects"
                count={`${String(projects.length)} ${projects.length === 1 ? 'project' : 'projects'}`}
                description="Edits cut from the clips in the media bin. Changes are saved as they are made."
                actions={
                    <Button size="sm" onClick={onCreate}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            {projects.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyTitle>No projects</EmptyTitle>
                        <EmptyDescription>Make a project to cut clips from the media bin into an edit.</EmptyDescription>
                    </EmptyHeader>
                    <Button size="sm" variant="outline" onClick={onCreate}>
                        New project
                    </Button>
                </Empty>
            ) : (
                <MediaGrid shape="wide" label="Projects">
                    {projects.map((project) => {
                        const still = thumbnailOf(project)
                        return (
                            <MediaCard
                                key={project.id}
                                shape="wide"
                                title={project.name}
                                href={`#/p/${project.id}`}
                                cover={<Artwork src={still} seed={project.id} wide />}
                                badge={lengthText(lengthOf(project))}
                                subtitle={
                                    <MetaLine
                                        items={[
                                            `${String(project.clips.length)} ${project.clips.length === 1 ? 'clip' : 'clips'}`,
                                            <span key="edited">
                                                Edited <RelativeTime date={project.updated} />
                                            </span>,
                                        ]}
                                    />
                                }
                                menu={
                                    <>
                                        <DropdownMenuItem onClick={() => go(`/p/${project.id}`)}>
                                            <ExternalLink aria-hidden />
                                            Open
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onRename(project)}>
                                            <PencilLine aria-hidden />
                                            Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onDuplicate(project)}>
                                            <Copy aria-hidden />
                                            Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem variant="destructive" onClick={() => onDelete(project)}>
                                            <Trash2 aria-hidden />
                                            Delete
                                        </DropdownMenuItem>
                                    </>
                                }
                            />
                        )
                    })}
                </MediaGrid>
            )}
        </>
    )
}
