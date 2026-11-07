/**
 * A share from 0 to 1 written as a whole percent: `0.42` is `42%`. A share above nothing that
 * rounds to 0 is `<1%`, and one short of everything that rounds to 100 is `>99%`, so neither reads
 * as certain. Values outside 0 to 1 are held to it.
 */
export function formatPercent(value: number): string {
    const share = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
    const whole = Math.round(share * 100)
    if (share > 0 && whole === 0) return '<1%'
    if (share < 1 && whole === 100) return '>99%'
    return `${String(whole)}%`
}
