import type { Meta, StoryObj } from '@storybook/react-vite'
import { Hash, Mic, SquareSlash } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { MessageComposer, MessageComposerAction, type MessageSchedule } from '../../components/MessageComposer'
import { TooltipProvider } from '../../components/ui/tooltip'

/**
 * The composer of a team chat: the format bar, Write and Preview, the code block's languages, and
 * the row of actions with Send and its schedule menu. Each sits at the foot of a channel, as wide as
 * the channel's column.
 */
function Channel({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <div className="flex min-h-svh flex-col justify-end bg-background px-(--density-chat-inset) py-4 text-foreground">
                {children}
            </div>
        </TooltipProvider>
    )
}

type Props = Omit<ComponentProps<typeof MessageComposer>, 'value' | 'onChange' | 'onSend'>

/** A composer that holds its own draft, so a story can be typed in. */
function Live({ draft = '', ...props }: Props & { draft?: string }) {
    const [value, setValue] = useState(draft)
    return (
        <Channel>
            <MessageComposer
                value={value}
                onChange={setValue}
                onSend={() => setValue('')}
                onAttach={() => undefined}
                onEmoji={() => undefined}
                onMention={() => undefined}
                onSendLater={() => undefined}
                {...props}
            />
        </Channel>
    )
}

const FORMATTED = `**validate** now reads amounts with the \`nb-NO\` locale. Of the 37 rows it rejected last night:
- 35 pass with a decimal comma
- 2 still carry \`n/a\` and need a fix at the source`

const PAYLOAD = `The payload \`sync-inventory\` sent before it failed, for **grace**:

\`\`\`json
{
  "job": "sync-inventory",
  "run": "run_01JCF8Q2",
  "state": "failed",
  "step": "validate",
  "rejected": 37,
  "host": "api.example.org"
}
\`\`\``

const FLOW = `How a run moves through its steps once \`validate\` can warn:

\`\`\`mermaid
flowchart LR
  fetch --> transform --> validate --> upload --> notify
  validate -. warn .-> notify
\`\`\``

const SCHEDULE: MessageSchedule[] = [
    { id: 'hour', label: 'In an hour', detail: '10:41' },
    { id: 'tomorrow', label: 'Tomorrow morning', detail: 'Sat 09:00' },
    { id: 'monday', label: 'Next Monday', detail: 'Mon 09:00' },
]

const meta: Meta = { title: 'Patterns/Message composer' }
export default meta

/** An empty draft with the format bar hidden: add, text style, emoji and mention, and Send muted until there is text. */
export const Empty: StoryObj = {
    render: () => <Live defaultFormatting={false} words={{ placeholder: 'Message #harbor-ops' }} />,
}

/** The format bar shown over a draft with bold, code and a list, and Write and Preview at its end. */
export const Formatting: StoryObj = {
    render: () => <Live draft={FORMATTED} words={{ placeholder: 'Message #harbor-ops' }} />,
}

/** The code block menu open: Plain text, then each language the highlighter colors, and Mermaid for diagrams. */
export const CodeLanguages: StoryObj = {
    name: 'Code languages',
    render: () => (
        <Live draft="The rows that failed, from the run's output:" defaultCodeMenuOpen words={{ placeholder: 'Message #harbor-ops' }} />
    ),
}

/** A draft with a json fence in Preview, highlighted with its copy button as the sent message draws it. */
export const JsonPreview: StoryObj = {
    name: 'JSON preview',
    render: () => <Live draft={PAYLOAD} defaultMode="preview" words={{ placeholder: 'Message #harbor-ops' }} />,
}

/** A draft with a mermaid fence in Preview, drawn as the diagram the sent message shows. */
export const DiagramPreview: StoryObj = {
    name: 'Diagram preview',
    render: () => <Live draft={FLOW} defaultMode="preview" words={{ placeholder: 'Message #harbor-ops' }} />,
}

function Reply() {
    const [also, setAlso] = useState(true)
    return (
        <Live
            draft="Merged harbor#412. The next nightly-export run picks it up at 02:00."
            alsoSendTo={
                <>
                    <Hash className="size-3" aria-hidden />
                    harbor-ops
                </>
            }
            alsoSend={also}
            onAlsoSendChange={setAlso}
            actions={
                <>
                    <MessageComposerAction label="Record a clip" onClick={() => undefined}>
                        <Mic aria-hidden />
                    </MessageComposerAction>
                    <MessageComposerAction label="Shortcuts" onClick={() => undefined}>
                        <SquareSlash aria-hidden />
                    </MessageComposerAction>
                </>
            }
            onMore={() => undefined}
            schedule={SCHEDULE}
            onSchedule={() => undefined}
            words={{ placeholder: 'Reply' }}
        />
    )
}

/** A reply in a thread that also goes to #harbor-ops, with more actions after the mention and the times Send can wait for. */
export const ThreadReply: StoryObj = {
    name: 'Thread reply',
    render: () => <Reply />,
}
