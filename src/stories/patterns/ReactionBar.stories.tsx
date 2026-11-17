import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { ReactionBar, ReactionChips, toggleReaction, type ChatReaction } from '@winterop-com/sokkel-ui/ReactionBar'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import clip from '../media/fixtures/clip.webm?url'

/**
 * The short list of reactions: round buttons with the emoji large and a more button at the end
 * that opens the full emoji picker, its choice going the same way. It floats over a video call or
 * a message on a popup's ground, or sits in a toolbar, and scrolls inside itself in a narrow room.
 */
const meta: Meta = { title: 'Patterns/Reaction bar', parameters: { frame: 'padded' } }
export default meta

const RECENT = ['\u{1F680}', '✅', '\u{1F440}', '\u{1F64F}', '\u{1F525}']

/** A bar that says what was given last and marks what the person has given. */
function Live({ start = [], moreOpen = false }: { start?: string[]; moreOpen?: boolean }) {
    const [given, setGiven] = useState<string[]>(start)
    return (
        <TooltipProvider>
            <Stack gap="sm" align="start" className={moreOpen ? 'pt-96' : undefined}>
                <ReactionBar
                    selected={given}
                    defaultMoreOpen={moreOpen}
                    picker={{ recent: RECENT }}
                    onReact={(emoji) => setGiven((now) => (now.includes(emoji) ? now.filter((item) => item !== emoji) : [...now, emoji]))}
                />
                <p className="text-sm text-muted-foreground">{given.length === 0 ? 'No reactions given' : `Given: ${given.join(' ')}`}</p>
            </Stack>
        </TooltipProvider>
    )
}

/** The default quick reactions and the more button. */
export const Quick: StoryObj = { render: () => <Live /> }

/** Two reactions already given, drawn pressed; a press takes one back. */
export const Selected: StoryObj = { render: () => <Live start={['❤️', '\u{1F389}']} /> }

/** An app's own short list, small, in a toolbar with no frame of its own. */
export const Toolbar: StoryObj = {
    render: () => (
        <TooltipProvider>
            <ReactionBar
                size="sm"
                framed={false}
                reactions={['✅', '\u{1F440}', '\u{1F680}', '\u{1F525}']}
                picker={{ recent: RECENT }}
                onReact={() => undefined}
            />
        </TooltipProvider>
    ),
}

/** The more button pressed: the full list opens over the bar, Recent first. */
export const More: StoryObj = { render: () => <Live moreOpen /> }

const START: ChatReaction[] = [
    { id: '\u{1F44D}', icon: '\u{1F44D}', label: 'thumbs up', count: 3, mine: true },
    { id: '\u{1F389}', icon: '\u{1F389}', label: 'party popper', count: 1 },
]

/** The reactions under a message: a press adds or takes back yours, and the button at the end opens the bar to give a new one. */
function Counts() {
    const [reactions, setReactions] = useState<ChatReaction[]>(START)
    return (
        <TooltipProvider>
            <Stack gap="sm" className="max-w-md">
                <p className="text-sm">nightly-export finished in 4 minutes, the fastest run this month.</p>
                <ReactionChips
                    reactions={reactions}
                    onReact={(id) => setReactions((now) => toggleReaction(now, id))}
                    onReaction={(emoji, name) => setReactions((now) => toggleReaction(now, emoji, name))}
                    bar={{ picker: { recent: RECENT } }}
                />
            </Stack>
        </TooltipProvider>
    )
}

/** Counts under a message that go up and down as reactions are given and taken back. */
export const Chips: StoryObj = { name: 'Reaction counts', render: () => <Counts /> }

/** A video playing, with the bar floating over its foot; the reaction given rises over the picture. */
function Call() {
    const [given, setGiven] = useState<{ emoji: string; at: number }[]>([])
    return (
        <TooltipProvider>
            <div className="relative max-w-3xl">
                <VideoPlayer src={clip} title="harbor, weekly review" />
                {given.slice(-3).map((item, index) => (
                    <span
                        key={item.at}
                        className="pointer-events-none absolute top-6 font-emoji text-emoji"
                        style={{ left: `${String(40 + index * 8)}%` }}
                    >
                        {item.emoji}
                    </span>
                ))}
                <ReactionBar
                    picker={{ recent: RECENT }}
                    onReact={(emoji) => setGiven((now) => [...now, { emoji, at: now.length }])}
                    className="absolute bottom-16 left-1/2 w-max -translate-x-1/2"
                />
            </div>
        </TooltipProvider>
    )
}

/** The bar floating over a video, as over a call: a reaction given shows over the picture. */
export const OverVideo: StoryObj = { name: 'Over a video', render: () => <Call /> }
