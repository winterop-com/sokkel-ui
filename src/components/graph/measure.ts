import { useEffect, useState } from 'react'

/** The faces a node's words are set in: its title in the sans or the code face, and its small line in the code face. */
export type TextFace = 'title' | 'title-mono' | 'small-mono'

/** How wide a run of text is drawn in one face, in pixels. */
export type Measure = (text: string, face: TextFace) => number

/** The classes each face is drawn with, which a measurement reads its font from. */
export const FACE_CLASS: Record<TextFace, string> = {
    title: 'font-sans text-graph-title font-semibold',
    'title-mono': 'font-mono text-graph-title font-semibold',
    'small-mono': 'font-mono text-graph-small',
}

/** A width read off the characters, for where no font can be measured. */
export const measureByCharacters: Measure = (text, face) =>
    text.length * (face === 'small-mono' ? 11 : 12) * (face === 'title' ? 0.62 : 0.6)

/** The font shorthand each face resolves to on this page, read from a probe drawn with its classes. */
function fontsOf(): Record<TextFace, string> {
    const probe = document.createElement('span')
    probe.style.position = 'absolute'
    probe.style.visibility = 'hidden'
    document.body.append(probe)
    const fonts = Object.fromEntries(
        (Object.keys(FACE_CLASS) as TextFace[]).map((face) => {
            probe.className = FACE_CLASS[face]
            const style = getComputedStyle(probe)
            return [face, `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`]
        }),
    ) as Record<TextFace, string>
    probe.remove()
    return fonts
}

/** A measure that sets text in the page's own fonts on a canvas, falling back to the characters. */
function fontMeasure(): Measure {
    const fonts = fontsOf()
    const context = document.createElement('canvas').getContext('2d')
    const widths = new Map<string, number>()
    return (text, face) => {
        if (context === null) return measureByCharacters(text, face)
        const key = `${face}\u0000${text}`
        const held = widths.get(key)
        if (held !== undefined) return held
        context.font = fonts[face]
        const width = Math.ceil(context.measureText(text).width)
        widths.set(key, width)
        return width
    }
}

/**
 * The measure a graph sizes its nodes with, and whether it is final: the characters' until every
 * face has loaded, then the fonts'.
 */
export function useMeasure(): { measure: Measure; ready: boolean } {
    const [measure, setMeasure] = useState<Measure | null>(null)
    useEffect(() => {
        let current = true
        const fonts = fontsOf()
        const loads = 'fonts' in document ? Object.values(fonts).map((font) => document.fonts.load(font)) : []
        void Promise.all(loads)
            .catch(() => undefined)
            .then(() => {
                if (current) setMeasure(() => fontMeasure())
            })
        return () => {
            current = false
        }
    }, [])
    return measure === null ? { measure: measureByCharacters, ready: false } : { measure, ready: true }
}
