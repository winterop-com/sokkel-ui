/**
 * Where focus goes when a popup closes: back to its trigger after a keyboard close, so the
 * keyboard keeps its place, and nowhere after a pointer close, so a clicked trigger draws no
 * focus ring.
 */
export function returnFocusOnKeyboard(closeType: string): boolean {
    return closeType === 'keyboard' || closeType === ''
}
