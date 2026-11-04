import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { Button } from '../../components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '../../components/ui/input-otp'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

function Six({ invalid }: { invalid?: boolean }) {
    return (
        <>
            <InputOTPGroup>
                {[0, 1, 2].map((index) => (
                    <InputOTPSlot key={index} index={index} aria-invalid={invalid} />
                ))}
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
                {[3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} aria-invalid={invalid} />
                ))}
            </InputOTPGroup>
        </>
    )
}

function Otp({
    initial = '',
    children,
    ...props
}: {
    initial?: string
    maxLength: number
    disabled?: boolean
    'aria-label': string
    children: ReactNode
}) {
    const [value, setValue] = useState(initial)
    return (
        <InputOTP value={value} onChange={setValue} {...props}>
            {children}
        </InputOTP>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/InputOTP' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="six digits, split">
                    <Otp maxLength={6} aria-label="Code">
                        <Six />
                    </Otp>
                </Labeled>
                <Labeled label="four digits">
                    <Otp maxLength={4} aria-label="Code">
                        <InputOTPGroup>
                            {[0, 1, 2, 3].map((index) => (
                                <InputOTPSlot key={index} index={index} />
                            ))}
                        </InputOTPGroup>
                    </Otp>
                </Labeled>
                <Labeled label="filled">
                    <Otp maxLength={6} initial="482913" aria-label="Code">
                        <Six />
                    </Otp>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="disabled">
                    <Otp maxLength={6} disabled initial="482" aria-label="Code">
                        <Six />
                    </Otp>
                </Labeled>
                <Labeled label="invalid">
                    <Otp maxLength={6} initial="000000" aria-label="Code">
                        <Six invalid />
                    </Otp>
                </Labeled>
                <Labeled label="empty">
                    <Otp maxLength={6} aria-label="Code">
                        <Six />
                    </Otp>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const ConfirmDelete: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-sm flex-col gap-4 rounded-lg border border-border p-4">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">Confirm with your authenticator</p>
                    <p className="text-sm text-muted-foreground">
                        Deleting the service api stops 4 jobs. Enter the six-digit code to go on.
                    </p>
                </div>
                <Otp maxLength={6} initial="4829" aria-label="Authenticator code">
                    <Six />
                </Otp>
                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button variant="destructive" disabled>
                        Delete
                    </Button>
                </div>
            </div>
        </Ground>
    ),
}
