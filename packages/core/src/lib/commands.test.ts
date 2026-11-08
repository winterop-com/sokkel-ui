import { describe, expect, it, vi } from 'vitest'

import type { PaletteCommand } from '../components/CommandPalette'
import type { RailGroup } from '../components/Rail'
import { DEFAULT_APPEARANCE, THEMES } from './appearance'
import { appearanceCommands, filterCommands, mergeCommands, placeCommands, termScore } from './commands'

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

    it("hints a place by its description before its parent's label", () => {
        const [group] = placeCommands(
            [
                {
                    id: 'work',
                    entries: [
                        { id: 'runs', label: 'Runs', description: 'Every run, newest first', href: '/runs' },
                        {
                            id: 'projects',
                            label: 'Projects',
                            entries: [{ id: 'harbor', label: 'harbor', description: 'The export project', href: '/projects/harbor' }],
                        },
                    ],
                },
            ],
            () => undefined,
        )
        expect(group?.commands.map((command) => command.hint)).toEqual(['Every run, newest first', 'The export project'])
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

describe('placeCommands keywords', () => {
    it("gives a place's keywords to its command", () => {
        const [group] = placeCommands(
            [{ id: 'work', entries: [{ id: 'runs', label: 'Runs', keywords: ['history'], href: '/runs' }] }],
            () => undefined,
        )
        expect(group?.commands[0]?.keywords).toEqual(['history'])
    })
})

describe('appearanceCommands from parts', () => {
    it("offers only the parts given with a callback, and calls that part's", () => {
        const onSchemeChange = vi.fn()
        const onThemeChange = vi.fn()
        const groups = appearanceCommands(
            { scheme: 'dark', onSchemeChange, theme: 'paper', onThemeChange },
            {
                themes: [
                    { value: 'paper', label: 'Paper' },
                    { value: 'steel', label: 'Steel' },
                ],
            },
        )
        expect(groups.map((group) => group.title)).toEqual(['Scheme', 'Theme'])
        expect(groups.flatMap((group) => group.commands.filter((one) => one.hint !== undefined).map((one) => one.id))).toEqual([
            'scheme-dark',
            'theme-paper',
        ])
        groups[0]?.commands.find((command) => command.id === 'scheme-light')?.onSelect()
        groups[1]?.commands.find((command) => command.id === 'theme-steel')?.onSelect()
        expect(onSchemeChange).toHaveBeenCalledWith('light')
        expect(onThemeChange).toHaveBeenCalledWith('steel')
    })
})

describe('termScore', () => {
    const command = (label: string, more: Partial<PaletteCommand> = {}): PaletteCommand => ({
        id: label,
        label,
        onSelect: () => undefined,
        ...more,
    })

    it('wants every word typed, somewhere in the command', () => {
        expect(termScore(command('Schedules', { hint: 'When each job runs' }), 'run sched')).toBeGreaterThan(0)
        expect(termScore(command('Runs'), 'run sched')).toBe(0)
        expect(termScore(command('Runs', { keywords: ['history'] }), 'hist')).toBe(1)
        expect(termScore(command('Paper'), 'theme', 'Theme')).toBe(1)
    })

    it('ranks a label starting with the query, then holding it, then holding every word', () => {
        expect(termScore(command('Runs'), 'ru')).toBe(4)
        expect(termScore(command('Rerun a job'), 'run')).toBe(3)
        expect(termScore(command('Job runs'), 'runs job')).toBe(2)
        expect(termScore(command('Anything'), '  ')).toBe(1)
    })
})

describe('filterCommands', () => {
    const command = (label: string, keywords?: string[]): PaletteCommand => ({ id: label, label, keywords, onSelect: () => undefined })

    it('keeps what matches, best first, the groups by their best', () => {
        const groups = filterCommands(
            [
                { title: 'Create', commands: [command('New run'), command('New job')] },
                { title: 'Go to', commands: [command('Every run', ['history']), command('Runs'), command('Jobs')] },
            ],
            'run',
            termScore,
        )
        expect(groups.map((group) => [group.title, group.commands.map((one) => one.label)])).toEqual([
            ['Go to', ['Runs', 'Every run']],
            ['Create', ['New run']],
        ])
    })

    it('leaves the groups as they are for an empty query', () => {
        const given = [{ title: 'Go to', commands: [command('Runs')] }]
        expect(filterCommands(given, ' ', termScore)).toEqual(given)
    })
})
