import { Brain } from 'lucide-react'
import { useState } from 'react'

import { Markdown, type MarkdownWords } from './Markdown'
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from './ui/trace'

/** How many words a text holds, markdown marks and all. */
export function wordCount(text: string): number {
    return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}

/** The words the folded thinking says. */
export interface ReasoningWords {
    /** The folded line over finished thinking, from its length in words. */
    thoughtFor: (words: number) => string
    /** The line while the model thinks. */
    thinking: string
    markdown: Partial<MarkdownWords>
}

export interface ReasoningProps {
    text: string
    /** Still being written: open, its line shimmering. */
    thinking: boolean
    math?: boolean
    /** Draws the images the thinking holds; off, each is its alt text and address. On by default, as in `Markdown`. */
    images?: boolean
    /** The schemes a link may have to be live, as `Markdown` takes them. */
    linkSchemes?: readonly string[]
    /** Follows a link inside the app, as `Markdown` does. */
    onLink?: (href: string) => boolean
    words: ReasoningWords
}

/**
 * The model's thinking, folded behind one line that counts its words. While it is still being
 * written it is open, its line shimmers as it says Thinking, and the text grows; once the answer
 * begins it folds away, and a press opens it again.
 */
export function Reasoning({ text, thinking, math = true, images, linkSchemes, onLink, words }: ReasoningProps) {
    const [open, setOpen] = useState(false)
    return (
        <Trace data-slot="assistant-reasoning">
            <TraceCollapsible open={thinking || open} onOpenChange={(next) => setOpen(next)}>
                <TraceCollapsibleTrigger>
                    <TraceLine status={thinking ? 'running' : undefined}>
                        <TraceIcon>
                            <Brain />
                        </TraceIcon>
                        <TraceTitle>{thinking ? words.thinking : words.thoughtFor(wordCount(text))}</TraceTitle>
                    </TraceLine>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent>
                    <Markdown
                        content={text}
                        streaming={thinking}
                        math={math}
                        images={images}
                        linkSchemes={linkSchemes}
                        onLink={onLink}
                        className="text-muted-foreground"
                        words={words.markdown}
                    />
                </TraceCollapsibleContent>
            </TraceCollapsible>
        </Trace>
    )
}
