import { AssistantReply } from '@winterop-com/sokkel-ui/AssistantReply'
import { AttachmentList } from '@winterop-com/sokkel-ui/AttachmentList'
import { Composer, type ComposerAttachment } from '@winterop-com/sokkel-ui/Composer'
import { Conversation } from '@winterop-com/sokkel-ui/Conversation'
import { ConversationHistory } from '@winterop-com/sokkel-ui/ConversationHistory'
import { useStore } from '@winterop-com/sokkel-ui/hooks/use-store'
import { useStored } from '@winterop-com/sokkel-ui/hooks/use-stored'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageState } from '@winterop-com/sokkel-ui/PageState'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Bubble, BubbleContent } from '@winterop-com/sokkel-ui/primitives/bubble'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@winterop-com/sokkel-ui/primitives/item'
import { Message, MessageContent } from '@winterop-com/sokkel-ui/primitives/message'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@winterop-com/sokkel-ui/primitives/sheet'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { UsageLine } from '@winterop-com/sokkel-ui/UsageLine'
import { Bot, FileText, History as HistoryIcon, MessageSquarePlus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { go } from 'tidevann-shared/router'
import { chatWith } from '../actions'
import { conversations as talks } from '../data/backend'
import { bytes, clock } from '../data/format'
import type { AssistantMessage, Attachment, Conversation as Talk, Model, UserMessage, Version } from '../data/model'
import { newId } from '../data/seed'
import { chatKey, giveFeedback, regenerate, send, showVersion, stopConversation } from '../engine/chat'
import { live, usageOf, writing, type Live } from '../engine/stream'
import { useApp } from '../state'
import { ModelSelect } from './ChatSettings'

/** Whether the window is a phone's or a folded foldable's width, where the history moves into a sheet. */
function useNarrow(): boolean {
    const query = '(max-width: 767px)'
    const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches)
    useEffect(() => {
        const list = window.matchMedia(query)
        const change = () => setNarrow(list.matches)
        list.addEventListener('change', change)
        return () => list.removeEventListener('change', change)
    }, [])
    return narrow
}

const SUGGESTIONS = [
    { title: 'Write a parser', prompt: 'Write a Python function to parse amounts that may use a decimal comma, like 12,50.' },
    { title: 'Explain a slowdown', prompt: 'Explain why a bigger model writes slower than a small one.' },
    { title: 'A cron schedule', prompt: 'What cron schedule runs send-digest every weekday at 06:30?' },
    { title: 'Summarize a week', prompt: 'Summarize this week for the harbor project: failures, timeouts and anything slow.' },
]

/** A question as the person sent it: the files with it, then the text in a bubble. */
function Question({ message }: { message: UserMessage }) {
    return (
        <Message align="end">
            <MessageContent>
                {message.attachments.length > 0 && (
                    <AttachmentList
                        size="sm"
                        files={message.attachments.map((file) => ({
                            id: file.id,
                            name: file.name,
                            detail: file.detail,
                            image: file.url,
                            icon: <FileText aria-hidden />,
                        }))}
                    />
                )}
                {message.text !== '' && (
                    <Bubble align="end" variant="secondary">
                        <BubbleContent>{message.text}</BubbleContent>
                    </Bubble>
                )}
            </MessageContent>
        </Message>
    )
}

/** An answer, from what is being written when it streams, else from what the conversation kept. */
function Reply({ talk, message, models }: { talk: Talk; message: AssistantMessage; models: readonly Model[] }) {
    const all = useStore(live)
    const version: Version = message.versions[message.at]
    const now: Live | undefined = all[chatKey(talk.id, message.id, message.at)]
    const model = models.find((one) => one.id === (now?.model ?? version.model))
    const name = model?.name ?? version.model
    const text = now?.text ?? version.text
    const reasoning = now?.reasoning ?? version.reasoning
    const streaming =
        now !== undefined ? now.phase !== 'done' && now.phase !== 'stopped' && now.phase !== 'failed' : version.state === 'streaming'
    const state = streaming ? 'streaming' : now?.phase === 'failed' ? 'failed' : now?.phase === 'stopped' ? 'stopped' : version.state
    const usage = now !== undefined && now.first !== null ? usageOf(now) : version.usage
    const problem = now?.problem ?? version.problem
    return (
        <AssistantReply
            mark={<Bot aria-hidden />}
            name={<span className="font-mono">{name}</span>}
            time={clock(version.time)}
            timeTitle={new Date(version.time).toLocaleString('en-US')}
            reasoning={reasoning === '' ? undefined : reasoning}
            content={text}
            state={state}
            problem={problem === undefined ? undefined : { detail: problem }}
            onRetry={() => void regenerate(talk.id, message.id)}
            feedback={version.feedback}
            onFeedback={(feedback) => giveFeedback(talk.id, message.id, feedback)}
            versions={
                message.versions.length > 1
                    ? {
                          at: message.at + 1,
                          of: message.versions.length,
                          onChange: (at) => showVersion(talk.id, message.id, at - 1),
                      }
                    : undefined
            }
            words={{
                thinking:
                    now?.phase === 'loading' ? `Loading ${name} into memory` : now?.phase === 'waiting' ? 'Reading the prompt' : 'Thinking',
                tryAgain: 'Regenerate',
            }}
        >
            {usage !== null && usage !== undefined && <UsageLine {...usage} live={streaming} />}
        </AssistantReply>
    )
}

