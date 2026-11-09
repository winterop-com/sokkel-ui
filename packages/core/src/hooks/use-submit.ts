import { useEffect, useRef, useState } from 'react'

import type { ServerIssue } from '../components/schema/SchemaForm'

export interface SubmitOptions {
    /**
     * Says whether the form may go, showing what stops it: `useSchemaForm`'s `submit`. A press it
     * refuses sends nothing.
     */
    check?: () => boolean
    /**
     * Something the send must wait for, such as files still going up or the schema checker still
     * loading: a press while it is true is held, and goes once it is false. A function is read at
     * each press and render, for a form made after the submit, as `() => form.checking`.
     */
    waiting?: boolean | (() => boolean)
    /** Sends the form; answers what the server refused, at the fields it concerns, or nothing. */
    send: () => Promise<readonly ServerIssue[] | void>
}

/** Where a submit stands. */
export interface Submit {
    /** Asks to send: checks, waits for what it must, then sends, once at a time. */
    submit: () => void
    /** Held until what it waits for is done. */
    held: boolean
    /** Being sent. */
    sending: boolean
    /** Held or being sent: the verb's button shows a spinner and takes no second press. */
    busy: boolean
    /** What the server refused on the last send, to pass to `useSchemaForm` as `issues`. */
    issues: readonly ServerIssue[]
    /** Why the last send failed outright, such as the network; nothing once a send gets through. */
    error: unknown
    /** Whether the last send was taken. */
    done: boolean
}

const NONE: readonly ServerIssue[] = []

/**
 * A form's submit from the press to the server's answer: `waiting` holds it until uploads and
 * checks are done, `check` then shows what stops it and refuses the press, a second press while it is held
 * or sent is ignored, and what the server refuses comes back as `issues`, at their fields.
 */
export function useSubmit({ check, waiting = false, send }: SubmitOptions): Submit {
    const [held, setHeld] = useState(false)
    const [sending, setSending] = useState(false)
    const [issues, setIssues] = useState<readonly ServerIssue[]>(NONE)
    const [error, setError] = useState<unknown>(undefined)
    const [done, setDone] = useState(false)
    const inFlight = useRef(false)
    const latest = useRef({ check, send, waiting })
    latest.current = { check, send, waiting }

    const go = () => {
        if (inFlight.current) return
        const { check: allowed, send: post, waiting: wait } = latest.current
        // Held first: what is waited for may be the check itself, and the check runs once it is done.
        if (typeof wait === 'function' ? wait() : wait) {
            setHeld(true)
            return
        }
        if (allowed !== undefined && !allowed()) {
            setHeld(false)
            return
        }
        inFlight.current = true
        setHeld(false)
        setSending(true)
        setError(undefined)
        post()
            .then(
                (refused) => {
                    const said = refused ?? NONE
                    setIssues(said)
                    setDone(said.length === 0)
                },
                (failure: unknown) => {
                    setError(failure)
                    setDone(false)
                },
            )
            .finally(() => {
                inFlight.current = false
                setSending(false)
            })
    }

    // A held press goes as soon as nothing is waited for.
    useEffect(() => {
        if (held && !(typeof waiting === 'function' ? waiting() : waiting)) go()
    })

    return { submit: go, held, sending, busy: held || sending, issues, error, done }
}
