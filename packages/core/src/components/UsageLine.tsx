import { cn } from '../lib/cn'

/** The words a usage line says, and how it writes its figures. */
export interface UsageLineWords {
    /** After the tokens the prompt took: `412 in`. */
    input: string
    /** After the tokens written: `87 out`. */
    output: string
    /** After the tokens written while the answer is still coming: `87 out so far`. */
    soFar: string
    /** Before the time to the first token: `first token 240 ms`. */
    firstToken: string
    /** After the rate: `31.4 tok/s`. */
    rate: string
    /** What the line is, for a screen reader. */
    label: string
    /** A time in milliseconds as the line writes it. */
    time: (ms: number) => string
    /** A count of tokens as the line writes it. */
    count: (tokens: number) => string
    /** A rate in tokens a second as the line writes it. */
    speed: (perSecond: number) => string
}

/** Milliseconds under a second as they are, then seconds: two decimals under ten, one above. */
function time(ms: number): string {
    if (ms < 1000) return `${String(Math.round(ms))} ms`
    const seconds = ms / 1000
    return `${seconds.toFixed(seconds < 10 ? 2 : 1)} s`
}

/** A rate of a hundred or more as a whole number, a slower one with a decimal. */
function speed(perSecond: number): string {
    return perSecond >= 100 ? String(Math.round(perSecond)) : perSecond.toFixed(1)
}

export const USAGE_LINE_WORDS: UsageLineWords = {
    input: 'in',
    output: 'out',
    soFar: 'so far',
    firstToken: 'first token',
    rate: 'tok/s',
    label: 'Usage',
    time,
    count: (tokens) => tokens.toLocaleString('en-US'),
    speed,
}

export interface UsageLineProps {
    /** The tokens the prompt took. */
    input?: number
    /** The tokens written. */
    output: number
    /** Milliseconds from the request to the first token. */
    firstToken?: number
    /** Tokens written a second, measured from the first token. */
    rate?: number
    /** Milliseconds the whole answer took, or has taken so far. */
    latency?: number
    /** The answer is still coming: the count says so far. */
    live?: boolean
    /** A last quiet fact, such as why the answer ended: `max tokens`. */
    note?: string
    className?: string
    words?: Partial<UsageLineWords>
}

/**
 * What an answer cost and how fast it came, in one quiet line under it: the tokens in and out, the
 * time to the first token, the rate, and how long it took, the figures in the text color and their
 * units muted. Each figure is left out when it is not given, so a line can start with the count
 * alone while the answer streams and fill in as it ends. Times under a second are written in
 * milliseconds, then in seconds; a rate of a hundred or more as a whole number.
 */
export function UsageLine({ input, output, firstToken, rate, latency, live = false, note, className, words: given }: UsageLineProps) {
    const words = { ...USAGE_LINE_WORDS, ...given }
    const figure = (value: string) => <span className="text-foreground">{value}</span>
    return (
        <p
            data-slot="usage-line"
            aria-label={words.label}
            className={cn(
                'flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-xs text-muted-foreground tabular-nums',
                className,
            )}
        >
            {input !== undefined && (
                <span>
                    {figure(words.count(input))} {words.input}
                </span>
            )}
            <span>
                {figure(words.count(output))} {words.output}
                {live ? ` ${words.soFar}` : ''}
            </span>
            {firstToken !== undefined && (
                <span>
                    {words.firstToken} {figure(words.time(firstToken))}
                </span>
            )}
            {rate !== undefined && (
                <span>
                    {figure(words.speed(rate))} {words.rate}
                </span>
            )}
            {latency !== undefined && <span>{figure(words.time(latency))}</span>}
            {note !== undefined && <span>{note}</span>}
        </p>
    )
}
