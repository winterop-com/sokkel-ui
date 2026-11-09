import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { DashboardGrid } from '@winterop-com/sokkel-ui/dashboard/DashboardGrid'

import { CountriesPanel, CustomersPanel, FeedPanel, FunnelPanel, KpiPanels, RegionsPanel, RevenuePanel } from '../panels'
import { ViewBar } from '../parts'
import { useLoaded } from '../state'
import { rangeName } from '../view'

/** The overview: the key figures, revenue by plan, the sign-up funnel, revenue by country, the live feed, the top customers and the regions. */
export function Overview() {
    const { view, prefs } = useLoaded()
    return (
        <>
            <PageHeader
                title="Overview"
                description={`${prefs.workspace}'s sales, ${rangeName(view.range).toLowerCase()}${view.compare ? ', against the period before' : ''}.`}
            />
            <ViewBar />
            <DashboardGrid>
                <KpiPanels />
                <RevenuePanel />
                <FunnelPanel />
                <CountriesPanel />
                <FeedPanel />
                <CustomersPanel />
                <RegionsPanel />
            </DashboardGrid>
        </>
    )
}
