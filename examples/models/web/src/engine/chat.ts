/**
 * What the chat and the comparison do: a message sent and answered, an answer asked for again or
 * stopped, a conversation started, and one prompt sent to several models at once. Each answer is
 * written by the stream engine and kept in its conversation or comparison once it ends.
 */

import { comparisons, conversations, models } from '../data/backend'
import {
    type AssistantMessage,
    type Attachment,
    type CompareColumn,
    type Comparison,
    type Conversation,
    type Message,
    type Model,
    type Sampling,
    type Version,
} from '../data/model'
import { newId } from '../data/seed'
import { titleOf, tokens } from './generate'
import { mirror } from './mirror'
import { answer, live, stopAnswer, usageOf, type Live } from './stream'

const state = { conversations: mirror(conversations), models: mirror(models), comparisons: mirror(comparisons) }

const modelNow = (id: string): Model | undefined => state.models.rows().find((model) => model.id === id)
const conversationNow = (id: string): Conversation | undefined => state.conversations.rows().find((one) => one.id === id)

/** The key an answer streams under: its conversation, its message and its version. */
export const chatKey = (conversation: string, message: string, version: number) => `chat:${conversation}:${message}:${String(version)}`

function versionOf(ended: Live, base: Version): Version {
    return {
        ...base,
        text: ended.text,
        reasoning: ended.reasoning,
        state: ended.phase === 'done' ? 'done' : ended.phase === 'failed' ? 'failed' : 'stopped',
        usage: ended.first === null ? null : usageOf(ended, ended.ended ?? Date.now()),
        problem: ended.problem,
    }
}

const queues = new Map<string, Promise<unknown>>()

/**
 * Runs the changes to one conversation or comparison one after another, each reading it as the one
 * before left it, so two answers ending together never write over each other.
 */
function serially<T>(key: string, run: () => Promise<T>): Promise<T> {
    const next = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(run)
    queues.set(key, next)
    return next
}

/** Changes one answer of a conversation, as the conversation is when the change is made. */
function changeMessage(
    conversation: string,
    message: string,
    change: (one: AssistantMessage) => AssistantMessage,
    touch = false,
): Promise<unknown> {
    return serially(conversation, async () => {
        const now = conversationNow(conversation)
        if (now === undefined) return
        const messages = now.messages.map((one): Message => (one.id === message && one.role === 'assistant' ? change(one) : one))
        await conversations.update(conversation, touch ? { messages, time: Date.now() } : { messages })
    })
}

/** Puts an ended answer in its message's version. */
function keep(conversation: string, message: string, at: number, ended: Live): Promise<unknown> {
    return changeMessage(
        conversation,
        message,
        (one) => ({ ...one, versions: one.versions.map((version, index) => (index === at ? versionOf(ended, version) : version)) }),
        true,
    )
}

/** Shows another version of an answer asked for more than once. */
export function showVersion(conversation: string, message: string, at: number): void {
    void changeMessage(conversation, message, (one) => ({ ...one, at }))
}

/** Keeps the feedback given on the version of an answer shown. */
export function giveFeedback(conversation: string, message: string, feedback: 'good' | 'bad' | undefined): void {
    void changeMessage(conversation, message, (one) => ({
        ...one,
        versions: one.versions.map((version, index) => (index === one.at ? { ...version, feedback } : version)),
    }))
}

/** Tokens of the conversation before message `upTo`, as the model reads them again. */
function historyOf(messages: readonly Message[], upTo: number): number {
    return messages.slice(0, upTo).reduce((sum, one) => {
        if (one.role === 'user') return sum + tokens(one.text) + 4
        const version = one.versions[one.at]
        return sum + tokens(version.text) + 4
    }, 0)
}

function ask(
    conversation: Conversation,
    model: Model,
    prompt: string,
    attachments: readonly Attachment[],
    history: number,
    attempt: number,
) {
    return { prompt, model, settings: conversation.settings, attachments, history, attempt }
}

/** Starts a conversation with a model, its settings from the model's defaults. */
export async function startConversation(model: Model, title = 'New chat'): Promise<Conversation> {
    return conversations.create({ title, model: model.id, time: Date.now(), pinned: false, messages: [], settings: { ...model.defaults } })
}

/** Sends a message in a conversation and has its model answer it. */
export async function send(conversationId: string, text: string, attachments: readonly Attachment[]): Promise<void> {
    const conversation = conversationNow(conversationId)
    if (conversation === undefined) return
    const model = modelNow(conversation.model)
    const now = Date.now()
    const user: Message = { id: newId('m'), role: 'user', text, time: now, attachments: [...attachments] }
    const reply: AssistantMessage = {
        id: newId('m'),
        role: 'assistant',
        versions: [{ text: '', model: conversation.model, state: 'streaming', usage: null, time: now }],
        at: 0,
    }
    await serially(conversationId, async () => {
        const latest = conversationNow(conversationId) ?? conversation
        const title = latest.messages.length === 0 && latest.title === 'New chat' ? titleOf(text) : latest.title
        await conversations.update(conversationId, { messages: [...latest.messages, user, reply], time: now, title })
    })
    if (model === undefined) {
        await keep(
            conversationId,
            reply.id,
            0,
            failed(conversation.model, 'This model is no longer in the library. Pick another one for the conversation.'),
        )
        return
    }
    answer(
        chatKey(conversationId, reply.id, 0),
        ask(conversation, model, text, attachments, historyOf(conversation.messages, conversation.messages.length), 0),
        (ended) => keep(conversationId, reply.id, 0, ended),
    )
}

function failed(model: string, problem: string): Live {
    const now = Date.now()
    return { model, phase: 'failed', reasoning: '', text: '', input: 0, output: 0, asked: now, first: null, ended: now, rate: 0, problem }
}

