import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Row, Stack } from '../../components/Layout'
import { StarButton } from '../../components/StarButton'
import { TooltipProvider } from '../../components/ui/tooltip'
import { Specimen } from '../fixtures/Specimen'

/**
 * A favorite toggle on the icon button: an outlined star that fills in the accent once starred.
 * Its label says what a press does, "Add to favorites" or "Remove from favorites", both words an
 * app can replace.
 */
const meta: Meta = {
    title: 'Primitives/Actions/Star button',
    parameters: { frame: 'column' },
    decorators: [
        (Story) => (
            <TooltipProvider>
                <Story />
            </TooltipProvider>
        ),
    ],
}
export default meta

function HeldStar({
    from = false,
    variant,
    size,
}: {
    from?: boolean
    variant?: 'ghost' | 'outline'
    size?: 'icon-xs' | 'icon-sm' | 'icon'
}) {
    const [starred, setStarred] = useState(from)
    return <StarButton starred={starred} onStarredChange={setStarred} variant={variant} size={size} />
}

/** Not starred: the outline in the quiet ink. Press it to star. */
export const Off: StoryObj = { render: () => <HeldStar /> }

/** Starred: the star filled in the accent and the button pressed. Press it to take the star away. */
export const Starred: StoryObj = { render: () => <HeldStar from /> }

/** Off and starred at each size, quiet as a row's action and outlined beside the buttons of a header. */
export const Variants: StoryObj = {
    render: () => (
        <Stack gap="lg">
            {(['ghost', 'outline'] as const).map((variant) => (
                <Specimen key={variant} label={variant}>
                    <Row gap="lg">
                        {(['icon-xs', 'icon-sm', 'icon'] as const).map((size) => (
                            <Row key={size} gap="2xs">
                                <HeldStar variant={variant} size={size} />
                                <HeldStar from variant={variant} size={size} />
                            </Row>
                        ))}
                    </Row>
                </Specimen>
            ))}
        </Stack>
    ),
}
