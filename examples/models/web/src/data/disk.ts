/** The disk the library's root is on, simulated: its size, what else is on it, and what is left. */

import type { Download, Model } from './model'
import { GB } from './format'

export interface Disk {
    /** What the disk is called in a sentence: the volume by its name, or the system disk. */
    name: string
    /** Bytes the disk holds in all. */
    capacity: number
    /** Bytes taken by files that are not the library's. */
    other: number
}

/** The disk a root path is on: an external volume under `/Volumes`, the system disk otherwise. */
export function diskOf(root: string): Disk {
    const volume = /^\/Volumes\/([^/]+)/.exec(root)?.[1]
    if (volume !== undefined) return { name: `the ${volume} volume`, capacity: 2000 * GB, other: 1240 * GB }
    return { name: 'the system disk', capacity: 1000 * GB, other: 610 * GB }
}

/** What the library takes on its disk, what downloads have written so far, and what is free. */
export function usageOf(root: string, library: readonly Model[], pulling: readonly Download[]) {
    const disk = diskOf(root)
    const models = library.reduce((sum, model) => sum + model.size, 0)
    const partial = pulling.filter((one) => one.state !== 'done' && one.state !== 'cancelled').reduce((sum, one) => sum + one.done, 0)
    const free = Math.max(0, disk.capacity - disk.other - models - partial)
    return { disk, models, partial, free }
}

/** Where a model's files are kept under the root: `<root>/<source>/<publisher>/<name>-<quant>`. */
export function pathOf(root: string, model: Pick<Model, 'source' | 'publisher' | 'name' | 'quant'>): string {
    return `${root.replace(/\/$/, '')}/${model.source}/${model.publisher}/${model.name}-${model.quant}`
}

/** Whether a root reads as a folder path. */
export function validRoot(root: string): boolean {
    return /^(\/|~\/)[^\0]*$/.test(root.trim()) && !root.includes('//')
}
