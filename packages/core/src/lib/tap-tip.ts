import { TIP_HOLD } from './durations'

/**
 * What a tooltip with `tap` does when a press ends on its trigger, apart from the tooltip so it is
 * tested without a browser; `show` opens or closes the tooltip. A press by touch or pen shows it and
 * holds it `hold` ms; a tap on the trigger again closes it, and so does the next press anywhere else
 * (Base UI's own outside press, after which the tooltip calls `stop`). While a tap holds it, a hover
 * ending, which a pen's lift and a finger's compatibility events report, does not close it. A mouse
 * press does nothing here: hover and keyboard focus show the tooltip as they always have.
 */
export function tapTip(show: (open: boolean) => void, hold: number = TIP_HOLD) {
    let tapped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
        clearTimeout(timer)
        tapped = false
    }
    const close = () => {
        stop()
        show(false)
    }
    return {
        /** A press ended on the trigger, by the pointer `pointerType`, while the tooltip is `open` or not. */
        press(pointerType: string, open: boolean) {
            if (pointerType !== 'touch' && pointerType !== 'pen') return
            if (tapped && open) return close()
            stop()
            tapped = true
            timer = setTimeout(close, hold)
            show(true)
        },
        /** Whether a change Base UI asks for goes ahead: never a hover's close while a tap holds the tooltip. */
        allows: (open: boolean, reason: string) => open || !tapped || reason !== 'trigger-hover',
        /** The tooltip closed another way, or goes away: no tap holds it now. */
        stop,
    }
}
