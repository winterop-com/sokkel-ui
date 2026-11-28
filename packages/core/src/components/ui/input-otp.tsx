import * as React from 'react'
import { cn } from '../../lib/cn'
import { HOLDS_INVALID_EDGE } from '../../lib/issue-edge'
import { OTPInput, OTPInputContext } from 'input-otp'
import { MinusIcon } from 'lucide-react'

export type InputOTPProps = React.ComponentProps<typeof OTPInput> & {
    containerClassName?: string
}

function InputOTP({ className, containerClassName, ...props }: InputOTPProps) {
    return (
        <OTPInput
            data-slot="input-otp"
            containerClassName={cn('cn-input-otp flex items-center has-disabled:opacity-disabled', containerClassName)}
            spellCheck={false}
            className={cn('disabled:cursor-not-allowed', className)}
            {...props}
        />
    )
}

export type InputOTPGroupProps = React.ComponentProps<'div'>

function InputOTPGroup({ className, ...props }: InputOTPGroupProps) {
    return <div data-slot="input-otp-group" className={cn('flex items-center rounded-control', HOLDS_INVALID_EDGE, className)} {...props} />
}

export type InputOTPSlotProps = React.ComponentProps<'div'> & {
    index: number
}

function InputOTPSlot({ index, className, ...props }: InputOTPSlotProps) {
    const inputOTPContext = React.useContext(OTPInputContext)
    const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {}

    return (
        <div
            data-slot="input-otp-slot"
            data-active={isActive}
            className={cn(
                'relative flex size-(--density-control) items-center justify-center border-y border-r border-input text-sm transition-all outline-none first:rounded-l-control first:border-l last:rounded-r-control aria-invalid:border-critical/80 data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-critical data-[active=true]:aria-invalid:ring-invalid-ring dark:bg-input/30',
                className,
            )}
            {...props}
        >
            {char}
            {hasFakeCaret && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
                </div>
            )}
        </div>
    )
}

export type InputOTPSeparatorProps = React.ComponentProps<'div'>

function InputOTPSeparator({ ...props }: InputOTPSeparatorProps) {
    return (
        <div data-slot="input-otp-separator" className="flex items-center [&_svg:not([class*='size-'])]:size-4" role="separator" {...props}>
            <MinusIcon />
        </div>
    )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
