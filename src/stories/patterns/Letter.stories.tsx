import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { useState } from 'react'

import { AttachmentList } from '@winterop-com/sokkel-ui/AttachmentList'
import { Letter } from '@winterop-com/sokkel-ui/Letter'
import { Markdown } from '@winterop-com/sokkel-ui/Markdown'
import { pictureOf } from '../fixtures/portraits'

/**
 * One letter in a thread of mail: the sender's picture, name and address, the time with a
 * paperclip when files came along, the recipients while open or the first words while folded, and
 * the body under it. The head folds and unfolds the letter.
 */
const meta: Meta = { title: 'Patterns/Letter', parameters: { frame: 'padded' } }
export default meta

const GRACE = { name: 'grace', address: 'grace@example.org', image: pictureOf('grace') }
const LINUS = { name: 'linus', address: 'linus@example.org', image: pictureOf('linus') }

const PLAN = `The plan for Saturday:

1. **06:00** stop the scheduler and run \`sync-inventory\` once by hand
2. **08:00** switch the api to \`harbor.example.org\`
3. **09:00** start the scheduler again

I have attached the checklist and the cutover plan.`

const FILES = [
    { id: 'checklist', name: 'harbor-launch-checklist.pdf', detail: 'PDF, 240 KB', icon: <FileText aria-hidden /> },
    { id: 'plan', name: 'cutover-plan.csv', detail: 'CSV, 12 KB', icon: <FileSpreadsheet aria-hidden /> },
]

/** A letter folded: the sender, the time and its first words on one line; a press opens it. */
export const Folded: StoryObj = {
    render: () => (
        <Letter from={LINUS} time="Yesterday, 17:05" snippet="The cutover window looks right to me, but the scheduler needs to stop first.">
            <p className="text-sm">The cutover window looks right to me, but the scheduler needs to stop first.</p>
        </Letter>
    ),
}

/** A letter open: the address beside the name, the recipients under it, the body and its files. */
export const Open: StoryObj = {
    render: () => (
        <Letter from={GRACE} to={['me', 'linus', 'margaret']} time="Today, 09:42" attached defaultOpen>
            <Markdown content={PLAN} />
            <AttachmentList files={FILES} />
        </Letter>
    ),
}

/**
 * A thread of three: the first two fold and unfold from their heads, held by the thread, and the
 * latest stays open with a head that is no button.
 */
export const Thread: StoryObj = {
    render: function Render() {
        const [open, setOpen] = useState<string[]>(['second'])
        const fold = (id: string) => (next: boolean) => setOpen((now) => (next ? [...now, id] : now.filter((each) => each !== id)))
        return (
            <section aria-label="Thread">
                <Letter
                    from={LINUS}
                    to={['grace', 'me']}
                    time="Yesterday, 17:05"
                    snippet="Saturday works. The scheduler has to stop before sync-inventory runs."
                    open={open.includes('first')}
                    onOpenChange={fold('first')}
                >
                    <p className="text-sm">Saturday works. The scheduler has to stop before sync-inventory runs.</p>
                </Letter>
                <Letter
                    from={GRACE}
                    to={['linus', 'me']}
                    time="Today, 08:10"
                    snippet="Agreed. I will write the plan up this morning."
                    open={open.includes('second')}
                    onOpenChange={fold('second')}
                >
                    <p className="text-sm">Agreed. I will write the plan up this morning.</p>
                </Letter>
                <Letter from={GRACE} to={['me', 'linus', 'margaret']} time="Today, 09:42" attached foldable={false}>
                    <Markdown content={PLAN} />
                    <AttachmentList files={FILES} />
                </Letter>
            </section>
        )
    },
}
