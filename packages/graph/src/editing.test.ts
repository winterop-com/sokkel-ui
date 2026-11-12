import { describe, expect, it } from 'vitest'

import { blockBadge, blockMatches, groupBlocks, type PipelineBlock } from './blocks'
import { cyclePath, wouldCycle, type PipelineStep } from './PipelineGraph'
import { historyStep, type HistoryState } from './use-graph-history'

const STEPS: PipelineStep[] = [
    { code: 'fetch', needs: [] },
    { code: 'transform', needs: ['fetch'] },
    { code: 'validate', needs: ['transform'] },
    { code: 'upload', needs: ['validate'] },
    { code: 'notify', needs: [] },
]

describe('wouldCycle', () => {
    it('refuses an edge back to a step that leads to the source', () => {
        expect(wouldCycle(STEPS, 'upload', 'fetch')).toBe(true)
        expect(wouldCycle(STEPS, 'validate', 'transform')).toBe(true)
    })
    it('refuses an edge from a step to itself', () => {
        expect(wouldCycle(STEPS, 'fetch', 'fetch')).toBe(true)
    })
    it('allows an edge forward or to an unconnected step', () => {
        expect(wouldCycle(STEPS, 'fetch', 'upload')).toBe(false)
        expect(wouldCycle(STEPS, 'validate', 'notify')).toBe(false)
    })
})

describe('cyclePath', () => {
    it('names the steps from the target along to the source, the shortest way', () => {
        expect(cyclePath(STEPS, 'upload', 'fetch')).toEqual(['fetch', 'transform', 'validate', 'upload'])
        expect(cyclePath(STEPS, 'validate', 'transform')).toEqual(['transform', 'validate'])
        const shortcut = STEPS.map((step) => (step.code === 'upload' ? { ...step, needs: ['validate', 'transform'] } : step))
        expect(cyclePath(shortcut, 'upload', 'fetch')).toEqual(['fetch', 'transform', 'upload'])
    })
    it('names the step alone for an edge to itself, and nothing when no loop closes', () => {
        expect(cyclePath(STEPS, 'fetch', 'fetch')).toEqual(['fetch'])
        expect(cyclePath(STEPS, 'fetch', 'upload')).toBeNull()
        expect(cyclePath(STEPS, 'validate', 'notify')).toBeNull()
    })
})

const BLOCKS: PipelineBlock[] = [
    { kind: 'http.get', name: 'HTTP request', description: 'Fetch records from an endpoint.', group: 'source' },
    { kind: 'csv.read', group: 'source' },
    { kind: 'dedupe', name: 'Remove duplicates', group: 'transform' },
    { kind: 'upload.s3', name: 'Upload', group: 'output' },
]

const GROUPS = [
    { id: 'source', label: 'Sources' },
    { id: 'transform', label: 'Transforms' },
    { id: 'check', label: 'Checks' },
    { id: 'output', label: 'Outputs' },
]

describe('blocks', () => {
    it('matches every word against the kind, name and description', () => {
        expect(blockMatches(BLOCKS[0] as PipelineBlock, 'fetch endpoint')).toBe(true)
        expect(blockMatches(BLOCKS[0] as PipelineBlock, 'fetch file')).toBe(false)
        const sensor: PipelineBlock = { kind: 'wait-file', group: 'io', badge: 'sensor', keywords: ['poll', 'watch'] }
        expect(blockMatches(sensor, 'sensor')).toBe(true)
        expect(blockMatches(sensor, 'watch file')).toBe(true)
        expect(blockMatches(sensor, 'operator')).toBe(false)
        expect(blockMatches(BLOCKS[1] as PipelineBlock, 'CSV')).toBe(true)
        expect(blockMatches(BLOCKS[1] as PipelineBlock, '  ')).toBe(true)
    })
    it('reads a badge as plain words or a label in a tone, and finds a block by either', () => {
        const plain: PipelineBlock = { kind: 'wait-file', group: 'io', badge: 'sensor' }
        const toned: PipelineBlock = {
            kind: 'upload.s3',
            group: 'output',
            badge: { label: 'beta', tone: 'warning', title: 'Still changing' },
        }
        expect(blockBadge(plain)).toEqual({ label: 'sensor' })
        expect(blockBadge(toned)).toEqual({ label: 'beta', tone: 'warning', title: 'Still changing' })
        expect(blockBadge({ kind: 'dedupe', group: 'transform', badge: '' })).toBeNull()
        expect(blockMatches(toned, 'beta')).toBe(true)
    })
    it('lists matching blocks under their groups in order, leaving empty groups out', () => {
        expect(groupBlocks(BLOCKS, GROUPS).map((entry) => entry.group.id)).toEqual(['source', 'transform', 'output'])
        expect(groupBlocks(BLOCKS, GROUPS, 'up').map((entry) => entry.blocks.map((block) => block.kind))).toEqual([
            ['dedupe'],
            ['upload.s3'],
        ])
    })
})

const start: HistoryState<number> = { past: [], present: 0, future: [], group: null, revision: 0 }

describe('historyStep', () => {
    it('adds one step per group and undoes and redoes it', () => {
        let state = historyStep(start, { type: 'set', update: 1, group: 'a', limit: 10 })
        state = historyStep(state, { type: 'set', update: (n: number) => n + 1, group: 'a', limit: 10 })
        state = historyStep(state, { type: 'set', update: 5, group: 'b', limit: 10 })
        expect(state.past).toEqual([0, 2])
        state = historyStep(state, { type: 'undo' })
        expect(state.present).toBe(2)
        state = historyStep(state, { type: 'undo' })
        expect(state.present).toBe(0)
        expect(state.revision).toBe(2)
        state = historyStep(state, { type: 'redo' })
        expect(state.present).toBe(2)
        expect(state.future).toEqual([5])
    })
    it('starts a new step after an undo even in the same group, and drops what was undone', () => {
        let state = historyStep(start, { type: 'set', update: 1, group: 'a', limit: 10 })
        state = historyStep(state, { type: 'undo' })
        state = historyStep(state, { type: 'set', update: 3, group: 'a', limit: 10 })
        expect(state.past).toEqual([0])
        expect(state.future).toEqual([])
    })
    it('adds nothing for a change that leaves the value, and keeps at most the limit', () => {
        expect(historyStep(start, { type: 'set', update: 0, group: 'a', limit: 10 })).toBe(start)
        let state = start
        for (let n = 1; n <= 5; n += 1) state = historyStep(state, { type: 'set', update: n, group: String(n), limit: 3 })
        expect(state.past).toEqual([2, 3, 4])
    })
    it('does nothing to undo or redo at either end', () => {
        expect(historyStep(start, { type: 'undo' })).toBe(start)
        expect(historyStep(start, { type: 'redo' })).toBe(start)
    })
})