/** Reads a picked file as the chat keeps it: a text file's text, a small image as a picture, any other by its name and size. */
function readFile(file: File): Promise<Attachment> {
    const image = file.type.startsWith('image/')
    const text = !image && (file.type.startsWith('text/') || /\.(csv|json|ya?ml|md|log|txt|py|ts|tsx|js|sql|toml)$/i.test(file.name))
    const id = newId('a')
    const kind = file.name.split('.').pop()?.toUpperCase() ?? 'FILE'
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : ''
            if (image)
                resolve({
                    id,
                    name: file.name,
                    kind: 'image',
                    size: file.size,
                    detail: `${kind}, ${bytes(file.size)}`,
                    url: file.size < 400_000 ? result : undefined,
                })
            else if (text) {
                const lines = result.split('\n').filter((line) => line.trim() !== '').length
                resolve({
                    id,
                    name: file.name,
                    kind: 'file',
                    size: file.size,
                    detail: `${kind}, ${lines.toLocaleString('en-US')} lines`,
                    text: result.slice(0, 200_000),
                })
            } else resolve({ id, name: file.name, kind: 'file', size: file.size, detail: `${kind}, ${bytes(file.size)}` })
        }
        reader.onerror = () => resolve({ id, name: file.name, kind: 'file', size: file.size, detail: bytes(file.size) })
        if (image) reader.readAsDataURL(file)
        else if (text) reader.readAsText(file)
        else resolve({ id, name: file.name, kind: 'file', size: file.size, detail: `${kind}, ${bytes(file.size)}` })
    })
}

/** A conversation not yet begun: the model it talks to, and four things to ask. */
function Start({ model, onAsk }: { model: Model | undefined; onAsk: (prompt: string) => void }) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Bot aria-hidden />
                </EmptyMedia>
                <EmptyTitle>Ask {model?.name ?? 'a model'}</EmptyTitle>
                <EmptyDescription>It runs on this machine; nothing you write leaves it.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-xl">
                <ItemGroup>
                    <Columns gap="sm" min="sm">
                        {SUGGESTIONS.map((suggestion) => (
                            <Item
                                key={suggestion.title}
                                variant="outline"
                                size="sm"
                                render={<button type="button" onClick={() => onAsk(suggestion.prompt)} />}
                            >
                                <ItemContent>
                                    <ItemTitle>{suggestion.title}</ItemTitle>
                                    <ItemDescription>{suggestion.prompt}</ItemDescription>
                                </ItemContent>
                            </Item>
                        ))}
                    </Columns>
                </ItemGroup>
            </EmptyContent>
        </Empty>
    )
}

/** The list of conversations, with rename, pin and delete. */
function History({ current, framed = false }: { current: string | undefined; framed?: boolean }) {
    const { conversations } = useApp()
    return (
        <ConversationHistory
            framed={framed}
            conversations={conversations.map((one) => ({ id: one.id, title: one.title, time: one.time, pinned: one.pinned }))}
            current={current}
            onSelect={(id) => go(`/chat/${id}`)}
            onRename={(id, title) => void talks.update(id, { title })}
            onPin={(id, pinned) => void talks.update(id, { pinned })}
            onDelete={(id) => {
                stopConversation(id)
                void talks.remove(id).then(() => {
                    if (id === current) go('/chat')
                })
            }}
        />
    )
}

