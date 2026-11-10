/** One Tidevann run as a side panel's tabs: its details, its log and its outputs. */

import { FileText, Info, Package } from 'lucide-react'

import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { JsonTree } from '@winterop-com/sokkel-ui/JsonTree'
import { LogView, type LogLine } from '@winterop-com/sokkel-ui/LogView'
import { PanelSection, type SidePanelTab } from '@winterop-com/sokkel-ui/SidePanel'
import { StatusChip } from '@winterop-com/sokkel-ui/StatusChip'

const LOG: LogLine[] = [
    { at: '09:52:01.114', level: 'info', source: 'fetch', text: 'reading orders from api.example.org since 2026-11-09T09:50Z' },
    { at: '09:52:03.870', level: 'info', source: 'fetch', text: 'fetched 1,204 records in 3 pages' },
    { at: '09:52:04.002', level: 'info', source: 'transform', text: 'mapping 1,204 records to the export shape' },
    { at: '09:52:04.911', level: 'warning', source: 'transform', text: '3 records have no region; kept with region unset' },
    { at: '09:52:05.240', level: 'info', source: 'validate', text: 'all 1,204 records pass the export schema' },
    { at: '09:52:07.618', level: 'info', source: 'upload', text: 'wrote exports/harbor/2026-11-10.jsonl (412 KB)' },
    { at: '09:52:07.702', level: 'info', source: 'notify', text: 'sent the digest to ada and grace' },
]

const OUTPUTS = {
    file: 'exports/harbor/2026-11-10.jsonl',
    records: 1204,
    skipped: 0,
    regions: { europe: 812, americas: 297, asia: 92, unset: 3 },
}

/** The run's tabs, the first `count` of Details, Log and Outputs. */
export function runPanelTabs(count = 3): SidePanelTab[] {
    const tabs: SidePanelTab[] = [
        {
            id: 'details',
            label: 'Details',
            icon: Info,
            content: (
                <PanelSection title="Run">
                    <DescriptionList
                        items={[
                            { term: 'Run', value: 'run-4821', code: true },
                            { term: 'Job', value: 'nightly-export', code: true },
                            { term: 'Project', value: 'harbor' },
                            { term: 'State', value: <StatusChip status="succeeded" /> },
                            { term: 'Started by', value: 'ada' },
                            { term: 'Duration', value: '6.6 s', numeric: true },
                            { term: 'Records', value: '1,204', numeric: true },
                        ]}
                    />
                </PanelSection>
            ),
        },
        { id: 'log', label: 'Log', icon: FileText, content: <LogView lines={LOG} wrap numbered={false} className="m-3" /> },
        {
            id: 'outputs',
            label: 'Outputs',
            icon: Package,
            content: (
                <PanelSection title="Outputs">
                    <JsonTree value={OUTPUTS} open={2} />
                </PanelSection>
            ),
        },
    ]
    return tabs.slice(0, count)
}
