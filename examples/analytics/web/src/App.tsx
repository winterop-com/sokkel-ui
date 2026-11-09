import { StatusProvider } from '@winterop-com/sokkel-ui/StatusProvider'
import { Toaster, toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { useEffect, useRef } from 'react'

import { useFrame } from 'tidevann-shared/frame'
import { Analytics } from './Analytics'
import { onStream } from './backend'
import { PLAN_NAMES, PRICE } from './model'
import { STATUSES } from './parts'
import { AppProvider, useApp } from './state'
import { go } from './view'

/** Notes in the corner for the stream's big orders and the teams that leave, as the settings ask. */
function StreamNotes() {
    const { prefs, money, href } = useApp()
    const asked = useRef({ prefs, money, href })
    asked.current = { prefs, money, href }
    useEffect(
        () =>
            onStream(({ change, team, billed }) => {
                const { prefs: now, money: write, href: link } = asked.current
                const open = { label: 'Open', onClick: () => go(link(`customers/${team.id}`)) }
                if (now.bigOrder > 0 && billed >= now.bigOrder)
                    toast.add({
                        type: 'success',
                        title: `${team.name}: ${write(billed)} billed`,
                        description:
                            change.kind === 'upgrade'
                                ? `Moved to ${PLAN_NAMES[change.plan]} with ${String(change.seats)} seats`
                                : 'Bought more seats',
                        actionProps: { children: open.label, onClick: open.onClick },
                    })
                if (now.notifyChurn && change.kind === 'churn') {
                    const before = team.changes[team.changes.length - 1]
                    toast.add({
                        type: 'warning',
                        title: `${team.name} left ${PLAN_NAMES[change.plan]}`,
                        description: before === undefined ? undefined : `It paid ${write(PRICE[before.plan] * before.seats)} a month.`,
                        actionProps: { children: open.label, onClick: open.onClick },
                    })
                }
            }),
        [],
    )
    return null
}

/** The Analytics example: Tidevann's live business dashboard, in a browser or either desktop shell. */
export function App() {
    const frame = useFrame()
    return (
        <TooltipProvider>
            <StatusProvider statuses={STATUSES}>
                <Toaster>
                    <AppProvider>
                        <StreamNotes />
                        <Analytics frame={frame} />
                    </AppProvider>
                </Toaster>
            </StatusProvider>
        </TooltipProvider>
    )
}
