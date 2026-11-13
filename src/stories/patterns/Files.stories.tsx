import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { FileGrid, FileList, sortFiles, type FileEntry, type FileSort } from '@winterop-com/sokkel-ui/FileList'
import { FilePreview } from '@winterop-com/sokkel-ui/FilePreview'
import { moveItem } from '@winterop-com/sokkel-ui/lib/reorder'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { DropZone, UploadTray, type Upload } from '@winterop-com/sokkel-ui/UploadTray'
import { CHART, HARBOR_DUSK, LIGHTHOUSE, PINES } from '../fixtures/photos'
import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'

/** A folder's files as rows and as tiles, a file's contents by kind, and uploads on their way. */
const FILES: FileEntry[] = [
    { id: 'exports', name: 'exports', kind: 'folder', modified: 'Nov 4, 02:01', modifiedAt: '2026-11-04T02:01', owner: 'ada' },
    {
        id: 'orders',
        name: 'orders-2026-11-04.csv',
        kind: 'table',
        size: 48_210,
        modified: 'Nov 4, 02:00',
        modifiedAt: '2026-11-04T02:00',
        owner: 'ada',
    },
    {
        id: 'summary',
        name: 'run-summary.json',
        kind: 'json',
        size: 1_204,
        modified: 'Nov 4, 02:01',
        modifiedAt: '2026-11-04T02:01',
        owner: 'linus',
    },
    {
        id: 'dusk',
        name: 'harbor-at-dusk.png',
        kind: 'image',
        size: 2_840_000,
        modified: 'Nov 2, 18:44',
        modifiedAt: '2026-11-02T18:44',
        owner: 'grace',
        thumbnail: HARBOR_DUSK,
    },
    {
        id: 'bergen',
        name: 'site-bergen.jpg',
        kind: 'image',
        size: 3_120_000,
        modified: 'Nov 2, 11:20',
        modifiedAt: '2026-11-02T11:20',
        owner: 'grace',
        thumbnail: LIGHTHOUSE,
    },
    {
        id: 'oslo',
        name: 'site-oslo.jpg',
        kind: 'image',
        size: 2_610_000,
        modified: 'Oct 30, 15:02',
        modifiedAt: '2026-10-30T15:02',
        owner: 'margaret',
        thumbnail: PINES,
    },
    {
        id: 'chart',
        name: 'throughput.png',
        kind: 'image',
        size: 184_000,
        modified: 'Nov 4, 08:15',
        modifiedAt: '2026-11-04T08:15',
        owner: 'linus',
        thumbnail: CHART,
    },
    { id: 'readme', name: 'README.md', kind: 'text', size: 342, modified: 'Nov 1, 09:15', modifiedAt: '2026-11-01T09:15', owner: 'grace' },
    {
        id: 'schedule',
        name: 'sync-inventory.yaml',
        kind: 'code',
        size: 228,
        modified: 'Oct 29, 16:50',
        modifiedAt: '2026-10-29T16:50',
        owner: 'linus',
    },
    {
        id: 'report',
        name: 'review-q3.pdf',
        kind: 'pdf',
        size: 912_000,
        modified: 'Oct 12, 13:05',
        modifiedAt: '2026-10-12T13:05',
        owner: 'margaret',
    },
    {
        id: 'backup',
        name: 'exports-2026-10.zip',
        kind: 'archive',
        size: 31_400_000,
        modified: 'Nov 1, 00:30',
        modifiedAt: '2026-11-01T00:30',
        owner: 'ada',
    },
]

function Rows() {
    const [sort, setSort] = useState<FileSort>({ key: 'modified', direction: 'desc' })
    const [selected, setSelected] = useState<string[]>(['orders', 'summary'])
    return (
        <Stack gap="none" className="h-svh p-6">
            <FileList
                entries={sortFiles(FILES, sort)}
                sort={sort}
                onSortChange={setSort}
                selected={selected}
                onSelectedChange={setSelected}
                active="dusk"
                onOpen={() => undefined}
                className="min-h-0"
            />
        </Stack>
    )
}

function Ordered() {
    const [files, setFiles] = useState(FILES)
    return (
        <Stack gap="none" className="h-svh p-6">
            <FileList
                entries={files}
                onReorder={(from, to) => setFiles(moveItem(files, from, to))}
                onOpen={() => undefined}
                className="min-h-0"
            />
        </Stack>
    )
}

