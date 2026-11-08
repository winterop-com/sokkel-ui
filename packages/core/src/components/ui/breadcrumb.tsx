import * as React from 'react'
import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cn } from '../../lib/cn'
import { ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'

export type BreadcrumbProps = React.ComponentProps<'nav'>

function Breadcrumb({ className, ...props }: BreadcrumbProps) {
    return <nav aria-label="breadcrumb" data-slot="breadcrumb" className={cn(className)} {...props} />
}

export type BreadcrumbListProps = React.ComponentProps<'ol'>

function BreadcrumbList({ className, ...props }: BreadcrumbListProps) {
    return (
        <ol
            data-slot="breadcrumb-list"
            className={cn('flex flex-wrap items-center gap-1.5 text-sm wrap-break-word text-muted-foreground', className)}
            {...props}
        />
    )
}

export type BreadcrumbItemProps = React.ComponentProps<'li'>

function BreadcrumbItem({ className, ...props }: BreadcrumbItemProps) {
    return <li data-slot="breadcrumb-item" className={cn('inline-flex items-center gap-1', className)} {...props} />
}

export type BreadcrumbLinkProps = useRender.ComponentProps<'a'>

function BreadcrumbLink({ className, render, ...props }: BreadcrumbLinkProps) {
    return useRender({
        defaultTagName: 'a',
        props: mergeProps<'a'>(
            {
                className: cn('transition-colors hover:text-foreground', className),
            },
            props,
        ),
        render,
        state: {
            slot: 'breadcrumb-link',
        },
    })
}

export type BreadcrumbPageProps = React.ComponentProps<'span'>

function BreadcrumbPage({ className, ...props }: BreadcrumbPageProps) {
    return (
        <span
            data-slot="breadcrumb-page"
            role="link"
            aria-disabled="true"
            aria-current="page"
            className={cn('font-normal text-foreground', className)}
            {...props}
        />
    )
}

export type BreadcrumbSeparatorProps = React.ComponentProps<'li'>

function BreadcrumbSeparator({ children, className, ...props }: BreadcrumbSeparatorProps) {
    return (
        <li
            data-slot="breadcrumb-separator"
            role="presentation"
            aria-hidden="true"
            className={cn('[&>svg]:size-3.5', className)}
            {...props}
        >
            {children ?? <ChevronRightIcon />}
        </li>
    )
}

export type BreadcrumbEllipsisProps = React.ComponentProps<'span'>

function BreadcrumbEllipsis({ className, ...props }: BreadcrumbEllipsisProps) {
    return (
        <span
            data-slot="breadcrumb-ellipsis"
            role="presentation"
            aria-hidden="true"
            className={cn('flex size-5 items-center justify-center [&>svg]:size-4', className)}
            {...props}
        >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
        </span>
    )
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis }
