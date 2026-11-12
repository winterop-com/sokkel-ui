import { SlidersHorizontal } from 'lucide-react'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { GraphToolbarButton } from './GraphToolbar'
import type { GraphDirection, GraphRouting, GraphSpacing } from './layout'

/** How a reader has chosen to lay a graph out. */
export interface GraphLayoutChoice {
    direction: GraphDirection
    routing: GraphRouting
    spacing: GraphSpacing
}

/** The words a layout menu says. */
export interface GraphLayoutMenuWords {
    /** The button's and the menu's name. */
    label: string
    direction: string
    right: string
    down: string
    routing: string
    orthogonal: string
    polyline: string
    splines: string
    spacing: string
    compact: string
    normal: string
    roomy: string
}

export const GRAPH_LAYOUT_MENU_WORDS: GraphLayoutMenuWords = {
    label: 'Layout',
    direction: 'Direction',
    right: 'Left to right',
    down: 'Top to bottom',
    routing: 'Edges',
    orthogonal: 'Right angles',
    polyline: 'Straight',
    splines: 'Curves',
    spacing: 'Spacing',
    compact: 'Compact',
    normal: 'Normal',
    roomy: 'Roomy',
}

const DIRECTIONS: readonly GraphDirection[] = ['right', 'down']
const ROUTINGS: readonly GraphRouting[] = ['orthogonal', 'polyline', 'splines']
const SPACINGS: readonly GraphSpacing[] = ['compact', 'normal', 'roomy']

export interface GraphLayoutMenuProps {
    value: GraphLayoutChoice
    onValueChange: (value: GraphLayoutChoice) => void
    /** Leaves a choice out of the menu, such as the direction where the app decides it. */
    omit?: readonly (keyof GraphLayoutChoice)[]
    /** The routings offered, in this order; all three when left out. */
    routings?: readonly GraphRouting[]
    words?: Partial<GraphLayoutMenuWords>
    className?: string
}

/**
 * A toolbar button that opens how the graph is laid out: its direction, how its edges are routed
 * and how much room it keeps, each a choice of one. It is drawn as a graph toolbar's own button, so
 * it stands in a `GraphToolbar` or a section's head alike; a view handed the choice fits again.
 */
export function GraphLayoutMenu({ value, onValueChange, omit = [], routings = ROUTINGS, words: given, className }: GraphLayoutMenuProps) {
    const words = { ...GRAPH_LAYOUT_MENU_WORDS, ...given }
    const groups = (
        [
            ['direction', DIRECTIONS],
            ['routing', routings],
            ['spacing', SPACINGS],
        ] as const
    ).filter(([key]) => !omit.includes(key))
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <GraphToolbarButton label={words.label} className={className}>
                        <SlidersHorizontal aria-hidden />
                    </GraphToolbarButton>
                }
            />
            <DropdownMenuContent align="end" className="w-48">
                {groups.map(([key, options], index) => (
                    <DropdownMenuGroup key={key}>
                        {index > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel>{words[key]}</DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                            value={value[key]}
                            onValueChange={(next: string) => onValueChange({ ...value, [key]: next })}
                        >
                            {options.map((option) => (
                                <DropdownMenuRadioItem key={option} value={option}>
                                    {words[option]}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
