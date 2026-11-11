import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { describeCron } from '../lib/cron'
import { CronField } from './CronField'

const FROM = new Date('2027-03-25T12:00:00Z')
const noop = () => undefined

describe('CronField', () => {
    it('reads the runs in UTC by default', () => {
        const html = renderToStaticMarkup(<CronField value="0 2 * * *" onChange={noop} from={FROM} count={1} />)
        expect(html).toContain('>Every day at 02:00<')
        expect(html).toContain('Fri 2027-03-26 02:00<')
    })

    it('counts and draws the runs on the wall clock of its zone, across the change of clocks', () => {
        const html = renderToStaticMarkup(<CronField value="0 2 * * *" onChange={noop} from={FROM} timeZone="Europe/Oslo" />)
        expect(html).toContain('>Every day at 02:00<')
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

    it('marks the field with the words of a server that refused it, and lists no runs and no reading', () => {
        const html = renderToStaticMarkup(<CronField value="0 5 31 2 *" onChange={noop} from={FROM} invalid="February has no 31st" />)
        expect(html).toContain('aria-invalid="true"')
        expect(html).toContain('Error: February has no 31st')
        expect(html).not.toContain('31st in February')
        expect(html).toContain('aria-live="polite"></p>')
    })

    it('marks no issue of its own while the app checks an expression it cannot read', () => {
        const html = renderToStaticMarkup(<CronField value="0 2 L * ?" onChange={noop} from={FROM} runsPending />)
        expect(html).not.toContain('aria-invalid="true"')
        expect(html).not.toContain('Not a cron expression')
        expect(html).toContain('aria-busy="true"')
    })

    it('names the zone once, beside the label, and none when its word is empty', () => {
        const html = renderToStaticMarkup(<CronField value="0 2 * * *" onChange={noop} from={FROM} timeZone="Europe/Oslo" />)
        expect(html.split('Europe/Oslo')).toHaveLength(2)
        const bare = renderToStaticMarkup(<CronField value="0 2 * * *" onChange={noop} from={FROM} words={{ zone: '' }} />)
        expect(bare).toMatch(/Schedule<\/label><\/div>/)
    })

    it('says an expression it cannot read is not one, while the app gives no verdict', () => {
        const html = renderToStaticMarkup(<CronField value="0 2 L * *" onChange={noop} from={FROM} />)
        expect(html).toContain('aria-invalid="true"')
        expect(html).toContain('Error: Not a cron expression')
    })

    it('takes the app’s runs as its verdict on an expression it cannot read, with no words line', () => {
        const runs = [new Date('2027-03-31T00:00:00Z'), new Date('2027-04-30T00:00:00Z')]
        const html = renderToStaticMarkup(
            <CronField value="0 2 L * ?" onChange={noop} from={FROM} timeZone="Europe/Oslo" runs={runs} count={2} />,
        )
        expect(html).not.toContain('aria-invalid="true"')
        expect(html).not.toContain('Not a cron expression')
        expect(html).not.toContain('Never runs')
        expect(html).toContain('Wed 2027-03-31 02:00 +02:00')
        expect(html).toContain('Fri 2027-04-30 02:00 +02:00')
        expect(html).toContain('aria-live="polite"></p>')
    })

    it('takes the app’s refusal as the issue on an expression it cannot read', () => {
        const html = renderToStaticMarkup(<CronField value="0 2 32W * *" onChange={noop} from={FROM} invalid="No 32nd day" />)
        expect(html).toContain('Error: No 32nd day')
        expect(html).not.toContain('Not a cron expression')
    })

    it('says nothing while empty: no issue, no words, dashed runs', () => {
        const html = renderToStaticMarkup(<CronField value="" onChange={noop} from={FROM} count={2} placeholder="0 2 * * *" />)
        expect(html).not.toContain('aria-invalid="true"')
        expect(html).not.toContain('Never runs')
        expect(html).toContain('placeholder="0 2 * * *"')
        expect(html).toContain('aria-live="polite"></p>')
        expect(html.match(/>—</g)).toHaveLength(2)
    })

    it('draws a read-only schedule without an input', () => {
        const html = renderToStaticMarkup(
            <CronField
                value="0 2 * * 1-5"
                onChange={noop}
                from={FROM}
                count={1}
                readOnly
                presets={[{ label: 'Nightly', value: '0 2 * * *' }]}
            />,
        )
        expect(html).not.toContain('<input')
        expect(html).not.toContain('Nightly')
        expect(html).toContain('>0 2 * * 1-5<')
        expect(html).toContain('>At 02:00 on weekdays<')
        expect(html).toContain('Fri 2027-03-26 02:00<')
    })

    it('reads the expression in the words of its describe', () => {
        const html = renderToStaticMarkup(
            <CronField
                value="0 2 * * *"
                onChange={noop}
                from={FROM}
                describe={(expression) => describeCron(expression, { daily: (time) => `hver dag ${time}`, at: (times) => `kl. ${times}` })}
            />,
        )
        expect(html).toContain('>Hver dag kl. 02:00<')
    })
})
