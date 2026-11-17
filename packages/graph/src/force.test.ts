import { describe, expect, it } from 'vitest'

import { FORCE_LINK, forceSimulation, loadForce, settle, type ForceBody } from './force'

/** Two linked jobs, a third linked to one of them, and a fourth with no link. */
const bodies = (): ForceBody[] => ['nightly-export', 'sync-inventory', 'rebuild-index', 'send-digest'].map((id) => ({ id, radius: 30 }))
const LINKS = [
    { source: 'nightly-export', target: 'sync-inventory' },
    { source: 'sync-inventory', target: 'rebuild-index' },
]

const distance = (a: ForceBody, b: ForceBody) => Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0))

describe('the force layout', () => {
    it('settles linked bodies near the link length and keeps every body apart', async () => {
        const using = await loadForce()
        const placed = bodies()
        const simulation = forceSimulation(using, placed, LINKS)
        settle(simulation, 600)
        expect(simulation.alpha()).toBeLessThan(simulation.alphaMin())
        const [exportJob, sync, index, digest] = placed
        expect(distance(exportJob, sync)).toBeGreaterThan(FORCE_LINK * 0.6)
        expect(distance(exportJob, sync)).toBeLessThan(FORCE_LINK * 2.2)
        for (const [a, b] of [
            [exportJob, index],
            [exportJob, digest],
            [sync, digest],
            [index, digest],
        ])
            expect(distance(a, b)).toBeGreaterThanOrEqual(59)
    })

    it('settles the same network the same way each time', async () => {
        const using = await loadForce()
        const run = () => {
            const placed = bodies()
            settle(forceSimulation(using, placed, LINKS), 600)
            return placed.map((body) => [Math.round(body.x ?? 0), Math.round(body.y ?? 0)])
        }
        expect(run()).toEqual(run())
    })

    it('holds a body where it is pinned while the rest move around it', async () => {
        const using = await loadForce()
        const placed = bodies()
        const simulation = forceSimulation(using, placed, LINKS)
        settle(simulation, 600)
        const [exportJob, sync] = placed
        exportJob.fx = 400
        exportJob.fy = -300
        simulation.alpha(0.6)
        settle(simulation, 600)
        expect([exportJob.x, exportJob.y]).toEqual([400, -300])
        // Its neighbor followed it.
        expect(distance(exportJob, sync)).toBeLessThan(FORCE_LINK * 2.5)
    })
})
