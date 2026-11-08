import type { Meta, StoryObj } from '@storybook/react-vite'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { useReducedMotion } from '@winterop-com/sokkel-ui/hooks/use-reduced-motion'
import { Surface } from '@winterop-com/sokkel-ui/Section'

/**
 * `useReducedMotion`: whether motion is reduced, from the look's own setting (Motion in the
 * toolbar, `motion` in `useAppearance`) and else the system's, following both as they change. For
 * motion a script draws, which the stylesheet cannot stop.
 */
const meta: Meta = { title: 'Patterns/Motion', parameters: { frame: 'padded' } }
export default meta

function Answer() {
    const reduced = useReducedMotion()
    return (
        <Surface className="max-w-md p-(--density-panel-pad)">
            <DescriptionList
                termWidth="8rem"
                items={[
                    { term: 'Motion', value: reduced ? 'Reduced' : 'On' },
                    { term: 'Decided by', value: 'Motion in the toolbar, or the system when it says System' },
                ]}
            />
        </Surface>
    )
}

/** The answer, changing as Motion in the toolbar or the system's setting does. */
export const Reduced: StoryObj = { name: 'Reduced motion', render: () => <Answer /> }
