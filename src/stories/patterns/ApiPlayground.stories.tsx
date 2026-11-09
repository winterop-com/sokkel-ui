import type { Meta, StoryObj } from '@storybook/react-vite'
import { ExternalLink } from 'lucide-react'
import { useState } from 'react'

import {
    ApiPlayground,
    type ApiAnswer,
    type ApiParamHint,
    type ApiPresetGroup,
    type ApiRequest,
    type ApiSent,
} from '@winterop-com/sokkel-ui/ApiPlayground'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Page } from '@winterop-com/sokkel-ui/Shell'

/**
 * Send one request to a server and read what it answers, as a records app's playground does: the
 * builder, the answer with its status and time, the requests sent before, and the server's own
 * requests beside them as presets. Here a small table of answers stands in for the server.
 */
const meta: Meta = { title: 'Patterns/API playground', parameters: { layout: 'fullscreen' } }
export default meta

const BASE = 'https://records.example.org/api'

const JOBS = [
    { name: 'nightly-export', project: 'harbor', state: 'succeeded' },
    { name: 'sync-inventory', project: 'harbor', state: 'failed' },
    { name: 'rebuild-index', project: 'juniper', state: 'running' },
]

const answer = (status: number, statusText: string, body: unknown): ApiAnswer => ({
    status,
    statusText,
    ms: 18,
    body: body === undefined ? '' : JSON.stringify(body, null, 2),
})

/** What the stand-in server answers for a request. */
function answerFor(request: ApiRequest): ApiAnswer {
    const path = request.path.split('?')[0]
    if (request.method === 'GET' && path === '/jobs') {
        const project = request.params.find((param) => param.name === 'project')?.value
        return answer(200, 'OK', { total: JOBS.length, items: JOBS.filter((job) => project === undefined || job.project === project) })
    }
    const one = /^\/jobs\/([\w-]+)$/.exec(path)
    if (request.method === 'GET' && one !== null) {
        const job = JOBS.find((entry) => entry.name === one[1])
        return job === undefined ? answer(404, 'Not Found', { error: `No job is called ${one[1]}.` }) : answer(200, 'OK', job)
    }
    if (request.method === 'POST' && /^\/jobs\/[\w-]+\/runs$/.test(path))
        return answer(201, 'Created', { run: '01a1a5c6', state: 'queued' })
    return answer(404, 'Not Found', { error: `Nothing answers ${request.method} ${path}.` })
}

const send = (request: ApiRequest, signal: AbortSignal) =>
    new Promise<ApiAnswer>((resolve, reject) => {
        const timer = window.setTimeout(() => resolve(answerFor(request)), 300)
        signal.addEventListener('abort', () => {
            window.clearTimeout(timer)
            reject(new Error('Cancelled'))
        })
    })

const PRESETS: ApiPresetGroup[] = [
    {
        title: 'Reads',
        note: 'A list answers twenty to a page, newest first.',
        presets: [
            { id: 'jobs', method: 'GET', path: '/jobs', description: 'Every job, with its project and last state.' },
            {
                id: 'harbor',
                method: 'GET',
                path: '/jobs',
                params: [{ name: 'project', value: 'harbor' }],
                description: "harbor's jobs alone.",
            },
            { id: 'job', method: 'GET', path: '/jobs/nightly-export', description: 'One job, read by its name.' },
        ],
    },
    {
        title: 'Operations',
        presets: [
            {
                id: 'run',
                method: 'POST',
                path: '/jobs/rebuild-index/runs',
                body: '{\n  "reason": "rebuild after the upload"\n}',
                description: 'Queues a run of a job now.',
            },
        ],
    },
]

const hints = (path: string): ApiParamHint[] =>
    path === '/jobs'
        ? [
              { name: 'project', description: 'Only the jobs of one project.' },
              { name: 'state', description: 'Only the jobs whose last run ended so.' },
          ]
        : []

const NOTE = 'The path is under the server base. Every request carries Accept: application/json.'

function Playground({
    presets = PRESETS,
    sent,
    request,
    folded = false,
}: {
    presets?: ApiPresetGroup[]
    sent?: ApiSent
    request?: ApiRequest
    folded?: boolean
}) {
    const [history, setHistory] = useState<ApiSent[]>(sent === undefined ? [] : [sent])
    return (
        <Page>
            <PageHeader title="Playground" description="Send one request to the server and read exactly what it answers." />
            <ApiPlayground
                send={send}
                base={BASE}
                presets={presets}
                presetsRail={{ defaultFolded: folded }}
                paramHints={hints}
                headers={{ Accept: 'application/json' }}
                note={NOTE}
                actions={(asked, target) =>
                    asked.method === 'GET' && (
                        <Button variant="outline" size="sm" render={<a href={target} target="_blank" rel="noreferrer" />}>
                            <ExternalLink aria-hidden />
                            Open in a new tab
                        </Button>
                    )
                }
                defaultRequest={request ?? sent?.request ?? { method: 'GET', path: '/jobs', params: [] }}
                defaultSent={sent}
                history={history}
                onSent={(one) => setHistory((all) => [one, ...all].slice(0, 20))}
            />
        </Page>
    )
}

const SENT: ApiSent = {
    request: { method: 'GET', path: '/jobs', params: [{ name: 'project', value: 'harbor' }] },
    answer: answerFor({ method: 'GET', path: '/jobs', params: [{ name: 'project', value: 'harbor' }] }),
}

/** The builder alone, before anything is sent, with no presets beside it. */
export const Empty: StoryObj = { render: () => <Playground presets={[]} /> }

/**
 * The server's own requests beside the builder, in groups; choosing one fills the builder without
 * sending it. The rail resizes from its inner edge and folds from its head. A GET request opens in a
 * new tab from the app's own action after Copy as curl, and a parameter's name completes from the
 * ones the path answers to.
 */
export const Presets: StoryObj = { render: () => <Playground /> }

/** The presets folded to a strip with their name written down it; a press unfolds them. */
export const Folded: StoryObj = { render: () => <Playground folded /> }

/** A request that sends a body, edited as JSON in the code editor with its colors. */
export const Body: StoryObj = {
    render: () => (
        <Playground
            request={{
                method: 'POST',
                path: '/jobs/rebuild-index/runs',
                params: [],
                body: '{\n  "reason": "rebuild after the upload",\n  "steps": ["fetch", "transform"]\n}',
            }}
        />
    ),
}

/** An answer: its status and how long it took over the body, and the request in the sent list under it. */
export const Answered: StoryObj = { render: () => <Playground sent={SENT} /> }

/** A refusal: a 404 with what the server said. */
export const Refused: StoryObj = {
    render: () => (
        <Playground
            sent={{
                request: { method: 'GET', path: '/jobs/weekly-report', params: [] },
                answer: answerFor({ method: 'GET', path: '/jobs/weekly-report', params: [] }),
            }}
        />
    ),
}
