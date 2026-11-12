/** A step as a loop is told from: its code and the codes of the steps it needs. A `PipelineStep` is one. */
export interface StepNeeds {
    code: string
    needs: readonly string[]
}

/**
 * The loop an edge from `source` to `target` would close: the codes from `target` along the steps
 * that lead on from it to `source`, the shortest such way, which the new edge then joins back to
 * `target`. `[source]` alone when the edge would join a step to itself, and null when it closes none.
 */
export function cyclePath(steps: readonly StepNeeds[], source: string, target: string): string[] | null {
    if (source === target) return [source]
    const after = new Map<string, string[]>()
    for (const step of steps) for (const need of step.needs) after.set(need, [...(after.get(need) ?? []), step.code])
    const from = new Map<string, string | null>([[target, null]])
    const queue = [target]
    for (let head = 0; head < queue.length; head += 1) {
        const at = queue[head] as string
        if (at === source) {
            const path: string[] = []
            for (let back: string | null = at; back !== null; back = from.get(back) ?? null) path.unshift(back)
            return path
        }
        for (const next of after.get(at) ?? []) {
            if (from.has(next)) continue
            from.set(next, at)
            queue.push(next)
        }
    }
    return null
}

/** Whether an edge from `source` to `target` would close a loop: whether `target` already leads to `source`. */
export function wouldCycle(steps: readonly StepNeeds[], source: string, target: string): boolean {
    return cyclePath(steps, source, target) !== null
}