function Tiles() {
    const [selected, setSelected] = useState<string[]>(['bergen'])
    return (
        <div className="p-6">
            <FileGrid
                entries={sortFiles(FILES, { key: 'name', direction: 'asc' })}
                selected={selected}
                onSelectedChange={setSelected}
                onOpen={() => undefined}
            />
        </div>
    )
}

const CSV = `site,visits,orders,revenue
Oslo,412,388,48210.50
Bergen,240,201,19820.00
Lisbon,318,290,30112.75
Porto,122,109,9840.10
Reykjavík,64,51,4210.00
`

const JSON_TEXT = JSON.stringify(
    {
        job: 'nightly-export',
        state: 'succeeded',
        steps: [
            { name: 'fetch', rows: 2184 },
            { name: 'validate', rows: 2147, rejected: 37 },
        ],
        output: { host: 'files.example.org', size_bytes: 48210 },
    },
    null,
    4,
)

const YAML = `job: sync-inventory
schedule: "0 */4 * * *"
steps:
  - fetch:
      url: https://api.example.org/inventory
  - upload:
      host: files.example.org
`

function Previews() {
    return (
        <Columns className="p-6">
            <Section title="Image">
                <FilePreview name="harbor-at-dusk.png" kind="image" src={HARBOR_DUSK} />
            </Section>
            <Section title="CSV">
                <FilePreview name="sites.csv" kind="table" text={CSV} maxRows={4} />
            </Section>
            <Section title="JSON">
                <FilePreview name="run-summary.json" kind="json" text={JSON_TEXT} />
            </Section>
            <Section title="Code">
                <FilePreview name="sync-inventory.yaml" kind="code" text={YAML} />
            </Section>
            <Section title="No preview">
                <FilePreview name="exports-2026-10.zip" kind="archive" />
            </Section>
        </Columns>
    )
}

const UPLOADS: Upload[] = [
    { id: 'u1', name: 'site-trondheim.jpg', size: 3_420_000, state: 'uploading', progress: 0.64 },
    { id: 'u2', name: 'orders-2026-11-05.csv', size: 49_100, state: 'uploading', progress: 0.18 },
    { id: 'u3', name: 'site-tromso.jpg', size: 2_210_000, state: 'done' },
    { id: 'u4', name: 'inventory-dump.json', size: 212_000_000, state: 'failed', error: 'Larger than the 100 MB a file may be' },
]

function Trays() {
    return (
        <Row gap="xl" align="start" wrap className="p-6">
            <UploadTray uploads={UPLOADS} onRetry={() => undefined} onCancel={() => undefined} />
            <UploadTray
                uploads={UPLOADS.filter((upload) => upload.state !== 'uploading')}
                onRetry={() => undefined}
                onClose={() => undefined}
            />
            <UploadTray uploads={UPLOADS} defaultOpen={false} onCancel={() => undefined} />
        </Row>
    )
}

function Drop() {
    return (
        <div className="p-6">
            <DropZone
                open
                onFiles={() => undefined}
                words={{ detail: 'The files go into harbor/shared/review.' }}
                className="min-h-[calc(100svh-3rem)]"
            >
                <FileGrid entries={FILES.slice(0, 8)} />
            </DropZone>
        </div>
    )
}

const meta: Meta = { title: 'Patterns/Files' }
export default meta

/** A folder as rows, newest first, two selected and one open; the headers sort. */
export const List: StoryObj = { name: 'File list', render: () => <Rows /> }

/**
 * The folder in the reader's own order: a row dragged by the grip at its start goes to a new place,
 * a line showing where, and Alt (Option) with the up and down arrows moves the active row.
 */
export const Ordered_: StoryObj = { name: 'Manual order', render: () => <Ordered /> }

/** The same folder as tiles: pictures for images, icons for the rest. */
export const Grid: StoryObj = { name: 'File grid', render: () => <Tiles /> }

/** A file's contents for each kind that previews, and one that does not. */
export const Previews_: StoryObj = { name: 'File preview', render: () => <Previews /> }

/** Uploads going, finished with a failure to retry, and folded to the head. */
export const Tray: StoryObj = { name: 'Upload tray', render: () => <Trays /> }

/** Files dragged over a folder, its frame saying where they go. */
export const Dropping: StoryObj = { name: 'Drop zone', render: () => <Drop /> }
