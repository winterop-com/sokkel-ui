import { useMemo } from 'react'

import { useRegisteredShortcuts } from '../hooks/use-shortcuts'
import { shortcutGroups, type ShortcutGroup } from '../lib/shortcut-groups'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Kbd, KbdGroup } from './ui/kbd'

export type { Shortcut, ShortcutGroup } from '../lib/shortcut-groups'
export { applePlatform } from '../lib/keys'

/** The words the shortcuts dialog says. */
export interface ShortcutsDialogWords {
    title: string
    /** The heading over bound keys that name no group. */
    general: string
    /** Between the two keys of a sequence, as G then D. */
    /** The word between the keys of a sequence; "then" when absent. */
    sequence?: string
}

const WORDS: ShortcutsDialogWords = {
    title: 'Keyboard shortcuts',
    general: 'General',
    sequence: 'then',
}

const NONE: readonly ShortcutGroup[] = []

/** The keys of one press, held together. */
function Keys({ keys }: { keys: readonly string[] }) {
    return (
        <KbdGroup>
            {keys.map((key, index) => (
                <Kbd key={`${index}-${key}`}>{key}</Kbd>
            ))}
        </KbdGroup>
    )
}

export interface ShortcutsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Shortcuts the app answers itself, listed after the bound ones. */
    groups?: readonly ShortcutGroup[]
    words?: Partial<ShortcutsDialogWords>
}

/**
 * Every keyboard shortcut, grouped, each with its keys drawn as keys: the keys bound with
 * `useShortcuts` (in the nearest `Shell`, or the page's) that have a label, written as this device
 * writes them, then the `groups` given for keys the app answers itself. Groups of one title are one.
 * A shortcut is known by its id and keys together: one of the app's on the same id as a bound one
 * but other keys is listed beside it, and one on the same id and keys is listed once, in the app's words.
 * A sequence is drawn as its first keys, the word `sequence` (then), and its second keys.
 * `Shell` holds one, opened on `?` and from the account menu, when given `shortcuts`.
 */
export function ShortcutsDialog({ open, onOpenChange, groups = NONE, words: given }: ShortcutsDialogProps) {
    const words = { ...WORDS, ...given }
    const registered = useRegisteredShortcuts()
    const shown = useMemo(() => shortcutGroups(registered, groups, words.general), [registered, groups, words.general])
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{words.title}</DialogTitle>
                </DialogHeader>
                <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto">
                    {shown.map((group) => (
                        <section key={group.title} className="flex flex-col gap-1.5">
                            <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>
                            <dl className="flex flex-col gap-1.5">
                                {group.shortcuts.map((shortcut) => (
                                    <div
                                        key={`${shortcut.id} ${shortcut.keys.join(' ')} ${(shortcut.next ?? []).join(' ')}`}
                                        className="flex items-center justify-between gap-4"
                                    >
                                        <dt className="text-sm">{shortcut.action}</dt>
                                        <dd className="flex shrink-0 items-center gap-1.5">
                                            <Keys keys={shortcut.keys} />
                                            {shortcut.next !== undefined && (
                                                <>
                                                    <span className="text-xs text-muted-foreground">{words.sequence}</span>
                                                    <Keys keys={shortcut.next} />
                                                </>
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
