import type { ILinkHandler } from '@xterm/xterm'

/**
 * Whether the box a terminal fills is laid out, so its size in cells can be measured: not hidden
 * with `display: none`, inside a hidden parent, or squeezed to no width, where a fit would read a
 * few columns and report them.
 */
export function hasBox(element: Pick<Element, 'getClientRects' | 'clientWidth'>): boolean {
    return element.getClientRects().length > 0 && element.clientWidth > 0
}

/**
 * xterm's handler for the links a program marks itself (OSC 8), opening them as the links found in
 * the text open: through `open`. Without it xterm asks with its own English `confirm()`. xterm
 * passes it only http and https links.
 */
export function linkHandler(open: (uri: string, event: MouseEvent) => void): ILinkHandler {
    return {
        activate: (event, text) => open(text, event),
    }
}
