import examples from 'virtual:examples'

import { useScheme } from '@winterop-com/sokkel-ui/hooks/use-scheme'
import { ItemCard } from '@winterop-com/sokkel-ui/ItemCard'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { NavBar } from '@winterop-com/sokkel-ui/NavBar'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { SchemeToggle } from '@winterop-com/sokkel-ui/SchemeToggle'

/** The library's mark, the stepped plinth, in the current text color. */
function SokkelMark() {
    return (
        <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className="size-5">
            <path d="M10 6h12v4H10z" fillOpacity="0.3" />
            <path d="M6 14h20v4H6z" fillOpacity="0.6" />
            <path d="M2 22h28v4H2z" />
        </svg>
    )
}

/**
 * The examples' index, published beside Storybook: a card for each example with its still in the
 * scheme the page wears, what it is and the packages it installs, the whole card opening it.
 */
export function ExamplesIndex() {
    const { resolved } = useScheme()
    return (
        <TooltipProvider>
            <Stack gap="none" className="min-h-svh bg-background text-foreground">
                <NavBar
                    mark={<SokkelMark />}
                    name="sokkel-ui"
                    links={[
                        { id: 'storybook', label: 'Storybook', href: '../' },
                        { id: 'examples', label: 'Examples', href: './', active: true },
                    ]}
                    end={<SchemeToggle />}
                />
                <main>
                    <Stack gap="xl" className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
                        <PageHeader
                            title="Examples"
                            count={examples.length}
                            description="Tidevann's apps, each built on the sokkel-ui packages as any app is. Each opens on a page of its own, with demo data kept in this browser."
                        />
                        <Columns count={3} min="lg">
                            {examples.map((example) => (
                                <ItemCard
                                    key={example.id}
                                    title={example.name}
                                    description={example.summary}
                                    href={`./${example.id}/`}
                                    media={
                                        example.stills === undefined ? undefined : (
                                            <img
                                                src={resolved === 'dark' ? example.stills.dark : example.stills.light}
                                                alt=""
                                                loading="lazy"
                                                className="object-cover object-top"
                                            />
                                        )
                                    }
                                    facts={[{ label: 'Packages', value: example.packages.join(', ') }]}
                                />
                            ))}
                        </Columns>
                    </Stack>
                </main>
            </Stack>
        </TooltipProvider>
    )
}
