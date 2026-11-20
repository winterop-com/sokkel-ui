import { describe, expect, test, vi } from 'vitest'

import { LABEL_RANK, labelRegistry, placeClear, type RenderedPoint } from './layer'
import { measureBox } from './LinkLayer'
import { placeLabels, trackLabelBox } from './TrackLayer'
import { zoneLabelBox } from './ZoneLayer'

const at = (key: string, x: number, y: number, text: string): RenderedPoint => ({ key, x, y, text })

describe('labels across layers', () => {
    // A track's label runs right of its point; a zone's middle and a link's middle fall on it.
    const track = at('ferry', 100, 100, 'Ferry Juniper')
    const zones = [at('boarding', 150, 100, 'Pilot boarding'), at('harbor', 400, 100, 'Harbor')]
    const links = [at('relay', 150, 124, '12 km · 045°'), at('patrol', 400, 124, '8 km · 090°'), at('far', 700, 300, '3 km · 010°')]

    /** Each layer placed as the map draws them: tracks, then zones clear of the tracks, then links clear of both. */
    function place(selected: string | null = null) {
        const labels = labelRegistry()
        const tracks = placeLabels([track], selected, 24)
        labels.set(
            'wui-watch',
            LABEL_RANK.track,
            tracks.map((point) => trackLabelBox(point, 24)),
        )
        const named = placeClear(zones, zoneLabelBox, selected, labels.before(LABEL_RANK.zone))
        labels.set('wui-areas', LABEL_RANK.zone, named.map(zoneLabelBox))
        const measured = placeClear(links, measureBox, selected, labels.before(LABEL_RANK.link))
        return { zones: named.map((point) => point.key), links: measured.map((point) => point.key) }
    }

    test("a zone's label yields to a track's, and a link's chip to both", () => {
        expect(place()).toEqual({ zones: ['harbor'], links: ['far'] })
    })

    test("the selected zone's label and link's chip are placed all the same", () => {
        expect(place('boarding').zones).toEqual(['boarding', 'harbor'])
        expect(place('relay').links).toEqual(['relay', 'far'])
    })

    test('a layer of a lower rank never yields to one of a higher', () => {
        const labels = labelRegistry()
        labels.set('wui-areas', LABEL_RANK.zone, [[0, 0, 10, 10]])
        expect(labels.before(LABEL_RANK.track)).toEqual([])
        expect(labels.before(LABEL_RANK.zone)).toEqual([])
        expect(labels.before(LABEL_RANK.link)).toEqual([[0, 0, 10, 10]])
    })

    test('the registry tells its readers only of a change, keeps one list until then, and drops a layer that writes none', () => {
        const labels = labelRegistry()
        const heard = vi.fn()
        const stop = labels.subscribe(heard)
        labels.set('wui-watch', LABEL_RANK.track, [[0, 0, 10, 10]])
        const first = labels.before(LABEL_RANK.zone)
        labels.set('wui-watch', LABEL_RANK.track, [[0, 0, 10, 10]])
        expect(heard).toHaveBeenCalledTimes(1)
        expect(labels.before(LABEL_RANK.zone)).toBe(first)
        labels.set('wui-watch', LABEL_RANK.track, [])
        expect(heard).toHaveBeenCalledTimes(2)
        expect(labels.before(LABEL_RANK.zone)).toEqual([])
        stop()
        labels.set('wui-watch', LABEL_RANK.track, [[0, 0, 10, 10]])
        expect(heard).toHaveBeenCalledTimes(2)
    })
})
