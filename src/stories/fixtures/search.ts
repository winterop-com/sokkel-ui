import { FileText, FolderGit2, Play, Workflow } from 'lucide-react'

import type { SearchGroup, SearchResult } from '@winterop-com/sokkel-ui/lib/search'
import { FIELD, HARBOR_DUSK, LIGHTHOUSE, PINES } from './photos'
import { ADA, GRACE, LINUS, MARGARET } from './portraits'

/** Everything Tidevann's search finds, by kind, in the order the kinds are listed. */
const KINDS: { kind: string; title: string; results: SearchResult[] }[] = [
    {
        kind: 'jobs',
        title: 'Jobs',
        results: [
            {
                id: 'nightly-export',
                title: 'nightly-export',
                detail: 'harbor · every night at 02:00 UTC',
                meta: 'failed',
                icon: Workflow,
                facets: { project: 'harbor', owner: 'ada' },
            },
            {
                id: 'sync-inventory',
                title: 'sync-inventory',
                detail: 'harbor · every 15 minutes',
                meta: 'running',
                icon: Workflow,
                facets: { project: 'harbor', owner: 'linus' },
            },
            {
                id: 'rebuild-index',
                title: 'rebuild-index',
                detail: 'juniper · on every upload',
                meta: 'succeeded',
                icon: Workflow,
                facets: { project: 'juniper', owner: 'grace' },
            },
            {
                id: 'send-digest',
                title: 'send-digest',
                detail: 'larkspur · Mondays at 07:00 UTC',
                meta: 'skipped',
                icon: Workflow,
                facets: { project: 'larkspur', owner: 'margaret' },
            },
            {
                id: 'import-orders',
                title: 'import-orders',
                detail: 'juniper · every hour',
                meta: 'succeeded',
                icon: Workflow,
                facets: { project: 'juniper', owner: 'ada' },
            },
        ],
    },
    {
        kind: 'runs',
        title: 'Runs',
        results: [
            {
                id: 'run-01a1a5c6',
                title: 'nightly-export run 01a1a5c6',
                detail: 'harbor · failed at upload, 6 min ago',
                meta: '1.4s',
                icon: Play,
                facets: { project: 'harbor', owner: 'ada' },
            },
            {
                id: 'run-01a1a5b9',
                title: 'sync-inventory run 01a1a5b9',
                detail: 'harbor · running transform',
                meta: '-',
                icon: Play,
                facets: { project: 'harbor', owner: 'linus' },
            },
            {
                id: 'run-01a1a591',
                title: 'nightly-export run 01a1a591',
                detail: 'harbor · cancelled at upload, yesterday',
                meta: '4.0s',
                icon: Play,
                facets: { project: 'harbor', owner: 'ada' },
            },
            {
                id: 'run-01a1a5b1',
                title: 'rebuild-index run 01a1a5b1',
                detail: 'juniper · succeeded, 12 min ago',
                meta: '8.2s',
                icon: Play,
                facets: { project: 'juniper', owner: 'grace' },
            },
            {
                id: 'run-01a1a5a7',
                title: 'send-digest run 01a1a5a7',
                detail: 'larkspur · skipped notify',
                meta: '2.9s',
                icon: Play,
                facets: { project: 'larkspur', owner: 'margaret' },
            },
        ],
    },
    {
        kind: 'people',
        title: 'People',
        results: [
            {
                id: 'ada',
                title: 'ada',
                detail: 'ada@example.org · harbor, juniper',
                thumbnail: ADA,
                round: true,
                facets: { project: 'harbor', owner: 'ada' },
            },
            {
                id: 'grace',
                title: 'grace',
                detail: 'grace@example.org · juniper',
                thumbnail: GRACE,
                round: true,
                facets: { project: 'juniper', owner: 'grace' },
            },
            {
                id: 'linus',
                title: 'linus',
                detail: 'linus@example.org · harbor',
                thumbnail: LINUS,
                round: true,
                facets: { project: 'harbor', owner: 'linus' },
            },
            {
                id: 'margaret',
                title: 'margaret',
                detail: 'margaret@example.org · larkspur',
                thumbnail: MARGARET,
                round: true,
                facets: { project: 'larkspur', owner: 'margaret' },
            },
        ],
    },
    {
        kind: 'files',
        title: 'Files',
        results: [
            {
                id: 'harbor-dusk',
                title: 'harbor-dusk.jpg',
                detail: 'harbor / photos · 2.4 MB',
                thumbnail: HARBOR_DUSK,
                facets: { project: 'harbor', owner: 'linus' },
            },
            {
                id: 'lighthouse',
                title: 'lighthouse.jpg',
                detail: 'harbor / photos · 1.8 MB',
                thumbnail: LIGHTHOUSE,
                facets: { project: 'harbor', owner: 'ada' },
            },
            {
                id: 'orders-export',
                title: 'orders-export-2026-11-07.csv',
                detail: 'harbor / exports · written by nightly-export',
                icon: FileText,
                facets: { project: 'harbor', owner: 'ada' },
            },
            {
                id: 'pines',
                title: 'pines.jpg',
                detail: 'larkspur / photos · 3.1 MB',
                thumbnail: PINES,
                facets: { project: 'larkspur', owner: 'margaret' },
            },
            {
                id: 'field',
                title: 'field.jpg',
                detail: 'juniper / photos · 2.0 MB',
                thumbnail: FIELD,
                facets: { project: 'juniper', owner: 'grace' },
            },
            {
                id: 'index-log',
                title: 'rebuild-index.log',
                detail: 'juniper / logs · written by rebuild-index',
                icon: FileText,
                facets: { project: 'juniper', owner: 'grace' },
            },
        ],
    },
    {
        kind: 'projects',
        title: 'Projects',
        results: [
            { id: 'harbor', title: 'harbor', detail: '2 jobs · ada, linus', icon: FolderGit2, facets: { project: 'harbor', owner: 'ada' } },
            { id: 'juniper', title: 'juniper', detail: '2 jobs · grace', icon: FolderGit2, facets: { project: 'juniper', owner: 'grace' } },
            {
                id: 'larkspur',
                title: 'larkspur',
                detail: '1 job · margaret',
                icon: FolderGit2,
                facets: { project: 'larkspur', owner: 'margaret' },
            },
        ],
    },
]

/**
 * Tidevann's search: every word of the query must occur in a result's title or the line under it.
 * At most `perKind` results of a kind are listed, with how many match in all.
 */
export function searchTidevann(query: string, perKind = Number.POSITIVE_INFINITY): SearchGroup[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return KINDS.map((kind) => {
        const found = kind.results.filter((result) => {
            const text = `${result.title} ${result.detail ?? ''}`.toLowerCase()
            return words.every((word) => text.includes(word))
        })
        return { kind: kind.kind, title: kind.title, results: found.slice(0, perKind), total: found.length }
    }).filter((group) => group.results.length > 0)
}
