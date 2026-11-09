import { ApiPlayground, requestTarget, type ApiSent } from '@winterop-com/sokkel-ui/ApiPlayground'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Page } from '@winterop-com/sokkel-ui/Shell'
import { useCollection } from 'tidevann-shared/backend'

import { answer, hintsFor, presets } from '../data/api'
import { receipts, SERVER } from '../data/backend'
import { useFoot } from '../ui'

const HEADERS = { Accept: 'application/json' }

/** Send one request to the demo server and read what it answers: the same backend the app reads, through its API. */
export function Playground() {
    const { rows } = useCollection(receipts)
    const [history, setHistory] = useStored<ApiSent[]>('playground-history', [])
    const last = history[0]
    const sample = rows?.find((receipt) => receipt.state === 'received')?.receipt ?? rows?.[0]?.receipt
    useFoot(
        last === undefined
            ? 'Nothing sent yet'
            : `${last.request.method} ${requestTarget(last.request)} · ${last.answer === null ? 'no answer' : `${String(last.answer.status)} in ${String(Math.round(last.answer.ms))} ms`}`,
        undefined,
        [last],
    )
    return (
        <Page>
            <PageHeader
                title="Playground"
                description="Send one request to the server and read exactly what it answers. The presets beside the builder are the server's own: one address for each kind of thing it serves, and the operations it declares."
            />
            <ApiPlayground
                send={(request) => answer(request)}
                base={SERVER.base}
                presets={presets(sample)}
                paramHints={hintsFor}
                headers={HEADERS}
                note="The path is under the server's base. Every request carries Accept: application/json, and this demo sends no credentials."
                defaultRequest={last?.request ?? { method: 'GET', path: '/metadata', params: [] }}
                history={history}
                onSent={(sent) => setHistory((all) => [sent, ...all].slice(0, 20))}
            />
        </Page>
    )
}
