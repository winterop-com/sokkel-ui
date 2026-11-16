import { Component, type ErrorInfo, type ReactNode } from 'react'

import { PageState, type PageStateHeadingLevel } from './PageState'

/** What a caught failure says. */
export interface ErrorBoundaryWords {
    /** The heading over the failure. */
    heading: string
    /** The button that draws the content again. */
    retry: string
}

/** A caught failure's own words in English. */
export const ERROR_BOUNDARY_WORDS: ErrorBoundaryWords = {
    heading: 'This page could not be drawn',
    retry: 'Try again',
}

export interface ErrorBoundaryProps {
    children: ReactNode
    /** A value whose change lets a caught failure go and draws the content again, such as the route shown. */
    resetKey?: unknown
    /** Hears each failure caught, with where in the tree it was thrown, for an app's own error reporting. */
    onError?: (error: Error, info: ErrorInfo) => void
    /** What the failure's heading is: `h1` (the default) where it stands in for the page, as in `Shell`. */
    headingLevel?: PageStateHeadingLevel
    /** Sets the failure in a page's own padding, as `Page` does, for a boundary around a whole page. */
    inset?: boolean
    words?: Partial<ErrorBoundaryWords>
}

interface ErrorBoundaryState {
    error: Error | null
    resetKey: unknown
}

/**
 * Catches a failure thrown while drawing its content, such as an address it cannot read or a value
 * of the wrong shape, and draws it as a failed page (`PageState`) in the content's place, with its
 * message and Try again, so the rest of the app stays. The failure goes when `resetKey` changes and
 * when the address changes (the browser's back, a link, a hash route), so leaving the page is the way
 * back. `Shell` wraps its page in one.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey }

    static getDerivedStateFromError(thrown: unknown): Partial<ErrorBoundaryState> {
        return { error: thrown instanceof Error ? thrown : new Error(String(thrown)) }
    }

    static getDerivedStateFromProps(props: ErrorBoundaryProps, state: ErrorBoundaryState): Partial<ErrorBoundaryState> | null {
        if (Object.is(props.resetKey, state.resetKey)) return null
        return { error: null, resetKey: props.resetKey }
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        this.props.onError?.(error, info)
    }

    componentDidMount(): void {
        window.addEventListener('popstate', this.reset)
        window.addEventListener('hashchange', this.reset)
    }

    componentWillUnmount(): void {
        window.removeEventListener('popstate', this.reset)
        window.removeEventListener('hashchange', this.reset)
    }

    reset = (): void => {
        if (this.state.error !== null) this.setState({ error: null })
    }

    render(): ReactNode {
        const { error } = this.state
        if (error === null) return this.props.children
        const words = { ...ERROR_BOUNDARY_WORDS, ...this.props.words }
        const failure = (
            <PageState
                loading={false}
                error={error.message === '' ? error.name : error.message}
                onRetry={this.reset}
                headingLevel={this.props.headingLevel ?? 'h1'}
                words={{ refused: words.heading, retry: words.retry }}
            >
                {null}
            </PageState>
        )
        if (this.props.inset !== true) return failure
        return <div className="flex flex-col px-(--density-page-inset) pt-(--density-page-top) pb-10">{failure}</div>
    }
}
