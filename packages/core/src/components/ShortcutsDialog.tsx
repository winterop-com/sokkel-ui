import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Kbd, KbdGroup } from './ui/kbd'

/** One shortcut: what it does and the keys, in the order they are pressed. */
export interface Shortcut {
    id: string
    action: string
    keys: readonly string[]
}

/** Shortcuts under a heading: Navigation, Editing. */
export interface ShortcutGroup {
    title: string
    shortcuts: readonly Shortcut[]
}

export { applePlatform } from '../lib/keys'
export { useShortcutsKey } from '../hooks/use-shortcuts-key'

/**
 * Every keyboard shortcut, grouped, each with its keys drawn as keys. The dialog an app opens on
 * `?` and from its account menu.
 */
export function ShortcutsDialog({
    open,
    onOpenChange,
    groups,
    words = { title: 'Keyboard shortcuts' },
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    groups: readonly ShortcutGroup[]
    words?: { title: string }
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{words.title}</DialogTitle>
                </DialogHeader>
                <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto">
                    {groups.map((group) => (
                        <section key={group.title} className="flex flex-col gap-1.5">
                            <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>
                            <dl className="flex flex-col gap-1.5">
                                {group.shortcuts.map((shortcut) => (
                                    <div key={shortcut.id} className="flex items-center justify-between gap-4">
                                        <dt className="text-sm">{shortcut.action}</dt>
                                        <dd>
                                            <KbdGroup>
                                                {shortcut.keys.map((key) => (
                                                    <Kbd key={key}>{key}</Kbd>
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
