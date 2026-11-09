'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

import { Button } from './button'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useCopy } from '../../hooks/use-copy'

/** The words of a code block's copy button: its name, and its name for a moment after a press. */
export interface CodeBlockWords {
    copy: string
    copied: string
}

const COPY_WORDS: CodeBlockWords = { copy: 'Copy', copied: 'Copied' }

// The editor's ground is laid as an image over the variant's own ground, so it washes it rather than replacing it.
const codeBlockVariants = cva(
    'group/code-block relative flex w-full min-w-0 flex-col overflow-hidden rounded-surface bg-[image:linear-gradient(var(--editor-ground),var(--editor-ground))] text-sm has-[>[data-slot=code-block-content]:focus-visible]:ring-1 has-[>[data-slot=code-block-content]:focus-visible]:ring-ring data-[size=sm]:text-xs',
    {
        variants: {
            variant: {
                default:
                    'border border-input text-foreground has-[>[data-slot=code-block-content]:focus-visible]:border-ring dark:bg-input/30',
                destructive: 'border border-destructive/30 text-destructive dark:border-destructive/40',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)

export type CodeBlockProps = React.ComponentProps<'div'> & VariantProps<typeof codeBlockVariants> & { size?: 'default' | 'sm' }

function CodeBlock({ className, variant = 'default', size = 'default', ...props }: CodeBlockProps) {
    return (
        <div
            data-slot="code-block"
            data-variant={variant}
            data-size={size}
            className={cn(codeBlockVariants({ variant }), className)}
            {...props}
        />
    )
}

export type CodeBlockHeaderProps = React.ComponentProps<'div'>

function CodeBlockHeader({ className, ...props }: CodeBlockHeaderProps) {
    return (
        <div
            data-slot="code-block-header"
            className={cn(
                'flex min-w-0 shrink-0 items-center gap-2 px-3 pt-3 text-muted-foreground group-data-[size=sm]/code-block:px-2.5 group-data-[size=sm]/code-block:pt-2.5 group-data-[variant=destructive]/code-block:text-destructive *:has-[>[data-slot=code-block-title]]:min-w-0',
                className,
            )}
            {...props}
        />
    )
}

export type CodeBlockTitleProps = React.ComponentProps<'div'>

function CodeBlockTitle({ className, ...props }: CodeBlockTitleProps) {
    return (
        <div
            data-slot="code-block-title"
            className={cn(
                "min-w-0 truncate font-sans text-sm font-medium text-foreground group-data-[size=sm]/code-block:text-xs group-data-[variant=destructive]/code-block:text-destructive [&_svg]:pointer-events-none [&_svg]:inline-block [&_svg]:align-middle [&_svg:not([class*='size-'])]:size-3.5 *:[svg]:me-1.5",
                className,
            )}
            {...props}
        />
    )
}

export type CodeBlockActionsProps = React.ComponentProps<'div'>

function CodeBlockActions({ className, ...props }: CodeBlockActionsProps) {
    return (
        <div
            data-slot="code-block-actions"
            className={cn(
                '-my-1 ms-auto -me-1.5 flex shrink-0 items-center gap-1 [[data-slot=code-block]>&]:absolute [[data-slot=code-block]>&]:end-2 [[data-slot=code-block]>&]:top-2 [[data-slot=code-block]>&]:z-10 [[data-slot=code-block]>&]:m-0 [[data-slot=code-block]>&]:opacity-0 [[data-slot=code-block]>&]:transition-opacity [[data-slot=code-block]>&]:group-focus-within/code-block:opacity-100 [[data-slot=code-block]>&]:group-hover/code-block:opacity-100 group-data-[size=sm]/code-block:[[data-slot=code-block]>&]:end-1.5 group-data-[size=sm]/code-block:[[data-slot=code-block]>&]:top-1.5 [[data-slot=code-block]>&]:pointer-coarse:opacity-100 [[data-slot=code-block]>&]:*:[button]:bg-background [[data-slot=code-block]>&]:*:[button]:ring-1 [[data-slot=code-block]>&]:*:[button]:ring-foreground/10',
                className,
            )}
            {...props}
        />
    )
}

export type CodeBlockCopyButtonProps = React.ComponentProps<typeof Button> & { value: string; words?: Partial<CodeBlockWords> }

function CodeBlockCopyButton({
    value,
    variant = 'ghost',
    size = 'icon-xs',
    className,
    onClick,
    words: given,
    ...props
}: CodeBlockCopyButtonProps) {
    const words = { ...COPY_WORDS, ...given }
    const { copied, copy } = useCopy()

    return (
        <>
            <Button
                data-slot="code-block-copy-button"
                data-copied={copied || undefined}
                variant={variant}
                size={size}
                aria-label={copied ? words.copied : words.copy}
                className={cn(className)}
                onClick={(event) => {
                    onClick?.(event)
                    copy(value)
                }}
                {...props}
            >
                {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
            <span aria-live="polite" className="sr-only">
                {copied ? words.copied : ''}
            </span>
        </>
    )
}

export type CodeBlockContentProps = React.ComponentProps<'pre'> & {
    wrap?: boolean
    lineNumbers?: boolean
    startLine?: number
}

function CodeBlockContent({
    className,
    children,
    style,
    wrap = false,
    lineNumbers = false,
    startLine = 1,
    ...props
}: CodeBlockContentProps) {
    return (
        <pre
            data-slot="code-block-content"
            data-wrap={wrap || undefined}
            data-numbered={lineNumbers || undefined}
            dir="ltr"
            tabIndex={0}
            style={{ counterReset: `line ${startLine - 1}`, ...style }}
            className={cn(
                'min-h-0 min-w-0 scroll-fade-x scrollbar-thin overflow-auto px-3 py-3 text-start font-mono leading-relaxed outline-none group-has-data-[slot=code-block-footer]/code-block:pb-2 group-has-data-[slot=code-block-header]/code-block:pt-2 group-data-[size=sm]/code-block:px-2.5 group-data-[size=sm]/code-block:py-2.5 group-data-[size=sm]/code-block:group-has-data-[slot=code-block-header]/code-block:pt-1.5 data-wrap:scroll-fade-y data-wrap:wrap-anywhere data-wrap:whitespace-pre-wrap',
                className,
            )}
            {...props}
        >
            <code
                data-slot="code-block-code"
                className="grid min-h-lh min-w-max grid-cols-[minmax(0,1fr)] content-start in-data-numbered:grid-cols-[auto_minmax(0,1fr)] in-data-wrap:min-w-0"
            >
                {lineNumbers && typeof children === 'string'
                    ? children
                          .replace(/\n$/, '')
                          .split('\n')
                          .map((line, index) => <CodeBlockLine key={index}>{line}</CodeBlockLine>)
                    : children}
            </code>
        </pre>
    )
}

// A numbered line's number stands on the gutter's wash, drawn as shadows out to the block's edge and into the gap after it,
// so the wash never moves the number; the block's scrolling clips what reaches past its edge.
const codeBlockLineVariants = cva(
    "relative -mx-3 block min-h-lh px-3 group-data-[size=sm]/code-block:-mx-2.5 group-data-[size=sm]/code-block:px-2.5 before:min-w-6 before:text-end before:text-muted-foreground after:absolute after:start-1 after:top-0 after:text-muted-foreground after:select-none in-data-numbered:col-span-2 in-data-numbered:grid in-data-numbered:grid-cols-subgrid in-data-numbered:gap-x-3 in-data-numbered:[counter-increment:line] in-data-numbered:before:bg-editor-gutter in-data-numbered:before:shadow-[-0.75rem_0_0_var(--editor-gutter),0.375rem_0_0_var(--editor-gutter)] in-data-numbered:before:content-[counter(line)] in-data-numbered:before:select-none in-data-numbered:supports-[content:counter(line)_/_'']:before:content-[counter(line)_/_'']",
    {
        variants: {
            variant: {
                default: '',
                added: "bg-muted after:content-['+']",
                removed: "bg-destructive/10 after:text-destructive after:content-['−']",
                highlighted: 'bg-muted',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)

export type CodeBlockLineProps = React.ComponentProps<'span'> & VariantProps<typeof codeBlockLineVariants>

function CodeBlockLine({ className, variant = 'default', children, ...props }: CodeBlockLineProps) {
    // An empty line holds a newline so copying a selection keeps blank lines.
    const empty = children === undefined || children === null || children === '' || (Array.isArray(children) && children.length === 0)

    return (
        <span data-slot="code-block-line" data-variant={variant} className={cn(codeBlockLineVariants({ variant }), className)} {...props}>
            <span data-slot="code-block-line-content" className="min-w-0">
                {empty ? '\n' : children}
            </span>
        </span>
    )
}

export type CodeBlockFooterProps = React.ComponentProps<'div'>

function CodeBlockFooter({ className, ...props }: CodeBlockFooterProps) {
    return (
        <div
            data-slot="code-block-footer"
            className={cn(
                'flex min-w-0 shrink-0 items-center gap-2 px-3 pb-3 text-muted-foreground group-data-[size=sm]/code-block:px-2.5 group-data-[size=sm]/code-block:pb-2.5',
                className,
            )}
            {...props}
        />
    )
}

export {
    CodeBlock,
    CodeBlockHeader,
    CodeBlockTitle,
    CodeBlockActions,
    CodeBlockCopyButton,
    CodeBlockContent,
    CodeBlockLine,
    CodeBlockFooter,
}
