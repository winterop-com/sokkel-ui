/** The vault a new reader starts with: Tidevann's runbooks, jobs, projects, people, meetings and a journal. */

import { day, type Folder, type Note } from './model'

export const FOLDERS: Folder[] = [
    { id: 'daily', name: 'Daily', parent: null },
    { id: 'runbooks', name: 'Runbooks', parent: null },
    { id: 'jobs', name: 'Jobs', parent: null },
    { id: 'projects', name: 'Projects', parent: null },
    { id: 'meetings', name: 'Meetings', parent: null },
    { id: 'people', name: 'People', parent: null },
    { id: 'services', name: 'Services', parent: 'projects' },
    { id: 'templates', name: 'Templates', parent: null },
]

const HOUR = 3_600_000

/** A note seeded `hours` ago: its id, its name, its folder and its text. */
type Seed = [id: string, title: string, folder: string | null, hours: number, body: string]

const NOTES: Seed[] = [
    [
        'welcome',
        'Start here',
        null,
        400,
        `# Start here

This vault holds what the team knows about Tidevann's jobs: how they run, what to do when one
fails, and what was said about them.

- The [[Runbooks]] say what to do when something breaks: start with [[Retry a run]].
- Each job has a note: [[nightly-export]], [[sync-inventory]], [[rebuild-index]], [[send-digest]]
  and [[import-orders]].
- The projects are [[harbor]], [[juniper]] and [[larkspur]].
- The daily notes are the journal; open today's from **Daily** in the rail.

Type \`[[\` in the editor to link to another note, and \`#\` to tag one. #welcome
`,
    ],
    [
        'runbooks-index',
        'Runbooks',
        'runbooks',
        390,
        `# Runbooks

What to do, step by step, when something needs a person.

| Runbook | When |
| --- | --- |
| [[Retry a run]] | A run failed and the cause is fixed |
| [[Restore an export]] | An export was overwritten or lost |
| [[Rotate the api keys]] | Every 90 days, or after a leak |
| [[Scheduler is stuck]] | Runs stay queued past their time |
| [[On call]] | Who answers this week, and how |

#runbook
`,
    ],
    [
        'retry',
        'Retry a run',
        'runbooks',
        120,
        `# Retry a run

A failed run can start again from its failed step once the cause is fixed.

## Steps

1. Open the run and read the failed step's log.
2. Fix the cause: a bad row in [[import-orders]], an upload that timed out, a key that expired.
3. Press **Run again from the failed step**. The steps before it keep their output.
4. Watch the validate step; it fails the same way if the fix did not hold.

> [!WARNING]
> Never retry nightly-export twice at once: the second run overwrites the first one's upload.

Asked about in [[Weekly sync with grace]]. #runbook #on-call
`,
    ],
    [
        'restore',
        'Restore an export',
        'runbooks',
        300,
        `# Restore an export

The larkspur bucket keeps a week of exports. To bring one back:

\`\`\`sh
tidevann exports restore --project larkspur --day 2026-11-02
\`\`\`

How long exports are kept is open: see [[Export retention]]. #runbook
`,
    ],
    [
        'rotate',
        'Rotate the api keys',
        'runbooks',
        500,
        `# Rotate the api keys

Every 90 days, or at once after a key leaks.

1. Make the new key on the [[api]] service.
2. Put it in the worker's settings and restart the [[worker]].
3. Run sync-inventory once by hand to check it.
4. Revoke the old key.

grace did the last rotation. #runbook #security
`,
    ],
    [
        'stuck',
        'Scheduler is stuck',
        'runbooks',
        260,
        `# Scheduler is stuck

Runs stay queued past their time and nothing starts.

- Check the [[scheduler]] service answers on scheduler.example.org.
- Look for a run holding the lock: usually rebuild-index after a deploy.
- Restart the scheduler; queued runs start in their order.

Happened twice in October; see [[Incident review: sync-inventory]]. #runbook #on-call
`,
    ],
    [
        'oncall',
        'On call',
        'runbooks',
        48,
        `# On call

This week: [[grace]], then [[linus]].

The one on call answers failed runs within an hour in working time, starting from [[Retry a run]].
A failure of nightly-export after midnight waits for the morning unless send-digest depends on it.

#on-call
`,
    ],
    [
        'nightly-export',
        'nightly-export',
        'jobs',
        30,
        `# nightly-export

Runs every night at 02:00 on the [[worker]] for [[larkspur]].

## Steps

fetch, transform, validate, upload, notify.

## Owner

[[ada]]. The digest that [[send-digest]] mails on Mondays reads its output.

## Known failures

- validate rejects orders without an \`order_id\`; fixed upstream in [[import-orders]].
- upload times out when the bucket is busy; a retry works.

#job
`,
    ],
    [
        'sync-inventory',
        'sync-inventory',
        'jobs',
        70,
        `# sync-inventory

Syncs the inventory from the warehouses into [[harbor]] every hour.

Fails now and then on the fetch step when the [[api]] is slow; see
[[Incident review: sync-inventory]].

Owner: [[grace]]. #job
`,
    ],
    [
        'rebuild-index',
        'rebuild-index',
        'jobs',
        150,
        `# rebuild-index

Rebuilds the search index of [[juniper]] every Sunday. Takes about forty minutes and holds the
scheduler's lock while it runs.

Owner: [[linus]]. Speeding it up is on the list for the [[Quarter review]]. #job
`,
    ],
    [
        'send-digest',
        'send-digest',
        'jobs',
        90,
        `# send-digest

Mails each project's owner a summary of the week every Monday at 09:00, from what
[[nightly-export]] wrote.

The wording is [[margaret]]'s; drafts are in [[Planning the digest]]. #job
`,
    ],
    [
        'import-orders',
        'import-orders',
        'jobs',
        110,
        `# import-orders

Imports the day's orders for [[juniper]] from the shops' files.

The validate step was added after rows without an order id reached nightly-export.

Owner: [[linus]]. #job
`,
    ],
    [
        'harbor',
        'harbor',
        'projects',
        200,
        `# harbor

The inventory project. Its jobs: [[sync-inventory]].

Lead: [[grace]]. Moving harbor to the new scheduler is planned for next quarter; see the
[[Quarter review]]. #project
`,
    ],
    [
        'juniper',
        'juniper',
        'projects',
        210,
        `# juniper

Orders and search. Its jobs: [[import-orders]] and [[rebuild-index]].

Lead: [[linus]]. #project
`,
    ],
    [
        'larkspur',
        'larkspur',
        'projects',
        220,
        `# larkspur

Exports and reports. Its jobs: [[nightly-export]] and [[send-digest]].

Lead: [[ada]]. The bucket keeps a week of exports. #project
`,
    ],
    [
        'api',
        'api',
        'services',
        320,
        `# api

Answers on api.example.org. Every job's fetch step reads from it.

Keys are rotated by [[Rotate the api keys]]. #service
`,
    ],
    [
        'worker',
        'worker',
        'services',
        330,
        `# worker

Runs the jobs' steps. Four of them, each taking one step at a time.

#service
`,
    ],
    [
        'scheduler',
        'scheduler',
        'services',
        340,
        `# scheduler

Starts runs on their schedules. When it stops starting them, see [[Scheduler is stuck]].

#service
`,
    ],
    [
        'ada',
        'ada',
        'people',
        600,
        `# ada

Owns [[nightly-export]] and leads [[larkspur]]. Ask about exports and reports.

#person
`,
    ],
    [
        'grace',
        'grace',
        'people',
        610,
        `# grace

Leads [[harbor]] and owns [[sync-inventory]]. On call this week.

#person
`,
    ],
    [
        'linus',
        'linus',
        'people',
        620,
        `# linus

Leads [[juniper]]; owns [[import-orders]] and [[rebuild-index]].

#person
`,
    ],
    [
        'margaret',
        'margaret',
        'people',
        630,
        `# margaret

Writes the wording of [[send-digest]] and runs the [[Quarter review]].

#person
`,
    ],
    [
        'weekly-sync',
        'Weekly sync with grace',
        'meetings',
        26,
        `# Weekly sync with grace

With [[grace]] and [[ada]].

- sync-inventory failed twice on Tuesday; the api was slow. grace adds a retry to the fetch step.
- [[Retry a run]] needs a line on what not to retry twice.
- Who keeps the exports longer than a week? Open: [[Export retention]].

## Decisions

- Retries stay manual for nightly-export. #decision

#meeting
`,
    ],
    [
        'quarter-review',
        'Quarter review',
        'meetings',
        170,
        `# Quarter review

With [[margaret]], [[grace]], [[linus]] and [[ada]].

- [[harbor]] moves to the new scheduler next quarter.
- [[rebuild-index]] should finish under twenty minutes.
- [[larkspur]] asks for exports kept a month.

#meeting
`,
    ],
    [
        'digest-planning',
        'Planning the digest',
        'meetings',
        95,
        `# Planning the digest

With [[margaret]].

- The digest leads with the failures, then the slowest steps.
- A project with no runs gets no mail.
- Send it at 09:00 on Mondays, after nightly-export has run.

#meeting #send-digest
`,
    ],
    [
        'incident-sync',
        'Incident review: sync-inventory',
        'meetings',
        140,
        `# Incident review: sync-inventory

On Tuesday sync-inventory failed four times between 10:00 and 14:00.

## What happened

The [[api]] answered slowly under load, and the fetch step gave up after 30 seconds.

## What we changed

- The fetch step waits 60 seconds and tries twice.
- The [[scheduler]] no longer starts a second run while one is going.

Follow up in [[Postmortem template]]. #incident
`,
    ],
    [
        'meeting-template',
        'Meeting template',
        'templates',
        700,
        `# Meeting

With:

## Notes

## Decisions

## Actions

- [ ]

#meeting
`,
    ],
    [
        'reading',
        'Reading list',
        null,
        800,
        `# Reading list

- How the scheduler orders queued runs.
- A guide to writing runbooks people follow.

#idea
`,
    ],
    [
        'ideas',
        'Ideas',
        null,
        75,
        `# Ideas

- A dashboard of the slowest steps of each job, for the [[Quarter review]].
- Tag every runbook with the jobs it touches.
- Let send-digest say which runs were retried.

#idea
`,
    ],
]

