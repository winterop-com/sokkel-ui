import type { SoundFrame } from '../../../components/media/sound'

const unit = (value: number) => Math.min(1, Math.max(0, value))
const hump = (at: number, middle: number, width: number) => Math.exp(-((at - middle) ** 2) / width)

/** A moment of music as levels, low to high: a strong bass, a body of mids, highs falling away, and the jagged detail between. */
export const SPECTRUM_LEVELS: readonly number[] = Array.from({ length: 64 }, (_, index) => {
    const at = index / 63
    const body = 0.56 * hump(at, 0.07, 0.006) + 0.42 * hump(at, 0.34, 0.018) + 0.32 * hump(at, 0.62, 0.02) + 0.2 * hump(at, 0.86, 0.01)
    const detail = 0.12 * Math.sin(index * 1.9) * Math.cos(index * 0.37) + 0.06 * Math.sin(index * 5.3)
    return unit(0.06 + 0.2 * (1 - at) + body + detail)
})

/** Four cycles of a tone with its overtones, as an oscilloscope shows a held note. */
export const WAVE_SAMPLES: readonly number[] = Array.from({ length: 640 }, (_, index) => {
    const turn = (2 * Math.PI * index) / 160
    return 0.52 * Math.sin(turn) + 0.2 * Math.sin(2 * turn + 0.6) + 0.12 * Math.sin(5 * turn + 1.1) + 0.05 * Math.sin(11 * turn + 0.3)
})

/** The still frame the stories draw. */
export const FRAME: SoundFrame = { levels: SPECTRUM_LEVELS, samples: WAVE_SAMPLES }
