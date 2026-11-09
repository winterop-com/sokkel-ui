/**
 * The simulated model: what it answers to a prompt, how many tokens that is, and how fast a given
 * model writes it. Answers are drawn from a few written ones per kind of question, picked by the
 * prompt, the model, the temperature and the attempt, so temperature 0 always answers alike and
 * asking again at a higher one gives another version. A system prompt asking to be brief keeps
 * the first paragraph, and max tokens cuts the answer where it runs out.
 */

import type { Attachment, Model, Sampling } from '../data/model'

export interface Ask {
    prompt: string
    model: Model
    settings: Sampling
    attachments: readonly Attachment[]
    /** Tokens of the conversation before this prompt. */
    history: number
    /** 0 for the first answer, then one more each time it is asked again. */
    attempt: number
}

/** An answer planned out: its text, the model's thinking before it, and how fast it comes. */
export interface Plan {
    reasoning: string
    text: string
    /** Tokens the prompt takes, the system prompt and the history with it. */
    input: number
    /** Milliseconds to the first token once the model is loaded. */
    prefill: number
    /** Tokens a second. */
    rate: number
    /** Why the answer ends early: `max tokens`. */
    note?: string
}

/** A rough token count: about four characters a token, at least one a word. */
export function tokens(text: string): number {
    if (text === '') return 0
    return text.split(/(\s+)/).reduce((sum, piece) => sum + (piece.trim() === '' ? 0 : Math.max(1, Math.ceil(piece.length / 4.2))), 0)
}

/** The text cut into the pieces it streams in: each word with the space after it. */
export function pieces(text: string): string[] {
    return text.match(/\S+\s*|\s+/g) ?? []
}

function hash(text: string): number {
    let value = 2166136261
    for (let index = 0; index < text.length; index += 1) {
        value ^= text.charCodeAt(index)
        value = Math.imul(value, 16777619)
    }
    return value >>> 0
}

/** How much faster or slower each rounding writes than four bits. */
const QUANT_PACE: Record<string, number> = {
    Q3_K_S: 1.1,
    Q4_K_M: 1,
    Q5_K_M: 0.9,
    Q6_K: 0.82,
    Q8_0: 0.7,
    F16: 0.45,
    BF16: 0.45,
    '4bit': 1.12,
    '8bit': 0.76,
}

/** Tokens a second a model writes on this machine. */
export function rateOf(model: Model): number {
    return Math.min(320, (330 / model.params ** 0.9) * (QUANT_PACE[model.quant] ?? 1))
}

/** Milliseconds a model takes to read a prompt of `input` tokens. */
export function prefillOf(model: Model, input: number): number {
    return Math.round(60 + input * model.params * 0.045)
}

const words = (text: string) => text.toLowerCase()

type Kind =
    | 'greeting'
    | 'cron'
    | 'translate'
    | 'summary'
    | 'python'
    | 'jq'
    | 'typescript'
    | 'speed'
    | 'failure'
    | 'ideas'
    | 'names'
    | 'general'

function kindOf(prompt: string, model: Model): Kind {
    const text = words(prompt)
    if (/^(hi|hello|hey|good (morning|evening))\b/.test(text)) return 'greeting'
    if (/\bcron\b|schedule|every (day|weekday|week|monday|hour|night)/.test(text)) return 'cron'
    if (/translat|in norwegian|in french|in german|in spanish/.test(text)) return 'translate'
    if (/summar|tl;?dr|release notes|digest|recap/.test(text)) return 'summary'
    if (/\bjq\b|filter the json|json filter/.test(text)) return 'jq'
    if (/typescript|\bts\b|retry|backoff|javascript/.test(text)) return 'typescript'
    if (/\b(code|function|python|script|regex|sql|query|parse|parser|bug|fix|test)\b/.test(text)) return 'python'
    if (/\bnames?\b/.test(text)) return 'names'
    if (/\b(ideas|list|suggest|options|ways)\b/.test(text)) return 'ideas'
    if (/\b(model|models|token|tokens|slow|slower|fast|faster|bigger|rate|quantiz|rounding|memory)\b/.test(text)) return 'speed'
    if (/\b(fail|failed|failure|error|broke|broken|crash|why did)\b/.test(text)) return 'failure'
    return model.capabilities.includes('code') ? 'python' : 'general'
}

const PYTHON = `\`\`\`python
from decimal import Decimal, InvalidOperation


def parse_amount(text: str) -> Decimal | None:
    """An amount from a cell, with a decimal comma or point; None for a blank or junk."""
    cleaned = text.strip().replace(" ", "")
    if cleaned in {"", "n/a", "-"}:
        return None
    if "," in cleaned and "." not in cleaned:
        cleaned = cleaned.replace(",", ".")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None
\`\`\``

