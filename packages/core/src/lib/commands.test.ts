import { describe, expect, it, vi } from 'vitest'

import type { RailGroup } from '../components/Rail'
import { DEFAULT_APPEARANCE, THEMES } from './appearance'
import { appearanceCommands, placeCommands } from './commands'

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
