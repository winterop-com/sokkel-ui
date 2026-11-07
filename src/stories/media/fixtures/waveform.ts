/**
 * A track's loudness from start to end, each level from 0 to 1, drawn from `seed` alone so a story
 * shows the same shape every time: a fade in and out, louder and quieter sections, and the grain of
 * single beats.
 */
export function waveformOf(seed: number, length = 180): number[] {
    return Array.from({ length }, (_, index) => {
        const at = index / length
        const fade = Math.min(1, at * 12) * Math.min(1, (1 - at) * 16)
        const section = 0.7 + 0.3 * Math.sin(at * Math.PI * 5 + seed)
        const beat = 0.45 + 0.55 * Math.abs(Math.sin(index * 1.7 + seed * 3) * Math.cos(index * 0.37 + seed))
        return Math.max(0.08, fade * section * beat)
    })
}