const ANSWERS: Record<Kind, ((prompt: string, model: Model) => string)[]> = {
    greeting: [
        (_, model) =>
            `Hello. I am **${model.name}**, running on this machine with nothing sent anywhere else. Ask me about a job, a log, some code or a text you want written.`,
        () => 'Hi. What should we look at? I can read files you attach, write code, or summarize a long text.',
    ],
    cron: [
        () => `To run \`send-digest\` every weekday at 06:30:

\`\`\`cron
30 6 * * 1-5
\`\`\`

- \`30 6\` is the minute and the hour.
- \`* *\` takes every day of every month.
- \`1-5\` keeps Monday to Friday.

The scheduler reads it in UTC unless the job sets a time zone, so in Oslo in winter it fires at 07:30 local time.`,
        () => `Every weekday at half past six is \`30 6 * * 1-5\`.

If it should skip public holidays as well, cron alone cannot say so: leave the schedule as it is and let the job's first step, \`fetch\`, end early on a day listed as a holiday.`,
    ],
    translate: [
        () => `In Norwegian:

> Den nattlige eksporten feilet i \`validate\` fordi 37 rader hadde beløp med desimalkomma. Vi leser nå beløpene med riktig locale, så kjøringen i natt skal gå gjennom.

"Locale" is usually left as it is in Norwegian technical writing.`,
        () => `Here it is, kept close to the original:

> Eksporten stoppet ved valideringen: 37 av 2 184 rader hadde et beløp som ikke var et tall.`,
    ],
    summary: [
        () => `**The week in short**

- \`nightly-export\` failed twice, both times at \`validate\`, on amounts written with a decimal comma.
- \`sync-inventory\` timed out once while the worker restarted; the retry an hour later succeeded.
- \`rebuild-index\` is 18% slower since the index grew past two million rows.

Nothing is missing downstream. The one open item is the parse fix for \`nightly-export\`, which ships tonight.`,
        () => `It comes down to three things:

1. Two failed runs of \`nightly-export\`, one cause, now fixed.
2. One timeout in \`sync-inventory\`, already retried.
3. A slower \`rebuild-index\`, which needs a look before it doubles.

Ask grace about the index; she wrote the step.`,
    ],
    python: [
        () => `Here is a parser for amounts written either way, \`12.50\` or \`12,50\`:

${PYTHON}

It keeps \`Decimal\` rather than \`float\`, so \`12,50\` stays exactly 12.50. A test for the cases that failed last night:

\`\`\`python
assert parse_amount("12,50") == Decimal("12.50")
assert parse_amount("n/a") is None
\`\`\``,
        () => `The trick is to normalize the decimal mark before converting, and to treat blanks as missing rather than zero:

${PYTHON}

Call it on every \`amount\` cell in \`transform\`; \`validate\` then only sees numbers or \`None\`.`,
    ],
    jq: [
        () => `A jq filter that keeps the failed runs and says which step each stopped at:

\`\`\`jq
.runs[]
| select(.state == "failed")
| {job, step: .at.step, started}
\`\`\`

Run it over the API's answer:

\`\`\`bash
curl -s https://tidevann.example.org/api/runs | jq -f failed.jq
\`\`\``,
        () => `This one counts the failures per job instead of listing them:

\`\`\`jq
[.runs[] | select(.state == "failed")]
| group_by(.job)
| map({job: .[0].job, failed: length})
\`\`\``,
    ],
    typescript: [
        () => `A small TypeScript helper that retries a call with a growing pause:

\`\`\`ts
export async function retry<T>(call: () => Promise<T>, tries = 4, pause = 500): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await call()
        } catch (error) {
            if (attempt >= tries) throw error
            await new Promise((done) => setTimeout(done, pause * 2 ** (attempt - 1)))
        }
    }
}
\`\`\`

Four tries wait 0.5, 1 and 2 seconds between them, so a call that keeps failing gives up after 3.5 seconds.`,
        () => `Retry with backoff, and give up on errors that will not get better:

\`\`\`ts
const permanent = (error: unknown) => error instanceof Response && error.status < 500

export async function retry<T>(call: () => Promise<T>, tries = 4): Promise<T> {
    let wait = 500
    for (let attempt = 1; attempt < tries; attempt += 1) {
        try {
            return await call()
        } catch (error) {
            if (permanent(error)) throw error
            await new Promise((done) => setTimeout(done, wait))
            wait *= 2
        }
    }
    return call()
}
\`\`\``,
    ],
    speed: [
        () => `Think of it in two parts.

**What a model reads.** Every token of the prompt, the system prompt and the conversation so far is read before the first word comes out. That is the *time to first token*, and it grows with the length of what is sent and the size of the model.

**What a model writes.** After that it writes one token at a time, and every token passes through all of its weights. A model twice the size moves twice the bytes per token, so it writes about half as fast; rounding the weights to four bits instead of eight halves the bytes again.`,
        () => `Mostly memory bandwidth. Writing a token means reading every weight once:

| model | weights at 4 bits | tokens a second, roughly |
| --- | --- | --- |
| 3B | 1.9 GB | 110 |
| 7B | 4.4 GB | 55 |
| 14B | 8.6 GB | 30 |
| 32B | 19 GB | 14 |

The usage line under each answer shows the rate this machine actually got.`,
    ],
    failure: [
        () => `The short answer is that the input changed and the check did not.

The export reads amounts from a supplier feed. Since October 14 that feed writes them with a decimal comma, \`12,50\` rather than \`12.50\`, and \`validate\` refuses anything that does not parse as a number. Nothing in our code changed; the data did.

The fix belongs in \`transform\`, which should parse with the source's locale, not in \`validate\`, which is right to refuse junk.`,
        () => `\`nightly-export\` stopped at \`validate\`: **37 of 2,184 rows** had an \`amount\` that was not a number, mostly decimal commas like \`12,50\`.

- \`transform\` now parses amounts with the source's locale.
- Blank amounts are dropped before \`validate\`.

The next run is tonight at 02:00. Questions go to ada.`,
    ],
    ideas: [
        () => `A few ideas:

1. **Name the step in the alert.** A failure that says \`validate\` gets read faster than one that says "export failed".
2. **Keep the rejected rows.** Write them to \`rejected.csv\` beside the export, so nobody has to rerun to see them.
3. **Warn before failing.** Let up to ten bad rows through with a warning, and fail only past that.
4. **Chart the run times.** A slow creep in \`rebuild-index\` shows up weeks before it times out.`,
        () => `Three that cost little:

- Send the failing step's last ten log lines with every alert.
- Add a dry run that reads and validates without writing.
- Give each job an owner, named in its definition, so an alert reaches a person.`,
    ],
    names: [
        () => `Some names, in the house style of short sea words:

- **eddy** for the retry loop, since it goes round
- **skerry** for the small checks before a run
- **sounding** for the health probe
- **ballast** for the queue that evens out the load`,
        () =>
            'A few that read well in a log line: **undertow**, **slack-water**, **wrack** and **spindrift**. Short ones are easier to type in a command; I would pick **wrack** for the cleanup job.',
    ],
    general: [
        (prompt) => `> ${prompt.split('\n')[0].slice(0, 160)}

Here is how I would go about it. Start with what you can check: the latest run, its log, and what changed since it last worked: the code, the data or the machine. Most problems that appear overnight come from the data.

If you attach the log or the file, I can point at the line.`,
        (prompt) => `On "${prompt.split('\n')[0].slice(0, 80)}": the plain answer is that it depends on how often it changes.

- If it changes daily, automate it and keep a log.
- If it changes monthly, a checklist is enough.
- If it rarely changes, write down why it is the way it is, so the next person does not undo it.`,
    ],
}

