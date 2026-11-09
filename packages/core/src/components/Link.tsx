import { createContext, useCallback, useContext, useMemo, type AnchorHTMLAttributes, type ReactNode, type Ref } from 'react'

/** What a link is drawn from: an anchor's own attributes, its ref among them. */
export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    ref?: Ref<HTMLAnchorElement>
}

/** A link to draw through the app's router, its `href` always given. */
export type RoutedLinkProps = LinkProps & { href: string }

/**
 * Draws a link as the app's router draws one. It spreads every prop it is given onto the anchor it
 * draws, `ref`, `className` and `onClick` among them, so the link stays a real link and the
 * library's own handlers still run.
 */
export type LinkRender = (props: RoutedLinkProps) => ReactNode

export interface LinkProviderProps {
    /** Draws every internal link inside, such as `(props) => <RouterLink to={props.href} {...props} />`. */
    render: LinkRender
    /** Which links go through `render`; the others are plain anchors. By default `isInternalLink`. */
    internal?: (props: RoutedLinkProps) => boolean
    children: ReactNode
}

interface LinkSettings {
    render: LinkRender
    internal: (props: RoutedLinkProps) => boolean
}

const LinkContext = createContext<LinkSettings | null>(null)

const SCHEME = /^[a-z][a-z\d+.-]*:/i

function sameOrigin(href: string): boolean {
    if (typeof window === 'undefined') return false
    try {
        return new URL(href, window.location.href).origin === window.location.origin
    } catch {
        return false
    }
}

/**
 * Whether a link stays inside the app, for its router to follow: it opens in the same tab (no
 * `target` other than `_self`), downloads nothing (no `download`), and its address is a path, a
 * query or a fragment, or a full address on the page's own origin. A link to another origin, a
 * `mailto:` or `tel:` one, a new tab or a download is external.
 */
export function isInternalLink({ href, target, download }: Pick<RoutedLinkProps, 'href' | 'target' | 'download'>): boolean {
    if (target !== undefined && target !== '' && target !== '_self') return false
    if (download !== undefined && download !== false) return false
    if (href.startsWith('//') || SCHEME.test(href)) return sameOrigin(href)
    return true
}

/**
 * Sets how every link the library draws inside it is drawn, once at the app's root: an app with a
 * client router passes `render` drawing its router's link, so a press on a place, a crumb, a card
 * or a link in text moves without a reload, while each stays a real anchor that a middle click,
 * Cmd-click or "Copy link address" treat as one.
 *
 * Only internal links go through `render` (`isInternalLink`): a link opening a new tab, a
 * download, or an address on another origin stays a plain anchor. `internal` replaces that test,
 * so an app's renderer can take external links too. A provider inside another replaces it for the
 * part of the page it wraps. With no provider, every link is a plain anchor.
 */
export function LinkProvider({ render, internal = isInternalLink, children }: LinkProviderProps) {
    const settings = useMemo(() => ({ render, internal }), [render, internal])
    return <LinkContext.Provider value={settings}>{children}</LinkContext.Provider>
}

/**
 * The function drawing a link as the nearest `LinkProvider` says: through its `render` when the
 * link is internal, as a plain anchor otherwise or with no provider. For a part that hands out a
 * render function, where `Link` itself does not fit.
 */
export function useLink(): (props: LinkProps) => ReactNode {
    const settings = useContext(LinkContext)
    return useCallback(
        (props: LinkProps) => {
            const { href } = props
            if (settings === null || href === undefined) return <a {...props} />
            const routed = { ...props, href }
            return settings.internal(routed) ? settings.render(routed) : <a {...props} />
        },
        [settings],
    )
}

/**
 * An anchor drawn as the app's `LinkProvider` says: its router's link for an internal address, a
 * plain anchor otherwise. Every link the library draws is one; it takes an anchor's attributes.
 */
export function Link(props: LinkProps) {
    return useLink()(props)
}