/** Asks for another version of an answer, from the conversation's model as it is now. */
export async function regenerate(conversationId: string, messageId: string): Promise<void> {
    const conversation = conversationNow(conversationId)
    if (conversation === undefined) return
    const index = conversation.messages.findIndex((one) => one.id === messageId)
    const reply = conversation.messages[index]
    const question = conversation.messages[index - 1]
    if (reply?.role !== 'assistant' || question?.role !== 'user') return
    const model = modelNow(conversation.model)
    const at = reply.versions.length
    const version: Version = { text: '', model: conversation.model, state: 'streaming', usage: null, time: Date.now() }
    await changeMessage(conversationId, messageId, (one) => ({ ...one, versions: [...one.versions, version], at }), true)
    if (model === undefined) {
        await keep(conversationId, messageId, at, failed(conversation.model, 'This model is no longer in the library.'))
        return
    }
    answer(
        chatKey(conversationId, messageId, at),
        ask(conversation, model, question.text, question.attachments, historyOf(conversation.messages, index - 1), at),
        (ended) => keep(conversationId, messageId, at, ended),
    )
}

/** Stops whatever the conversation's model is writing. */
export function stopConversation(conversationId: string): void {
    for (const key of Object.keys(live.get())) if (key.startsWith(`chat:${conversationId}:`)) stopAnswer(key)
}

export function setSettings(conversationId: string, settings: Partial<Sampling>): void {
    void serially(conversationId, async () => {
        const conversation = conversationNow(conversationId)
        if (conversation !== undefined) await conversations.update(conversationId, { settings: { ...conversation.settings, ...settings } })
    })
}

/** The key a comparison's column streams under. */
export const compareKey = (comparison: string, column: number) => `cmp:${comparison}:${String(column)}`

function keepColumn(id: string, index: number, ended: Live): Promise<unknown> {
    return serially(id, async () => {
        const now = state.comparisons.rows().find((one) => one.id === id)
        if (now === undefined) return
        const columns = now.columns.map((column, at): CompareColumn =>
            at === index
                ? {
                      ...column,
                      text: ended.text,
                      reasoning: ended.reasoning,
                      state: ended.phase === 'done' ? 'done' : ended.phase === 'failed' ? 'failed' : 'stopped',
                      usage: ended.first === null ? null : usageOf(ended, ended.ended ?? Date.now()),
                      problem: ended.problem,
                  }
                : column,
        )
        await comparisons.update(id, { columns })
    })
}

function settingsOf(comparison: Pick<Comparison, 'temperature' | 'maxTokens'>): Sampling {
    return { temperature: comparison.temperature, topP: 0.9, maxTokens: comparison.maxTokens, system: '' }
}

function runColumn(comparison: Comparison, index: number, attempt: number): void {
    const column = comparison.columns[index]
    const model = modelNow(column.model)
    if (model === undefined) {
        void keepColumn(comparison.id, index, failed(column.model, 'This model is no longer in the library.'))
        return
    }
    answer(
        compareKey(comparison.id, index),
        { prompt: comparison.prompt, model, settings: settingsOf(comparison), attachments: [], history: 0, attempt },
        (ended) => keepColumn(comparison.id, index, ended),
    )
}

/** Sends one prompt to every model named, side by side, and keeps it as a comparison. */
export async function compare(prompt: string, modelIds: readonly string[], temperature: number, maxTokens: number): Promise<Comparison> {
    const made = await comparisons.create({
        prompt,
        time: Date.now(),
        temperature,
        maxTokens,
        columns: modelIds.map((model) => ({ model, state: 'waiting', text: '', usage: null })),
    })
    made.columns.forEach((_, index) => runColumn(made, index, 0))
    return made
}

/** Asks one column's model again. */
export async function rerunColumn(id: string, index: number): Promise<void> {
    const next = await serially(id, async () => {
        const comparison = state.comparisons.rows().find((one) => one.id === id)
        if (comparison === undefined) return undefined
        const columns = comparison.columns.map((column, at): CompareColumn =>
            at === index ? { ...column, state: 'waiting', text: '', reasoning: '', usage: null, problem: undefined } : column,
        )
        return comparisons.update(id, { columns })
    })
    if (next !== undefined) runColumn(next, index, Date.now() % 97)
}

export function stopColumn(id: string, index: number): void {
    stopAnswer(compareKey(id, index))
}

export function stopComparison(id: string): void {
    for (const key of Object.keys(live.get())) if (key.startsWith(`cmp:${id}:`)) stopAnswer(key)
}

/** Answers a reload cut off are kept as stopped, with what they had written. */
export function settleCutOff(): void {
    void state.conversations.ready.then(() => {
        for (const conversation of state.conversations.rows()) {
            const stale = conversation.messages.some(
                (one) => one.role === 'assistant' && one.versions.some((version) => version.state === 'streaming'),
            )
            if (!stale) continue
            const messages = conversation.messages.map((one): Message =>
                one.role === 'assistant'
                    ? {
                          ...one,
                          versions: one.versions.map((version) =>
                              version.state === 'streaming' ? { ...version, state: 'stopped' as const } : version,
                          ),
                      }
                    : one,
            )
            void conversations.update(conversation.id, { messages })
        }
    })
    void state.comparisons.ready.then(() => {
        for (const comparison of state.comparisons.rows()) {
            if (!comparison.columns.some((column) => column.state === 'waiting' || column.state === 'streaming')) continue
            const columns = comparison.columns.map((column): CompareColumn =>
                column.state === 'waiting' || column.state === 'streaming' ? { ...column, state: 'stopped' } : column,
            )
            void comparisons.update(comparison.id, { columns })
        }
    })
}
