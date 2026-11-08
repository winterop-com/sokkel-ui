import * as React from 'react'
import { cn } from '../../lib/cn'
import { TABLE_HEAD_TEXT } from '../../lib/table'

export type TableProps = React.ComponentProps<'table'>

function Table({ className, ...props }: TableProps) {
    return (
        <div data-slot="table-container" className="relative w-full overflow-x-auto">
            <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
        </div>
    )
}

export type TableHeaderProps = React.ComponentProps<'thead'>

function TableHeader({ className, ...props }: TableHeaderProps) {
    return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

export type TableBodyProps = React.ComponentProps<'tbody'>

function TableBody({ className, ...props }: TableBodyProps) {
    return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export type TableFooterProps = React.ComponentProps<'tfoot'>

function TableFooter({ className, ...props }: TableFooterProps) {
    return (
        <tfoot data-slot="table-footer" className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)} {...props} />
    )
}

export type TableRowProps = React.ComponentProps<'tr'>

function TableRow({ className, ...props }: TableRowProps) {
    return (
        <tr
            data-slot="table-row"
            className={cn('border-b transition-colors hover:bg-hover has-aria-expanded:bg-hover data-[state=selected]:bg-muted', className)}
            {...props}
        />
    )
}

export type TableHeadProps = React.ComponentProps<'th'>

function TableHead({ className, ...props }: TableHeadProps) {
    return (
        <th
            data-slot="table-head"
            className={cn('h-10 px-2 text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', TABLE_HEAD_TEXT, className)}
            {...props}
        />
    )
}

export type TableCellProps = React.ComponentProps<'td'>

function TableCell({ className, ...props }: TableCellProps) {
    return (
        <td
            data-slot="table-cell"
            className={cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', className)}
            {...props}
        />
    )
}

export type TableCaptionProps = React.ComponentProps<'caption'>

function TableCaption({ className, ...props }: TableCaptionProps) {
    return <caption data-slot="table-caption" className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