/** The journal: a daily note for some of the last two weeks, each linking what the day was about. */
const DAILY: [offset: number, body: (date: string) => string][] = [
    [
        -1,
        (date) => `# ${date}

## Plan

- [x] Read the failed nightly-export from last night
- [ ] Ask linus about the validate step

## Log

- nightly-export failed on upload at 02:14; retried at 08:30 and it went through. Followed [[Retry a run]].
- Talked to grace about sync-inventory; see [[Weekly sync with grace]].

#journal
`,
    ],
    [
        -2,
        (date) => `# ${date}

## Log

- Rotated the api keys with grace. It took twenty minutes; the runbook was right.
- sync-inventory ran clean all day.

#journal
`,
    ],
    [
        -3,
        (date) => `# ${date}

## Log

- Quiet day. Read up on how the scheduler orders runs.
- Drafted the digest wording with margaret: [[Planning the digest]].

#journal
`,
    ],
    [
        -6,
        (date) => `# ${date}

## Log

- rebuild-index held the lock for an hour after the deploy; restarted the scheduler as the
  runbook says.
- Added a line to [[Scheduler is stuck]].

#journal #on-call
`,
    ],
    [
        -7,
        (date) => `# ${date}

## Log

- On call. Two failed runs of sync-inventory, both on fetch.
- import-orders rejected 12 rows without an order id.

#journal #on-call
`,
    ],
    [
        -9,
        (date) => `# ${date}

## Log

- Quarter review prep: collected the slowest steps of each job for [[Quarter review]].

#journal
`,
    ],
    [
        -13,
        (date) => `# ${date}

## Log

- First day keeping a journal in the vault. Started [[Start here]].

#journal
`,
    ],
]

/** The vault as it starts: the notes above, then the journal, its days counted from today. */
export function seedNotes(): Note[] {
    const now = Date.now()
    const notes: Note[] = NOTES.map(([id, title, folder, hours, body]) => ({
        id,
        title,
        folder,
        body,
        created: now - hours * HOUR - 30 * 24 * HOUR,
        updated: now - hours * HOUR,
    }))
    const journal: Note[] = DAILY.map(([offset, body]) => {
        const date = day(offset)
        const at = now + offset * 24 * HOUR
        return { id: `daily-${date}`, title: date, folder: 'daily', body: body(date), created: at, updated: at + 8 * HOUR, day: date }
    })
    return [...journal, ...notes]
}
