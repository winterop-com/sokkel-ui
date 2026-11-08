import { Check } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'

import { DialogShell } from './DialogShell'
import { Input } from './ui/input'

export interface TypedConfirmWords {
    /** The line above the input, with the code to type drawn in the code face. */
    prompt: (code: ReactNode) => ReactNode
    /** Why the verb is shut until the code is typed. */
    why: string
    cancel: string
}

const WORDS: TypedConfirmWords = {
    prompt: (code) => <>Type {code} to confirm.</>,
    why: 'Type the code to confirm.',
    cancel: 'Cancel',
}

export interface TypedConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    question: ReactNode
    detail?: ReactNode
    /** What has to be typed: the item's code. */
    code: string
    confirm: { label: string; onConfirm: () => void; busy?: boolean; busyLabel?: string }
    children?: ReactNode
    words?: Partial<TypedConfirmWords>
}

/**
 * A confirm for what cannot be undone: the verb stays shut until the item's code is typed out
 * exactly. What goes with it, such as a `ConsequenceList`, is the body above the input. The
 * typed text is cleared each time the dialog opens.
 */
export function TypedConfirmDialog({
    open,
    onOpenChange,
    question,
    detail,
    code,
    confirm,
    children,
    words: given,
}: TypedConfirmDialogProps) {
    const words = { ...WORDS, ...given }
    const id = useId()
    const [typed, setTyped] = useState('')
    useEffect(() => {
        if (open) setTyped('')
    }, [open])
    const matches = typed === code
    return (
        <DialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={question}
            description={detail}
            confirm={{ ...confirm, destructive: true, why: matches ? undefined : words.why }}
            words={{ cancel: words.cancel }}
        >
            {children}
            <div className="flex flex-col gap-1.5">
                <label htmlFor={id} className="text-sm">
                    {words.prompt(<span className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs select-all">{code}</span>)}
                </label>
                <div className="relative">
                    <Input
                        id={id}
                        value={typed}
                        onChange={(event) => setTyped(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && matches && confirm.busy !== true) confirm.onConfirm()
                        }}
                        disabled={confirm.busy === true}
                        placeholder={code}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        className="pr-9 font-mono"
                    />
                    {matches && <Check className="absolute inset-y-0 right-2.5 my-auto size-4 text-good-ink" aria-hidden />}
                </div>
            </div>
        </DialogShell>
    )
}
