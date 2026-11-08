import { useMemo } from 'react'

import { useRegisteredShortcuts } from '../hooks/use-shortcuts'
import { shortcutGroups, type ShortcutGroup } from '../lib/shortcuts'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Kbd, KbdGroup } from './ui/kbd'

export type { Shortcut, ShortcutGroup } from '../lib/shortcuts'
export { applePlatform } from '../lib/keys'

/** The words the shortcuts dialog says. */
export interface ShortcutsDialogWords {
    title: string
    /** The heading over bound keys that name no group. */
    general: string
}

const WORDS: ShortcutsDialogWords = {
    title: 'Keyboard shortcuts',
    general: 'General',
}

const NONE: readonly ShortcutGroup[] = []

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
                                    <div key={shortcut.id} className="flex items-center justify-between gap-4">
                                        <dt className="text-sm">{shortcut.action}</dt>
                                        <dd>
                                            <KbdGroup>
                                                {shortcut.keys.map((key, index) => (
                                                    <Kbd key={`${index}-${key}`}>{key}</Kbd>
                                                ))}
                                            </KbdGroup>
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
