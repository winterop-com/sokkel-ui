import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { cn } from '../lib/cn'
import { buttonVariants } from './ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader } from './ui/empty'

/** What a not-found page says. */
export interface NotFoundWords {
    title: string
    /** The line under the title, given the address that leads nowhere. */
    detail: (address: string) => string
    /** The link back to the app's first page. */
    home: string
}

export const NOT_FOUND_WORDS: NotFoundWords = {
    title: 'Nothing at this address',
    detail: (address) => `There is no page at ${address}.`,
    home: 'Go home',
}

/** Where a catalog holds a not-found page's words, and the arguments its phrases name. */
export const NOT_FOUND_PART: WordsPart<NotFoundWords> = { id: 'notFound', words: NOT_FOUND_WORDS, args: { detail: 'address' } }

/** A not-found page's phrases as ICU messages in English, for the catalog. */
export const NOT_FOUND_MESSAGES: WordMessages<NotFoundWords> = { detail: 'There is no page at {address}.' }

export interface NotFoundProps {
    /** The address that leads nowhere, as the reader sees it; the location's hash (`#/jobs/gone`) by default. */
    address?: string
    /** Where the way back goes: the app's first page, `#/` by default. */
    homeHref?: string
    words?: Partial<NotFoundWords>
    className?: string
}

/**
 * The page an app draws for an address none of its pages answers, in place of drawing its first
 * page as if nothing were wrong: what the address was, and a link to the first page. Its title is
 * the page's `h1`, so `Shell`'s `routeKey` moves the focus to it.
 */
export function NotFound({ address, homeHref = '#/', words: given, className }: NotFoundProps) {
    const words = useWords(NOT_FOUND_PART, given)
    const shown = address ?? (typeof window === 'undefined' ? '' : window.location.hash)
    return (
        <Empty data-slot="not-found" className={className}>
            <EmptyHeader>
                <h1 className="text-sm font-medium tracking-tight">{words.title}</h1>
                <EmptyDescription>{words.detail(shown)}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <a href={homeHref} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                    {words.home}
                </a>
            </EmptyContent>
        </Empty>
    )
}
