import { describe, expect, it, vi } from 'vitest'

import type { RailGroup } from '../components/Rail'
import { DEFAULT_APPEARANCE, THEMES } from './appearance'
import { appearanceCommands, mergeCommands, placeCommands } from './commands'

const GROUPS: RailGroup[] = [
    { id: 'work', entries: [{ id: 'runs', label: 'Runs', href: '/runs' }] },
    {
        id: 'workspace',
        title: 'Workspace',
        entries: [
            {
                id: 'projects',
                label: 'Projects',
                entries: [{ id: 'harbor', label: 'harbor', href: '/projects/harbor' }],
            },
        ],
    },
]

describe('placeCommands', () => {
    it('makes one Go to group of every entry that leads somewhere', () => {
        const navigate = vi.fn()
        const [group, ...rest] = placeCommands(GROUPS, navigate)
        expect(rest).toEqual([])
        expect(group?.title).toBe('Go to')
        expect(group?.commands.map((command) => [command.label, command.hint])).toEqual([
            ['Runs', undefined],
            ['harbor', 'Projects'],
        ])
        group?.commands[1]?.onSelect()
        expect(navigate).toHaveBeenCalledWith('/projects/harbor', expect.objectContaining({ id: 'harbor' }))
    })

    it('makes no group without places', () => {
        expect(placeCommands([], () => undefined)).toEqual([])
    })
})

describe('appearanceCommands', () => {
    it('offers the schemes, the densities and every theme, hinting the ones in use', () => {
        const groups = appearanceCommands({ ...DEFAULT_APPEARANCE, theme: 'paper' }, () => undefined)
        expect(groups.map((group) => group.commands.length)).toEqual([3, 2, THEMES.length])
        const hinted = groups.flatMap((group) =>
            group.commands.filter((command) => command.hint !== undefined).map((command) => command.id),
        )
        expect(hinted).toEqual(['scheme-system', 'density-regular', 'theme-paper'])
    })

    it('answers with the whole settings, one part changed', () => {
        const onChange = vi.fn()
        const groups = appearanceCommands(DEFAULT_APPEARANCE, onChange)
        groups[0]?.commands.find((command) => command.id === 'scheme-dark')?.onSelect()
        expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_APPEARANCE, scheme: 'dark' })
        groups[2]?.commands.find((command) => command.id === 'theme-amber')?.onSelect()
        expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_APPEARANCE, theme: 'amber' })
    })
})

describe('mergeCommands', () => {
    const run = () => undefined
    const command = (id: string) => ({ id, label: id, onSelect: run })
    const shape = (groups: ReturnType<typeof mergeCommands>) => groups.map((group) => [group.title, group.commands.map((one) => one.id)])

    it('sorts the groups by rank, keeping their order at equal rank', () => {
        const merged = mergeCommands([
            { title: 'Go to', commands: [command('runs')] },
            { title: 'Run', rank: -1, commands: [command('rerun')] },
            { title: 'Theme', rank: 1, commands: [command('paper')] },
            { title: 'Create', commands: [command('new')] },
        ])
        expect(shape(merged)).toEqual([
            ['Run', ['rerun']],
            ['Go to', ['runs']],
            ['Create', ['new']],
            ['Theme', ['paper']],
        ])
    })

    it('lists groups of one title as one, the first command of an id standing', () => {
        const screen = { ...command('runs'), label: 'Runs of this job' }
        const merged = mergeCommands([
            { title: 'Go to', commands: [screen] },
            { title: 'Go to', rank: -1, commands: [command('runs'), command('jobs')] },
        ])
        expect(shape(merged)).toEqual([['Go to', ['runs', 'jobs']]])
        expect(merged[0]?.commands[0]?.label).toBe('Runs of this job')
        expect(merged[0]?.rank).toBe(-1)
    })

    it('leaves out a group with no commands', () => {
        expect(mergeCommands([{ title: 'Recent', commands: [] }])).toEqual([])
    })
})