const REASONING = (
    prompt: string,
) => `The question: "${prompt.split('\n')[0].slice(0, 90)}". Before answering, work out what is actually asked, what I know for certain, and what I would only be guessing.

Keep it to what can be checked. Name the parts in code, give one example, and say plainly where I am not sure.`

/** What a set of attachments says before the answer. */
function readAttachments(attachments: readonly Attachment[]): string {
    if (attachments.length === 0) return ''
    const lines = attachments.map((file) => {
        if (file.kind === 'image')
            return `- \`${file.name}\`: an image of ${file.detail}. I can describe what is in it if this model reads images.`
        if (file.text === undefined) return `- \`${file.name}\`: ${file.detail}. I could not read it as text.`
        const rows = file.text.split('\n').filter((line) => line.trim() !== '')
        const first = rows[0]?.slice(0, 80) ?? ''
        return `- \`${file.name}\`: ${rows.length.toLocaleString('en-US')} lines${first === '' ? '' : `, starting \`${first.replace(/`/g, "'")}\``}.`
    })
    return `I read what you attached:\n\n${lines.join('\n')}\n\n`
}

/** Cells of one CSV line, quoted cells kept whole. */
function cells(line: string): string[] {
    return (line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? [])
        .map((cell) => cell.replace(/,$/, '').replace(/^"|"$/g, '').trim())
        .filter((_, index, all) => index < all.length - 1 || all[index] !== '')
}

/** What one attached file holds, read as a person would describe it. */
function describe(file: Attachment): string {
    if (file.kind === 'image')
        return `**${file.name}** is an image (${file.detail}). This model reads text, so I can only say what its name and size suggest.`
    if (file.text === undefined) return `**${file.name}** (${file.detail}) is not text, so I could not read it.`
    const lines = file.text.split('\n').filter((line) => line.trim() !== '')
    if (/\.csv$/i.test(file.name) && lines.length > 1) {
        const head = cells(lines[0])
        const rows = lines.slice(1).map(cells)
        const blank = rows.filter((row) => row.some((cell) => cell === '' || /^(n\/a|-|null)$/i.test(cell))).length
        const commas = rows.filter((row) => row.some((cell) => /^\d+,\d+$/.test(cell))).length
        const table = [
            `| ${head.join(' | ')} |`,
            `| ${head.map(() => '---').join(' | ')} |`,
            ...rows.slice(0, 3).map((row) => `| ${row.map((cell) => `\`${cell}\``).join(' | ')} |`),
        ].join('\n')
        const notes = [
            blank > 0 ? `${String(blank)} ${blank === 1 ? 'row has' : 'rows have'} a blank or \`n/a\` cell` : '',
            commas > 0
                ? `${String(commas)} ${commas === 1 ? 'writes' : 'write'} a number with a decimal comma, which a strict parser refuses`
                : '',
        ].filter(Boolean)
        return `**${file.name}** is a CSV of ${rows.length.toLocaleString('en-US')} rows and ${String(head.length)} columns: ${head.map((name) => `\`${name}\``).join(', ')}. The first rows:

