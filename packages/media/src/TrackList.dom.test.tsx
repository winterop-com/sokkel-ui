// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { TrackList, type Track, type TrackRowProps } from './TrackList'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let host: HTMLElement | undefined

beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = undefined
    host = undefined
})

const tracks: Track[] = Array.from({ length: 40 }, (_, at) => ({ id: `t${String(at)}`, title: `Harbor ${String(at + 1)}`, duration: 200 }))
const drawn = new Map<number, number>()

/** A row that counts how often it is drawn. */
function CountedRow({ track: _track, index, ...props }: TrackRowProps) {
    drawn.set(index, (drawn.get(index) ?? 0) + 1)
    return <li {...props} />
}

const onPlay = () => undefined

describe('TrackList', () => {
    it('draws only the current row again as its position is reported', () => {
        host = document.createElement('div')
        document.body.append(host)
        const made = createRoot(host)
        root = made
        const draw = (position: number) =>
            act(() =>
                made.render(
                    <TrackList
                        tracks={tracks}
                        current="t3"
                        playing
                        position={position}
                        progress="bar"
                        follow={false}
                        onPlay={onPlay}
                        row={CountedRow}
                    />,
                ),
            )
        draw(10)
        drawn.clear()
        draw(11)
        draw(12)
        expect([...drawn.keys()]).toEqual([3])
        const bar = host.querySelector<HTMLElement>('[data-slot="track-progress"]')
        expect(bar?.style.transform).toBe('scaleX(0.06)')
    })
})
