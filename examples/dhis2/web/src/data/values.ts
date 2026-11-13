/**
 * The simulated server's data values: each site's monthly report, made from its code and the month
 * so it is the same on every load, with a few months unreported and a few values that break a
 * validation rule, as real reports have. Values above a site are the sums of the sites under it.
 */
import { AGE_COMBO, DATA_ELEMENTS, DE, hashed, ORG_UNITS, PERIODS, sitesUnder, type OrgUnit } from './metadata'

const VALUES = new Map<string, number>()
const REPORTED = new Set<string>()

const key = (element: string, combo: string, site: string, period: string) => `${element}.${combo}.${site}.${period}`

function fill(site: OrgUnit) {
    const size = 0.6 + hashed(site.code) * 1.2
    let onHand = Math.round(60 * size)
    PERIODS.forEach((period, index) => {
        const noise = (what: string) => hashed(`${what}:${site.code}:${period}`)
        const season = 1 + 0.25 * Math.sin((2 * Math.PI * index) / 12)
        const [under5, over5] = AGE_COMBO.combos
        const young = Math.round(40 * size * season * (0.85 + 0.3 * noise('young')))
        const old = Math.round(110 * size * season * (0.85 + 0.3 * noise('old')))
        const due = Math.round(18 * size * (0.8 + 0.4 * noise('due')))
        let vaccinated = Math.round(due * (0.74 + 0.24 * noise('vaccinated')))
        if (noise('vaccinated-plant') < 0.03) vaccinated = due + 1 + Math.floor(noise('extra') * 3)
        const taken = 3 + Math.floor(noise('taken') * 3)
        let failed = Math.round(taken * noise('failed') * 0.4)
        if (noise('failed-plant') < 0.025) failed = taken + 1
        const received = noise('delivered') < 0.15 ? 0 : Math.round(40 * size * (0.7 + 0.6 * noise('received')))
        let used = Math.min(onHand + received, Math.round(35 * size * (0.7 + 0.6 * noise('used'))))
        if (noise('used-plant') < 0.03) used = onHand + received + 5
        const end = Math.max(0, onHand + received - used)
        onHand = end
        const reported = noise('reported') > 0.07 && !(site.code.endsWith('VOSSESTRAND') && index >= 4 && index <= 6)
        if (!reported) return
        REPORTED.add(`${site.id}.${period}`)
        const put = (element: string, combo: string, value: number) => VALUES.set(key(element, combo, site.id, period), value)
        const plain = DE.referrals.categoryCombo.combos[0].id
        put(DE.visits.id, under5.id, young)
        put(DE.visits.id, over5.id, old)
        put(DE.referrals.id, plain, Math.round((young + old) * (0.02 + 0.03 * noise('referrals'))))
        put(DE.due.id, plain, due)
        put(DE.vaccinated.id, plain, vaccinated)
        put(DE.samplesTaken.id, plain, taken)
        put(DE.samplesFailed.id, plain, failed)
        put(DE.stockReceived.id, plain, received)
        put(DE.stockUsed.id, plain, used)
        put(DE.stockOnHand.id, plain, end)
    })
}

for (const site of ORG_UNITS.filter((one) => one.level === 4)) fill(site)

/**
 * A data element's value for a unit and a month: one category option combo's, or every combo's
 * summed when `combo` is null, over the sites at or under the unit. Null when no site reported it.
 */
export function dataValue(element: string, combo: string | null, unit: string, period: string): number | null {
    const found = DATA_ELEMENTS.find((one) => one.id === element)
    if (found === undefined) return null
    const combos = combo === null ? found.categoryCombo.combos.map((one) => one.id) : [combo]
    let sum: number | null = null
    for (const site of sitesUnder(unit))
        for (const one of combos) {
            const value = VALUES.get(key(element, one, site.id, period))
            if (value !== undefined) sum = (sum ?? 0) + value
        }
    return sum
}

/** How many of the sites at or under a unit sent the month's report, of how many should have. */
export function reports(unit: string, period: string): { actual: number; expected: number } {
    const sites = sitesUnder(unit)
    if (!PERIODS.includes(period)) return { actual: 0, expected: 0 }
    return { actual: sites.filter((site) => REPORTED.has(`${site.id}.${period}`)).length, expected: sites.length }
}
