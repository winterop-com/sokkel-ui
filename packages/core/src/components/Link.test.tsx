import { House } from 'lucide-react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ApiLink } from './ApiLink'
import { ChannelList } from './ChannelList'
import { ItemCard } from './ItemCard'
import { Link, LinkProvider, isInternalLink, type LinkRender, type RoutedLinkProps } from './Link'
import { NavBar } from './NavBar'
import { PageHeader } from './PageHeader'
import { ProfileRow } from './ProfileRow'
import { Rail } from './Rail'
import { Stat } from './Stat'
import { StatPanel } from './dashboard/StatPanel'
import { TableOfContents } from './TableOfContents'
import { TextLink } from './TextLink'
import { TopBar } from './TopBar'
import { BreadcrumbLink } from './ui/breadcrumb'
import { PaginationLink } from './ui/pagination'

const routed: LinkRender = (props) => <a data-routed="" {...props} />

const drawn = (node: ReactNode, render: LinkRender = routed) => renderToStaticMarkup(<LinkProvider render={render}>{node}</LinkProvider>)

describe('isInternalLink', () => {
    it('takes paths, queries and fragments as internal', () => {
        for (const href of ['/jobs/nightly-export', 'jobs', './runs', '../runs', '?state=failed', '#/runs', '#runs', ''])
            expect(isInternalLink({ href }), href).toBe(true)
    })

    it('takes a new tab, a download and another origin as external', () => {
        expect(isInternalLink({ href: '/runs', target: '_blank' })).toBe(false)
        expect(isInternalLink({ href: '/runs', target: '_self' })).toBe(true)
        expect(isInternalLink({ href: '/export.csv', download: true })).toBe(false)
        expect(isInternalLink({ href: '/export.csv', download: 'runs.csv' })).toBe(false)
        for (const href of ['https://api.example.org/jobs', '//api.example.org/jobs', 'mailto:ada@example.org', 'tel:+4712345678'])
            expect(isInternalLink({ href }), href).toBe(false)
    })
})

describe('Link', () => {
    it('is a plain anchor with no provider', () => {
        expect(renderToStaticMarkup(<Link href="/runs">Runs</Link>)).toBe('<a href="/runs">Runs</a>')
    })

    it("draws an internal link through the provider's render, with every prop it was given", () => {
        let seen: RoutedLinkProps | undefined
        const html = drawn(
            <Link href="/runs" className="face" aria-current="page" onClick={() => undefined}>
                Runs
            </Link>,
            (props) => {
                seen = props
                return routed(props)
            },
        )
        expect(html).toBe('<a data-routed="" href="/runs" class="face" aria-current="page">Runs</a>')
        expect(seen?.onClick).toBeTypeOf('function')
    })

    it('leaves an external link a plain anchor', () => {
        expect(drawn(<Link href="https://example.org">Out</Link>)).toBe('<a href="https://example.org">Out</a>')
        expect(drawn(<Link href="/runs" target="_blank" rel="noreferrer" />)).not.toContain('data-routed')
        expect(drawn(<Link href="/runs.csv" download />)).not.toContain('data-routed')
        expect(drawn(<Link>No address</Link>)).toBe('<a>No address</a>')
    })

    it("takes the provider's own test of which links are internal", () => {
        const all = (node: ReactNode) =>
            renderToStaticMarkup(
                <LinkProvider render={routed} internal={() => true}>
                    {node}
                </LinkProvider>,
            )
        expect(all(<Link href="https://example.org" target="_blank" />)).toContain('data-routed')
    })

    it('lets an inner provider replace the outer one', () => {
        const inner: LinkRender = (props) => <a data-inner="" {...props} />
        const html = drawn(
            <LinkProvider render={inner}>
                <Link href="/runs" />
            </LinkProvider>,
        )
        expect(html).toContain('data-inner')
        expect(html).not.toContain('data-routed')
    })
})

describe('the components drawing links', () => {
    const count = (html: string) => html.split('data-routed').length - 1

    it('draw their internal links through the provider', () => {
        expect(count(drawn(<TextLink href="/people/ada">ada</TextLink>))).toBe(1)
        expect(count(drawn(<Stat label="Failed" value="3" href="/runs/failed" />))).toBe(1)
        expect(count(drawn(<StatPanel title="Failed" value={3} href="/runs/failed" />))).toBe(1)
        expect(count(drawn(<ItemCard code="nightly-export" href="/jobs/nightly-export" />))).toBe(1)
        expect(count(drawn(<ProfileRow name="ada" href="/people/ada" />))).toBe(1)
        expect(count(drawn(<PageHeader title="nightly-export" trail={[{ label: 'Jobs', href: '/jobs' }]} />))).toBe(1)
        expect(count(drawn(<TopBar trail={[{ label: 'harbor', href: '/harbor' }, { label: 'Runs' }]} />))).toBe(1)
        expect(count(drawn(<BreadcrumbLink href="/jobs">Jobs</BreadcrumbLink>))).toBe(1)
        expect(count(drawn(<PaginationLink href="/runs?page=2">2</PaginationLink>))).toBe(1)
        expect(
            count(
                drawn(
                    <NavBar
                        mark={null}
                        name="Tidevann"
                        links={[
                            { id: 'runs', label: 'Runs', href: '/runs', active: true },
                            { id: 'jobs', label: 'Jobs', href: '/jobs' },
                        ]}
                    />,
                ),
            ),
        ).toBe(2)
        expect(
            count(
                drawn(
                    <ChannelList
                        sections={[
                            {
                                id: 'channels',
                                title: 'Channels',
                                entries: [{ id: 'general', label: 'general', kind: 'channel', href: '/c/general' }],
                            },
                        ]}
                    />,
                ),
            ),
        ).toBe(1)
    })

    it("draws the rail's places and its mark through the provider", () => {
        const html = drawn(
            <Rail
                name="Tidevann"
                markHref="/"
                groups={[{ id: 'main', entries: [{ id: 'home', label: 'Home', icon: House, href: '/home', active: true }] }]}
            />,
        )
        expect(count(html)).toBe(2)
    })

    it('leave links opening a new tab plain', () => {
        expect(
            drawn(
                <TextLink href="https://example.org" external>
                    out
                </TextLink>,
            ),
        ).not.toContain('data-routed')
        expect(drawn(<ApiLink path="/api/jobs" href="/api/jobs" />)).not.toContain('data-routed')
        expect(drawn(<ApiLink path="/api/jobs" open />)).not.toContain('data-routed')
    })

    it("keep a contents list's jumps in the page, outside the router", () => {
        expect(drawn(<TableOfContents entries={[{ id: 'steps', label: 'Steps', level: 2 }]} />)).not.toContain('data-routed')
    })
})
