import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CronField } from './CronField'

const FROM = new Date('2027-03-25T12:00:00Z')
const noop = () => undefined

describe('CronField', () => {
    it('reads the runs in UTC by default', () => {
        const html = renderToStaticMarkup(<CronField value="0 2 * * *" onChange={noop} from={FROM} count={1} />)
        expect(html).toContain('Every day at 02:00 (UTC)')
        expect(html).toContain('Fri 2027-03-26 02:00<')
    })

    it('counts and draws the runs on the wall clock of its zone, across the change of clocks', () => {
        const html = renderToStaticMarkup(<CronField value="0 2 * * *" onChange={noop} from={FROM} timeZone="Europe/Oslo" />)
        expect(html).toContain('Every day at 02:00 (Europe/Oslo)')
        expect(html).toContain('Sat 2027-03-27 02:00 +01:00')
        expect(html).toContain('Sun 2027-03-28 03:00 +02:00')
        expect(html).toContain('Mon 2027-03-29 02:00 +02:00')
    })

    it('draws the runs the app reads back in place of its own', () => {
        const runs = [new Date('2027-04-01T00:00:00Z')]
        const html = renderToStaticMarkup(
            <CronField value="0 2 * * *" onChange={noop} from={FROM} timeZone="Europe/Oslo" runs={runs} count={2} />,
        )
        expect(html).toContain('Thu 2027-04-01 02:00 +02:00')
        expect(html).not.toContain('2027-03-26')
    })

    it('shows its own reading muted while the app checks', () => {
        const html = renderToStaticMarkup(
            <CronField value="0 2 * * *" onChange={noop} from={FROM} runs={[]} runsPending words={{ checking: 'Asking' }} />,
        )
        expect(html).toContain('>Asking<')
        expect(html).toContain('aria-busy="true"')
        expect(html).toContain('Fri 2027-03-26 02:00<')
    })

    it('marks the field with the words of a server that refused it, and lists no runs', () => {
        const html = renderToStaticMarkup(
            <CronField value="*/2 * * * *" onChange={noop} from={FROM} invalid="Runs at most every 5 minutes" />,
        )
        expect(html).toContain('aria-invalid="true"')
        expect(html).toContain('Error: Runs at most every 5 minutes')
        expect(html).toContain('Every 2 minutes (UTC)')
        expect(html).not.toContain('2027-03-25')
    })
})
