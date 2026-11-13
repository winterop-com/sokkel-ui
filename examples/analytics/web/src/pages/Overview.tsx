import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'

import { useArrangedBoard } from '../arrange'
import { ViewBar } from '../parts'
import { useLoaded } from '../state'
import { rangeName } from '../view'

/** The overview: the key figures and panels as the person arranged them, by default revenue, the funnel, countries, the live feed, top customers and regions. */
export function Overview() {
    const { view, prefs } = useLoaded()
    const board = useArrangedBoard('overview')
    return (
        <>
            <PageHeader
                title="Overview"
                description={`${prefs.workspace}'s sales, ${rangeName(view.range).toLowerCase()}${view.compare ? ', against the period before' : ''}.`}
                actions={board.actions}
            />
            <ViewBar />
            {board.grid}
        </>
    )
}