/** The chat: conversations beside the one open, its messages streaming in, and the composer with its files. */
export function ChatPage({ id }: { id: string | undefined }) {
    const { conversations, models, modelOf, prefs, loading } = useApp()
    const narrow = useNarrow()
    const [showHistory, setShowHistory] = useStored('models.chat.history', true)
    const [historyOpen, setHistoryOpen] = useState(false)
    const [drafts, setDrafts] = useStored<Record<string, string>>('models.chat.drafts', {})
    const [files, setFiles] = useState<ComposerAttachment[]>([])
    const [read, setRead] = useState<Attachment[]>([])
    const all = useStore(live)
    const talk = id === undefined ? undefined : conversations.find((one) => one.id === id)

    // A bare chat address opens the latest conversation, or starts one with the default model.
    useEffect(() => {
        if (id !== undefined || loading) return
        const latest = [...conversations].sort((a, b) => b.time - a.time)[0]
        if (latest !== undefined) window.location.replace(`#/chat/${latest.id}`)
        else {
            const model = modelOf(prefs.defaultModel) ?? models[0]
            if (model !== undefined) chatWith(model)
        }
    }, [id, loading, conversations, models, modelOf, prefs.defaultModel])

    useEffect(() => {
        setFiles([])
        setRead([])
        setHistoryOpen(false)
    }, [id])

    if (talk === undefined)
        return (
            <PageState
                loading={loading || id === undefined}
                empty
                emptyMessage="This conversation is gone. Pick another, or start a new one."
            >
                {null}
            </PageState>
        )

    const model = modelOf(talk.model)
    const busy = writing(all, `chat:${talk.id}:`)
    const draft = drafts[talk.id] ?? ''
    const setDraft = (text: string) => setDrafts((kept) => ({ ...kept, [talk.id]: text }))
    const submit = (text: string) => {
        if (busy) return
        void send(talk.id, text, read)
        setDraft('')
        setFiles([])
        setRead([])
    }
    const attach = (picked: File[]) => {
        const pending = picked.map((file) => ({
            id: newId('up'),
            name: file.name,
            kind: 'file' as const,
            detail: bytes(file.size),
            uploading: true,
        }))
        setFiles((now) => [...now, ...pending])
        picked.forEach((file, index) => {
            void readFile(file).then((attachment) => {
                setRead((now) => [...now, { ...attachment, id: pending[index].id }])
                setFiles((now) =>
                    now.map((one) =>
                        one.id === pending[index].id
                            ? { id: one.id, name: attachment.name, kind: attachment.kind, detail: attachment.detail, url: attachment.url }
                            : one,
                    ),
                )
            })
        })
    }
    const drop = (fileId: string) => {
        setFiles((now) => now.filter((one) => one.id !== fileId))
        setRead((now) => now.filter((one) => one.id !== fileId))
    }

    const header = (
        <PaneHeader
            title={talk.title}
            start={
                <IconButton
                    label={narrow ? 'Conversations' : showHistory ? 'Hide conversations' : 'Show conversations'}
                    pressed={narrow ? undefined : showHistory}
                    onClick={() => (narrow ? setHistoryOpen(true) : setShowHistory(!showHistory))}
                >
                    <HistoryIcon aria-hidden />
                </IconButton>
            }
            actions={
                <>
                    <IconButton label="New chat" onClick={() => model !== undefined && chatWith(model)}>
                        <MessageSquarePlus aria-hidden />
                    </IconButton>
                </>
            }
        />
    )

    const column = (
        <Conversation
            header={header}
            composer={
                <Stack gap="xs" className="mx-auto w-full max-w-3xl">
                    <Composer
                        value={draft}
                        onChange={setDraft}
                        onSend={() => submit(draft)}
                        onStop={() => stopConversation(talk.id)}
                        busy={busy}
                        attachments={files}
                        onAttach={attach}
                        onRemove={drop}
                        accept=".txt,.md,.csv,.json,.yaml,.yml,.log,.py,.ts,.sql,image/*"
                        tools={
                            <ModelSelect
                                variant="quiet"
                                value={talk.model}
                                onChange={(next) => void talks.update(talk.id, { model: next })}
                            />
                        }
                        words={{ placeholder: model === undefined ? 'Pick a model to ask' : `Ask ${model.name}` }}
                    />
                </Stack>
            }
        >
            {talk.messages.length === 0 ? (
                <Start model={model} onAsk={submit} />
            ) : (
                <Stack gap="xl" className="mx-auto w-full max-w-3xl px-4 py-6">
                    {talk.messages.map((message) =>
                        message.role === 'user' ? (
                            <Question key={message.id} message={message} />
                        ) : (
                            <Reply key={message.id} talk={talk} message={message} models={models} />
                        ),
                    )}
                </Stack>
            )}
        </Conversation>
    )

    return (
        <>
            {showHistory && !narrow ? (
                <SplitPane
                    id="models.chat.split"
                    defaultShare={0.26}
                    minShare={0.18}
                    maxShare={0.4}
                    narrow="second"
                    first={<History current={talk.id} />}
                    second={column}
                />
            ) : (
                column
            )}
            <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetContent side="left">
                    <SheetHeader>
                        <SheetTitle>Conversations</SheetTitle>
                    </SheetHeader>
                    <History current={talk.id} />
                    <Button
                        variant="outline"
                        className="mx-4 mb-4"
                        onClick={() => {
                            if (model !== undefined) chatWith(model)
                            else toast.add({ type: 'error', title: 'Pick a model first' })
                        }}
                    >
                        <MessageSquarePlus aria-hidden />
                        New chat
                    </Button>
                </SheetContent>
            </Sheet>
        </>
    )
}
