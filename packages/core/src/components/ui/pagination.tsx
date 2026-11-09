import * as React from 'react'
import { cn } from '../../lib/cn'

import { Link } from '../Link'
import { Button } from './button'
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'

export type PaginationProps = React.ComponentProps<'nav'>

function Pagination({ className, ...props }: PaginationProps) {
    return (
        <nav
            role="navigation"
            aria-label="pagination"
            data-slot="pagination"
            className={cn('mx-auto flex w-full justify-center', className)}
            {...props}
        />
    )
}

export type PaginationContentProps = React.ComponentProps<'ul'>

function PaginationContent({ className, ...props }: PaginationContentProps) {
    return <ul data-slot="pagination-content" className={cn('flex items-center gap-0.5', className)} {...props} />
}

export type PaginationItemProps = React.ComponentProps<'li'>

function PaginationItem({ ...props }: PaginationItemProps) {
    return <li data-slot="pagination-item" {...props} />
}

export type PaginationLinkProps = {
    isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
    React.ComponentProps<'a'>

function PaginationLink({ className, isActive, size = 'icon', ...props }: PaginationLinkProps) {
    return (
        <Button
            variant={isActive ? 'outline' : 'ghost'}
            size={size}
            className={cn(className)}
            nativeButton={false}
            render={<Link aria-current={isActive ? 'page' : undefined} data-slot="pagination-link" data-active={isActive} {...props} />}
        />
    )
}

export type PaginationPreviousProps = React.ComponentProps<typeof PaginationLink> & { text?: string }

function PaginationPrevious({ className, text = 'Previous', ...props }: PaginationPreviousProps) {
    return (
        <PaginationLink aria-label="Go to previous page" size="default" className={cn('pl-1.5!', className)} {...props}>
            <ChevronLeftIcon data-icon="inline-start" />
            <span className="hidden sm:block">{text}</span>
        </PaginationLink>
    )
}

export type PaginationNextProps = React.ComponentProps<typeof PaginationLink> & { text?: string }

function PaginationNext({ className, text = 'Next', ...props }: PaginationNextProps) {
    return (
        <PaginationLink aria-label="Go to next page" size="default" className={cn('pr-1.5!', className)} {...props}>
            <span className="hidden sm:block">{text}</span>
            <ChevronRightIcon data-icon="inline-end" />
        </PaginationLink>
    )
}

export type PaginationEllipsisProps = React.ComponentProps<'span'>

function PaginationEllipsis({ className, ...props }: PaginationEllipsisProps) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn("flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4", className)}
            {...props}
        >
            <MoreHorizontalIcon />
            <span className="sr-only">More pages</span>
        </span>
    )
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious }
