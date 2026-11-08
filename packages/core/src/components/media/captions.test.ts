import { describe, expect, test } from 'vitest'

import { createStore } from '../../lib/stored'
import {
    CAPTION_STYLE,
    captionCss,
    captionSettings,
    captionTrackKey,
    chosenCaptionTrack,
    isCaptionChoice,
    type CaptionSettings,
} from './captions'

const TRACKS = [{ label: 'English', lang: 'en-GB' }, { label: 'Norsk', lang: 'nb', default: true }, { label: 'Commentary' }]

describe('caption settings', () => {
    test('are the library look until anything is chosen: outlined words, no box, the usual size', () => {
        expect(captionSettings(undefined)).toEqual(CAPTION_STYLE)
        expect(captionSettings({})).toEqual({ size: 1, color: 'white', background: 'none', edge: 'outline' })
    })

    test("take the app's defaults under what the viewer chose", () => {
        expect(captionSettings({}, { size: 0.5 }).size).toBe(0.5)
        expect(captionSettings({ size: 1.5 }, { size: 0.5 }).size).toBe(1.5)
        expect(captionSettings({ edge: 'shadow' }, { size: 0.5, background: 'translucent' })).toEqual({
            size: 0.5,
            color: 'white',
            background: 'translucent',
            edge: 'shadow',
        })
    })

    test('let a bad field fall back alone, keeping the others', () => {
        expect(captionSettings({ size: 40, color: 'chartreuse', edge: 'shadow', background: 'solid' })).toEqual({
            size: 1,
            color: 'white',
            background: 'solid',
            edge: 'shadow',
        })
        expect(captionSettings({ size: Number.NaN }, { size: 9 }).size).toBe(1)
    })

    test('read anything kept that is not an object as nothing chosen', () => {
        expect(captionSettings('big')).toEqual(CAPTION_STYLE)
        expect(captionSettings([1, 2])).toEqual(CAPTION_STYLE)
        expect(captionSettings(null)).toEqual(CAPTION_STYLE)
        expect(isCaptionChoice({})).toBe(true)
        expect(isCaptionChoice([])).toBe(false)
        expect(isCaptionChoice('size')).toBe(false)
    })

    test('carry the chosen track, off as null, and leave it out when none was chosen', () => {
        expect(captionSettings({ track: 'nb' }).track).toBe('nb')
        expect(captionSettings({ track: null }).track).toBeNull()
        expect('track' in captionSettings({})).toBe(false)
        expect('track' in captionSettings({ track: 4 })).toBe(false)
    })

    test('round-trip through a store an app holds, as the player writes one change at a time', () => {
        const store = createStore<Partial<CaptionSettings>>({})
        store.update((current) => ({ ...current, size: 0.75 }))
        store.update((current) => ({ ...current, track: 'en-GB' }))
        expect(captionSettings(store.get(), { size: 0.5 })).toEqual({ ...CAPTION_STYLE, size: 0.75, track: 'en-GB' })
    })
})

describe('the caption track', () => {
    test('is remembered by its language, or its label without one', () => {
        expect(captionTrackKey(TRACKS[0])).toBe('en-GB')
        expect(captionTrackKey(TRACKS[2])).toBe('Commentary')
        expect(captionTrackKey({ label: 'Plain', lang: '' })).toBe('Plain')
    })

    test('is the one marked default until the viewer chooses', () => {
        expect(chosenCaptionTrack(TRACKS, undefined)).toBe(1)
        expect(chosenCaptionTrack([{ label: 'English' }], undefined)).toBe(-1)
    })

    test('is none once the viewer turned captions off, whatever is marked default', () => {
        expect(chosenCaptionTrack(TRACKS, null)).toBe(-1)
    })

    test('is the chosen one by its key, or by the language its key names', () => {
        expect(chosenCaptionTrack(TRACKS, 'Commentary')).toBe(2)
        expect(chosenCaptionTrack(TRACKS, 'en-GB')).toBe(0)
        expect(chosenCaptionTrack(TRACKS, 'en')).toBe(0)
        expect(chosenCaptionTrack(TRACKS, 'en-US')).toBe(0)
    })

    test('falls back to the default when the chosen one is not offered', () => {
        expect(chosenCaptionTrack(TRACKS, 'fr')).toBe(1)
    })
})

describe('the caption CSS', () => {
    test('sizes the text against the player, never under the smallest, and draws every color from a token', () => {
        const { text, box } = captionCss({ size: 0.5, color: 'yellow', background: 'translucent', edge: 'outline' })
        expect(text.fontSize).toBe('max(var(--caption-size-min), calc(var(--caption-size) * 0.5))')
        expect(text.color).toBe('var(--caption-yellow)')
        expect(String(text.textShadow)).toContain('var(--caption-edge)')
        expect(box.backgroundColor).toBe('color-mix(in oklab, var(--caption-ground) 62%, transparent)')
    })

    test('draws no box and no edge when asked for none', () => {
        const { text, box } = captionCss({ ...CAPTION_STYLE, edge: 'none' })
        expect(text.textShadow).toBe('none')
        expect(box.backgroundColor).toBe('transparent')
        expect(captionCss({ ...CAPTION_STYLE, background: 'solid' }).box.backgroundColor).toBe('var(--caption-ground)')
    })

    test('draws an outline and a drop shadow differently', () => {
        const outline = String(captionCss({ ...CAPTION_STYLE, edge: 'outline' }).text.textShadow)
        const shadow = String(captionCss({ ...CAPTION_STYLE, edge: 'shadow' }).text.textShadow)
        expect(outline.split(', ').length).toBeGreaterThan(shadow.split(', ').length)
    })
})
