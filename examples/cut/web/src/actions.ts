/** What a person does to the projects themselves, each through the backend: make, rename, duplicate and delete. */

import { toast } from '@winterop-com/sokkel-ui/primitives/toast'

import { go } from 'tidevann-shared/router'
import { projects } from './collections'
import { copyEdit, defaultTracks, type Edit, type Project } from './model'

const failed = (title: string) => (error: unknown) => {
    toast.add({ type: 'error', title, description: error instanceof Error ? error.message : String(error) })
}

/** The projects, the one edited last first. */
export const byUpdated = (all: readonly Project[]) => [...all].sort((a, b) => b.updated - a.updated)

/** Makes an empty project and opens it. */
export async function createProject(name: string): Promise<void> {
    const now = Date.now()
    try {
        const made = await projects.create({ name, owner: 'ada', created: now, updated: now, tracks: defaultTracks(), clips: [] })
        toast.add({ type: 'success', title: `${name} made` })
        go(`/p/${made.id}`)
    } catch (error) {
        failed('Could not make the project')(error)
    }
}

export async function renameProject(project: Project, name: string): Promise<void> {
    await projects.update(project.id, { name, updated: Date.now() }).catch(failed('Could not rename the project'))
}

/** A copy of a project with every clip, listed first as the one edited last. */
export async function duplicateProject(project: Project): Promise<void> {
    const now = Date.now()
    try {
        const made = await projects.create({
            name: `${project.name} copy`,
            owner: 'ada',
            created: now,
            updated: now,
            ...copyEdit(project),
        })
        toast.add({
            type: 'success',
            title: `${made.name} made`,
            actionProps: { children: 'Open', onClick: () => go(`/p/${made.id}`) },
        })
    } catch (error) {
        failed('Could not duplicate the project')(error)
    }
}

export async function deleteProject(project: Project): Promise<void> {
    try {
        await projects.remove(project.id)
        toast.add({ title: `${project.name} deleted` })
    } catch (error) {
        failed('Could not delete the project')(error)
    }
}

/** Keeps an edit's tracks and clips, as the editor saves them while a person works. */
export async function saveEdit(id: string, edit: Edit): Promise<void> {
    await projects.update(id, { tracks: edit.tracks, clips: edit.clips, updated: Date.now() })
}
