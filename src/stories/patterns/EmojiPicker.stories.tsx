import type { Meta, StoryObj } from '@storybook/react-vite'
import { Smile } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

import { EmojiPicker, EmojiPickerPopover, type SkinTone } from '@winterop-com/sokkel-ui/EmojiPicker'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { Surface } from '@winterop-com/sokkel-ui/Section'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/**
 * The full list of emoji to pick one from: a search over names and keywords, the grid grouped by
 * kind with Recent first, and a tab per group along the bottom. The data set loads the first time
 * a picker is drawn. Each story gives its recent emoji as data, so it draws the same every time.
 */
const meta: Meta = { title: 'Patterns/Emoji picker', parameters: { frame: 'padded' } }
export default meta

const RECENT = ['\u{1F44D}', '❤️', '\u{1F389}', '\u{1F680}', '✅', '\u{1F440}', '\u{1F64F}', '\u{1F525}', '\u{1F602}', '\u{1F914}']

/** A picker that holds its recent emoji and tone in the story, and says the last one picked under it. */
function Live({
    recent: start = RECENT,
    tone: startTone = 0,
    ...props
}: Partial<ComponentProps<typeof EmojiPicker>> & { tone?: SkinTone }) {
    const [recent, setRecent] = useState<readonly string[]>(start)
    const [tone, setTone] = useState<SkinTone>(startTone)
    const [picked, setPicked] = useState<string>()
    return (
        <Stack gap="sm" align="start">
            <Surface className="w-fit max-w-full">
                <EmojiPicker
                    autoFocus={false}
                    recent={recent}
                    onRecentChange={setRecent}
                    skinTone={tone}
                    onSkinToneChange={setTone}
                    {...props}
                    onPick={(emoji, name) => setPicked(`${emoji} ${name}`)}
                />
            </Surface>
            <p className="text-sm text-muted-foreground" aria-live="polite">
                {picked === undefined ? 'Nothing picked yet' : `Picked ${picked}`}
            </p>
        </Stack>
    )
}

/** The picker on a card: Recent first, then every group, the tabs saying which is in view. */
export const Inline: StoryObj = { render: () => <Live /> }

/** A search for "heart": every emoji whose name or keywords hold it, those named for it first. */
export const Search: StoryObj = { render: () => <Live defaultQuery="heart" /> }

/** A search that finds nothing says so. */
export const NoMatch: StoryObj = { name: 'No match', render: () => <Live defaultQuery="nightly-export" /> }

/** The medium skin tone chosen: the people and hands that take a tone wear it. */
export const SkinTones: StoryObj = { name: 'Skin tone', render: () => <Live tone={3} recent={[]} /> }

/** The picker in a popover, opened from an icon button in a toolbar, as a composer opens it. */
export const Popover: StoryObj = {
    render: () => (
        <TooltipProvider>
            <Stack className="pt-96">
                <EmojiPickerPopover
                    defaultOpen
                    recent={RECENT}
                    onPick={() => undefined}
                    trigger={
                        <IconButton label="Emoji">
                            <Smile aria-hidden />
                        </IconButton>
                    }
                />
            </Stack>
        </TooltipProvider>
    ),
}
