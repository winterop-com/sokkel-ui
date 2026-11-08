import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { stepState, WizardView, wizardMoves, type Step } from './StepIndicator'

const STEPS: Step[] = [
    { id: 'basics', label: 'Basics', description: 'A code and a name' },
    { id: 'source', label: 'Source' },
    { id: 'review', label: 'Review' },
]

const finish = { label: 'Create job', onFinish: () => undefined }

describe('stepState', () => {
    it('marks the steps before the current one done and those after it to come', () => {
        expect([0, 1, 2].map((index) => stepState(index, 1))).toEqual(['done', 'current', 'upcoming'])
    })
})

describe('wizardMoves', () => {
    it('offers Next and no Back on the first step', () => {
        const moved: number[] = []
        const moves = wizardMoves({ count: 3, current: 0, onCurrentChange: (index) => moved.push(index), finish, next: 'Next' })
        expect(moves.back).toBeUndefined()
        expect(moves.confirm.label).toBe('Next')
        moves.confirm.onConfirm()
        expect(moved).toEqual([1])
    })

    it('goes back from a later step, and to a done step', () => {
        const moved: number[] = []
        const moves = wizardMoves({ count: 3, current: 1, onCurrentChange: (index) => moved.push(index), finish, next: 'Next' })
        moves.back?.()
        moves.step?.(0)
        expect(moved).toEqual([0, 0])
    })

    it('finishes on the last step, shut with the reason of the step', () => {
        const moves = wizardMoves({ count: 3, current: 2, onCurrentChange: () => undefined, finish, why: 'Name the job.', next: 'Next' })
        expect(moves.confirm.label).toBe('Create job')
        expect(moves.confirm.onConfirm).toBe(finish.onFinish)
        expect(moves.confirm.why).toBe('Name the job.')
    })

    it('jumps to no step while the finish is busy', () => {
        const moves = wizardMoves({
            count: 3,
            current: 2,
            onCurrentChange: () => undefined,
            finish: { ...finish, busy: true },
            next: 'Next',
        })
        expect(moves.busy).toBe(true)
        expect(moves.step).toBeUndefined()
        expect(moves.confirm.busy).toBe(true)
    })
})

describe('WizardView', () => {
    it('stands the steps down the side with their descriptions, and along the top below the breakpoint', () => {
        const page = renderToStaticMarkup(
            <WizardView title="New job" steps={STEPS} current={1} onCurrentChange={() => undefined} finish={finish} />,
        )
        expect(page).toContain('A code and a name')
        expect(page).toContain('lg:hidden')
        expect(page).toContain('aria-current="step"')
        expect(page).toContain('>Back</button>')
        expect(page).toContain('>Next</button>')
    })

    it('draws the steps only along the top with `layout="top"`, and Cancel with `onCancel`', () => {
        const page = renderToStaticMarkup(
            <WizardView
                title="New job"
                layout="top"
                steps={STEPS}
                current={0}
                onCurrentChange={() => undefined}
                finish={finish}
                onCancel={() => undefined}
            />,
        )
        expect(page).not.toContain('A code and a name')
        expect(page).not.toContain('>Back</button>')
        expect(page).toContain('>Cancel</button>')
    })
})
