import type { LinkRender } from '@winterop-com/sokkel-ui/Link'

/**
 * A client router's link for the stories, with no router behind it: a plain press calls `go` with
 * the link's address in place of loading it, while a press with a modifier, a middle click or a
 * handler that already took the press leave the anchor to the browser, as a router's link does.
 */
export function routerLink(go: (href: string) => void): LinkRender {
    return function RouterLink({ onClick, ...props }) {
        return (
            <a
                {...props}
                onClick={(event) => {
                    onClick?.(event)
                    if (event.defaultPrevented || event.button !== 0) return
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                    event.preventDefault()
                    go(props.href)
                }}
            />
        )
    }
}
