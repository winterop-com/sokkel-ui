/**
 * One frame of an edit, drawn straight from the scenes: the picture of the clip under second `t`
 * on the topmost shown picture track, at its own second (`inPoint + t - start`), and the titles
 * under `t` written over it. Nothing is decoded, so the preview and the export draw the same frame.
 */

import { drawSource, sourceOf } from './media'
import { end, type Clip, type Edit } from './model'

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** The clip whose picture shows at second `t`: on the topmost shown picture track that has one there. */
export function pictureAt(edit: Edit, t: number): Clip | undefined {
    for (const track of edit.tracks) {
        if (track.kind !== 'video' || track.hidden === true) continue
        const clip = edit.clips.find((one) => one.track === track.id && one.start <= t + 1e-6 && t < end(one) - 1e-6)
        if (clip !== undefined) return clip
    }
    return undefined
}

/** The titles written over the picture at second `t`, on every shown title track. */
export function titlesAt(edit: Edit, t: number): Clip[] {
    const shown = new Set(edit.tracks.filter((track) => track.kind === 'title' && track.hidden !== true).map((track) => track.id))
    return edit.clips.filter((clip) => shown.has(clip.track) && clip.start <= t + 1e-6 && t < end(clip) - 1e-6)
}

function wrap(context: Context, text: string, width: number): string[] {
    const lines: string[] = []
    let line = ''
    for (const word of text.split(/\s+/)) {
        const next = line === '' ? word : `${line} ${word}`
        if (context.measureText(next).width > width && line !== '') {
            lines.push(line)
            line = word
        } else line = next
    }
    if (line !== '') lines.push(line)
    return lines
}

function drawTitle(context: Context, clip: Clip, w: number, h: number) {
    if (clip.text === undefined || clip.text.trim() === '') return
    context.save()
    context.font = `700 ${String(Math.round(h * 0.07))}px system-ui, sans-serif`
    context.textBaseline = 'alphabetic'
    const lines = wrap(context, clip.text.trim(), w * 0.8).slice(0, 3)
    const lineHeight = h * 0.09
    const block = lines.length * lineHeight
    const top = h * 0.78 - block
    context.fillStyle = 'rgba(0, 0, 0, 0.45)'
    context.fillRect(0, top - h * 0.03, w, block + h * 0.06)
    context.fillStyle = '#fff'
    lines.forEach((line, index) => {
        context.fillText(line, w * 0.08, top + (index + 1) * lineHeight - h * 0.02)
    })
    context.restore()
}

/** Draws the edit's frame at second `t` on a `w` by `h` canvas: black where no picture plays. */
export function drawEditFrame(context: Context, edit: Edit, t: number, w: number, h: number): void {
    context.save()
    context.fillStyle = '#000'
    context.fillRect(0, 0, w, h)
    const picture = pictureAt(edit, t)
    const source = sourceOf(picture?.source)
    if (picture !== undefined && source !== undefined) drawSource(context, source, picture.inPoint + t - picture.start, w, h)
    context.restore()
    for (const title of titlesAt(edit, t)) drawTitle(context, title, w, h)
}
