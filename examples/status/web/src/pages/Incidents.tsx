import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { SearchField } from '@winterop-com/sokkel-ui/SearchField'
import { Segmented } from '@winterop-com/sokkel-ui/Segmented'
import { Toolbar } from '@winterop-com/sokkel-ui/Toolbar'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Plus, SearchX } from 'lucide-react'
import { useState } from 'react'

import type { Person } from '../data'
import { incidentActions, IncidentTable, touched } from '../parts/IncidentTable'
import { useRows } from '../rows'
import { healthCss } from '../status'

type Shown = 'open' | 'resolved' | 'all'

/** Every incident, open ones first, with a search over their titles, codes and what they touch. */
export function Incidents({ me, onReport }: { me: Person; onReport: () => void }) {
    const rows = useRows()
    const [shown, setShown] = useState<Shown>('open')
    const [search, setSearch] = useState('')
    const all = rows.incidents ?? []
    const open = all.filter((incident) => incident.state !== 'resolved')
    const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const listed = all
        .filter((incident) => shown === 'all' || (shown === 'open') === (incident.state !== 'resolved'))
        .filter((incident) => {
            const text = [incident.title, incident.code, incident.assignee, ...touched(incident)].join(' ').toLowerCase()
            return words.every((word) => text.includes(word))
        })
    return (
        <Stack gap="section" className="h-full">
            <PageHeader
                title="Incidents"
                count={`${String(open.length)} open`}
                actions={
                    <Button onClick={onReport}>
                        <Plus aria-hidden />
                        New
                    </Button>
                }
            />
            <Toolbar>
                <Segmented
                    label="Incidents shown"
                    value={shown}
                    onValueChange={setShown}
                    options={[
                        { value: 'open', label: 'Open', count: open.length, dot: healthCss('outage') },
                        { value: 'resolved', label: 'Resolved', count: all.length - open.length, dot: healthCss('operational') },
                        { value: 'all', label: 'All', count: all.length },
                    ]}
                />
            </Toolbar>
            <PageState loading={rows.incidents === undefined && rows.error === undefined} error={rows.error}>
                <IncidentTable
                    rows={listed}
                    className="min-h-0 flex-1"
                    search={<SearchField value={search} onChange={setSearch} placeholder="Search" />}
                    actions={(incident) => incidentActions(incident, me, rows.onCall?.person)}
                    empty={
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <SearchX aria-hidden />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {words.length > 0 ? 'Nothing matches' : shown === 'open' ? 'Nothing open' : 'No incidents'}
                                </EmptyTitle>
                                <EmptyDescription>
                                    {words.length > 0 ? 'Try fewer words, or look among all incidents.' : 'Every incident is resolved.'}
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    }
                />
            </PageState>
        </Stack>
    )
}
