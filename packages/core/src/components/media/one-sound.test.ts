import { afterEach, describe, expect, it } from 'vitest'

import { claimSound, soundHolder, type SoundHolder } from './one-sound'

/** A player that counts how often it was asked to stop. */
function player(): SoundHolder & { paused: number } {
    const made = {
        paused: 0,
        pause: () => {
            made.paused += 1
        },
    }
    return made
}

let releases: (() => void)[] = []
const claim = (holder: SoundHolder) => {
    const release = claimSound(holder)
    releases.push(release)
    return release
}

afterEach(() => {
    for (const release of releases) release()
    releases = []
})

describe('claimSound', () => {
    it('holds the sound for the first claimant and pauses nobody', () => {
        const album = player()
        claim(album)
        expect(soundHolder()).toBe(album)
        expect(album.paused).toBe(0)
    })

    it('pauses the holder when another claims the sound', () => {
        const album = player()
        const film = player()
        claim(album)
        claim(film)
        expect(album.paused).toBe(1)
        expect(film.paused).toBe(0)
        expect(soundHolder()).toBe(film)
    })

    it('pauses only the one holding it, not every player that ever claimed', () => {
        const first = player()
        const second = player()
        const third = player()
        claim(first)
        claim(second)
        claim(third)
        expect(first.paused).toBe(1)
        expect(second.paused).toBe(1)
        expect(third.paused).toBe(0)
    })

    it('pauses nothing when the holder claims again', () => {
        const album = player()
        claim(album)
        claim(album)
        expect(album.paused).toBe(0)
        expect(soundHolder()).toBe(album)
    })

    it('gives the sound up on release, so the next claim pauses nobody', () => {
        const album = player()
        const film = player()
        const release = claim(album)
        release()
        expect(soundHolder()).toBeNull()
        claim(film)
        expect(album.paused).toBe(0)
    })

    it('ignores a late release from a player another claim already paused', () => {
        const album = player()
        const film = player()
        const releaseAlbum = claim(album)
        claim(film)
        releaseAlbum()
        expect(soundHolder()).toBe(film)
        const voice = player()
        claim(voice)
        expect(film.paused).toBe(1)
    })

    it('takes the sound back when a paused player starts again', () => {
        const album = player()
        const film = player()
        claim(album)
        claim(film)
        claim(album)
        expect(film.paused).toBe(1)
        expect(album.paused).toBe(1)
        expect(soundHolder()).toBe(album)
    })

    it('still hands the sound over when the holder throws on pause', () => {
        const broken: SoundHolder = {
            pause: () => {
                throw new Error('cannot pause')
            },
        }
        const film = player()
        claim(broken)
        expect(() => claim(film)).not.toThrow()
        expect(soundHolder()).toBe(film)
    })

    it('takes a media element as it is, by its own pause', () => {
        const element = {
            paused: false,
            pause: () => {
                element.paused = true
            },
        }
        claim(element as unknown as HTMLMediaElement)
        claim(player())
        expect(element.paused).toBe(true)
    })
})