${table}
${notes.length > 0 ? `\nWorth knowing: ${notes.join(', and ')}.` : ''}`
    }
    if (/\.json$/i.test(file.name)) {
        try {
            const value: unknown = JSON.parse(file.text)
            const keys = value !== null && typeof value === 'object' ? Object.keys(value) : []
            return `**${file.name}** is JSON${
                keys.length > 0
                    ? ` with the keys ${keys
                          .slice(0, 8)
                          .map((key) => `\`${key}\``)
                          .join(', ')}`
                    : ''
            }, ${lines.length.toLocaleString('en-US')} lines long.`
        } catch {
            return `**${file.name}** looks like JSON but does not parse; the first line is \`${lines[0]?.slice(0, 60) ?? ''}\`.`
        }
    }
    const words = file.text.split(/\s+/).filter(Boolean).length
    return `**${file.name}** is ${lines.length.toLocaleString('en-US')} lines and ${words.toLocaleString('en-US')} words of text, starting:

> ${lines[0]?.slice(0, 160) ?? ''}`
}

/** Whether a prompt asks about the files sent with it. */
function aboutFiles(ask: Ask): boolean {
    return (
        ask.attachments.length > 0 &&
        (ask.prompt.trim() === '' ||
            /\b(file|files|this|these|attached|attachment|csv|log|what is in|what's in|read|look at)\b/i.test(ask.prompt))
    )
}

/** Plans the answer `ask` gets: which text, its thinking, its tokens and its pace. */
export function plan(ask: Ask): Plan {
    const kind = kindOf(ask.prompt, ask.model)
    const choices = ANSWERS[kind]
    const pick =
        ask.settings.temperature === 0
            ? 0
            : hash(`${ask.prompt}|${ask.model.id}|${String(ask.attempt)}|${String(Math.round(ask.settings.temperature * 10))}`) %
              choices.length
    let text = aboutFiles(ask)
        ? ask.attachments.map(describe).join('\n\n')
        : readAttachments(ask.attachments) + choices[pick](ask.prompt, ask.model)
    if (/\b(brief|short|concise|one sentence|terse)\b/i.test(ask.settings.system)) text = text.split('\n\n')[0]
    if (ask.model.params < 1) text = text.split('\n\n').slice(0, 2).join('\n\n')
    let note: string | undefined
    const all = pieces(text)
    let used = 0
    let cut = all.length
    for (let index = 0; index < all.length; index += 1) {
        used += tokens(all[index])
        if (used > ask.settings.maxTokens) {
            cut = index
            note = 'max tokens'
            break
        }
    }
    if (note !== undefined) text = all.slice(0, cut).join('')
    const reasoning = ask.model.capabilities.includes('reasoning') && kind !== 'greeting' ? REASONING(ask.prompt) : ''
    const input =
        tokens(ask.settings.system) +
        ask.history +
        tokens(ask.prompt) +
        ask.attachments.reduce((sum, file) => sum + tokens(file.text ?? '') + 8, 0) +
        6
    const jitter = 0.92 + (hash(`${ask.prompt}|${String(ask.attempt)}`) % 160) / 1000
    return { reasoning, text, input, prefill: prefillOf(ask.model, input), rate: rateOf(ask.model) * jitter, note }
}

/** A title for a conversation from its first prompt: its first few words. */
export function titleOf(prompt: string): string {
    const line = prompt
        .trim()
        .split('\n')[0]
        .replace(/[`*_#>]/g, '')
    if (line === '') return 'Files'
    const cut = line.split(/\s+/).slice(0, 7).join(' ')
    return cut.length < line.length ? `${cut.replace(/[.,;:?!]$/, '')}…` : cut.replace(/[.?!]$/, '')
}
