import type { FileKind } from '@winterop-com/sokkel-ui/FileList'
import { PEOPLE, PROJECTS } from './tableRuns'

/** A folder or a file in a project's store, with its children when they are known. */
export interface FolderRow {
    id: string
    name: string
    kind: FileKind
    /** How deep it sits: a project is 0. */
    level: number
    size?: number
    modified: string
    owner: string
    children?: FolderRow[]
}

const NAMES = ['exports', 'imports', 'shared', 'archive', 'raw', 'review', 'rejected', 'staging'] as const
const FILES: { name: (day: number) => string; kind: FileKind; size: number }[] = [
    { name: (day) => `orders-2026-11-${String(day).padStart(2, '0')}.csv`, kind: 'table', size: 48_210 },
    { name: () => 'summary.json', kind: 'json', size: 2_310 },
    { name: () => 'notes.md', kind: 'text', size: 1_420 },
    { name: (day) => `site-${String(day)}.jpg`, kind: 'image', size: 3_420_000 },
]

/** A stable number from a path, so every folder's contents are the same each time. */
function seed(path: string): number {
    let hash = 7
    for (const char of path) hash = (hash * 31 + char.charCodeAt(0)) % 9973
    return hash
}

function row(id: string, name: string, kind: FileKind, level: number, size?: number): FolderRow {
    const at = seed(id)
    return {
        id,
        name,
        kind,
        level,
        size,
        modified: `Nov ${String(1 + (at % 5))}, ${String(at % 24).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`,
        owner: PEOPLE[at % 4],
    }
}

/** What a folder holds: two folders while it is above `depth`, then a few files. */
export function folderContents(folder: FolderRow, depth: number): FolderRow[] {
    const at = seed(folder.id)
    const level = folder.level + 1
    const folders =
        level > depth
            ? []
            : [0, 1].map((offset) => {
                  const names = NAMES.filter((one) => one !== folder.name)
                  const name = names[(at + offset * 3 + level) % names.length]
                  return row(`${folder.id}/${name}`, name, 'folder', level)
              })
    const files = FILES.slice(0, 1 + (at % 3)).map((file, index) => {
        const name = file.name(1 + ((at + index) % 9))
        return row(`${folder.id}/${name}`, name, file.kind, level, file.size + (at % 1000))
    })
    return [...folders, ...files]
}

/** The projects with their folders, `depth` folders deep, every folder's contents filled in. */
export function makeFolderTree(depth: number): FolderRow[] {
    const fill = (folder: FolderRow): FolderRow =>
        folder.kind === 'folder' ? { ...folder, children: folderContents(folder, depth).map(fill) } : folder
    return projectFolders().map(fill)
}

/** The projects alone, their contents not loaded. */
export function projectFolders(): FolderRow[] {
    return PROJECTS.map((project) => row(project, project, 'folder', 0))
}
