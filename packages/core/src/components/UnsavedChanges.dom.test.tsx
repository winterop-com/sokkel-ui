// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { hashRouteHead, useUnsavedChanges, type UnsavedChanges } from './UnsavedChanges'

declare global {
    var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

let root: Root | undefined
let guard: UnsavedChanges | undefined

function Page() {
    guard = useUnsavedChanges(true, { hashRoutes: true, overlays: ['settings'] })
    return null
}

/** Sets the hash as a link or the app would, and waits for the guard to hear it. */
async function moveTo(hash: string) {
    await act(async () => {
        window.location.hash = hash
        await new Promise((resolve) => setTimeout(resolve, 0))
    })
}

describe('useUnsavedChanges overlays', () => {
    beforeAll(() => {
        globalThis.IS_REACT_ACT_ENVIRONMENT = true
    })
    afterEach(() => {
        act(() => root?.unmount())
        root = undefined
    })

    it('reads the first part of a hash route', () => {
        expect(hashRouteHead('http://example.org/#/settings/theme?tab=look')).toBe('settings')
        expect(hashRouteHead('#/jobs/nightly-export')).toBe('jobs')
        expect(hashRouteHead('http://example.org/')).toBe('')
    })

    it('asks nothing on opening an overlay and going back from it, and asks on leaving', async () => {
        window.location.hash = '#/jobs/nightly-export'
        const host = document.createElement('div')
        document.body.append(host)
        root = createRoot(host)
        act(() => root?.render(<Page />))
        await moveTo('#/settings')
        expect(guard?.asking).toBe(false)
        expect(window.location.hash).toBe('#/settings')
        await moveTo('#/settings/theme')
        expect(guard?.asking).toBe(false)
        await moveTo('#/jobs/nightly-export')
        expect(guard?.asking).toBe(false)
        expect(window.location.hash).toBe('#/jobs/nightly-export')
        await moveTo('#/runs')
        expect(guard?.asking).toBe(true)
        expect(window.location.hash).toBe('#/jobs/nightly-export')
    })
})
