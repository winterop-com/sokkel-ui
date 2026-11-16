import type { Meta, StoryObj } from '@storybook/react-vite'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'

import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@winterop-com/sokkel-ui/primitives/pagination'
import { Surface } from '@winterop-com/sokkel-ui/Section'

const meta: Meta = { title: 'Primitives/Navigation/Pagination', parameters: { frame: 'column' } }
export default meta

function Caption({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-muted-foreground">{children}</p>
}

/** Every page link with the current one marked and an ellipsis, and Previous and Next alone with words of its own. */
export const Variants: StoryObj = {
    render: () => (
        <>
            <Stack gap="sm">
                <Caption>full, page 2 active</Caption>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#">1</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#" isActive>
                                2
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#">3</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#">12</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext href="#" />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </Stack>
            <Stack gap="sm">
                <Caption>previous and next only, custom text</Caption>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" text="Newer" />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext href="#" text="Older" />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </Stack>
        </>
    ),
}

/** The first page, with Previous shut, and a single page. */
export const States: StoryObj = {
    render: () => (
        <>
            <Stack gap="sm">
                <Caption>first page: previous disabled</Caption>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious aria-disabled="true" className="pointer-events-none opacity-50" />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#" isActive>
                                1
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#">2</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext href="#" />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </Stack>
            <Stack gap="sm">
                <Caption>a single page</Caption>
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationLink href="#" isActive>
                                1
                            </PaginationLink>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </Stack>
        </>
    ),
}

/** Paging through a job's runs. */
export const RunHistory: StoryObj = {
    render: () => (
        <Surface>
            <Row gap="md" justify="between" wrap className="px-3 py-2">
                <p className="text-sm text-muted-foreground tabular-nums">
                    Runs 51 to 75 of 288 for <span className="font-mono text-foreground">nightly-export</span>
                </p>
                <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#">2</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#" isActive>
                                3
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink href="#">4</PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext href="#" />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </Row>
        </Surface>
    ),
}
