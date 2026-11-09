import type { ExampleTab } from '@winterop-com/sokkel-ui/ExampleList'

/** Runnable queries over the jobs and their runs, in tabs per language, grouped by what they ask. */
export const QUERY_TABS: ExampleTab[] = [
    {
        id: 'jq',
        label: 'jq',
        groups: [
            {
                title: 'Runs',
                note: 'Over the last run of every job.',
                examples: [
                    { id: 'jq-failed', label: 'Failed runs', code: '.runs[] | select(.state == "failed")' },
                    { id: 'jq-slow', label: 'Slowest first', code: '.runs | sort_by(-.seconds) | .[:5]' },
                    { id: 'jq-by-job', label: 'Count by job', code: '.runs | group_by(.job) | map({job: .[0].job, runs: length})' },
                ],
            },
            {
                title: 'Steps',
                examples: [
                    {
                        id: 'jq-steps',
                        label: 'Steps that failed',
                        code: '.runs[].steps[] | select(.state == "failed") | .name',
                        description: 'Fetch, transform, validate, upload or notify, wherever a run stopped.',
                    },
                    { id: 'jq-skipped', label: 'Skipped steps', code: '[.runs[].steps[] | select(.state == "skipped")] | length' },
                ],
            },
        ],
    },
    {
        id: 'sql',
        label: 'SQL',
        groups: [
            {
                title: 'Runs',
                examples: [
                    { id: 'sql-failed', label: 'Failed today', code: "select job, started from runs where state = 'failed'" },
                    {
                        id: 'sql-queued',
                        label: 'Waiting the longest',
                        code: "select job, queued from runs where state = 'queued' order by queued",
                    },
                ],
            },
            {
                title: 'People',
                examples: [{ id: 'sql-owners', label: 'Jobs per owner', code: 'select owner, count(*) from jobs group by owner' }],
            },
        ],
    },
]
