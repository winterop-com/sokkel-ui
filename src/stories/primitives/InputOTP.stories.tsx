import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ReactNode } from 'react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@winterop-com/sokkel-ui/primitives/input-otp'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

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

const meta: Meta = { title: 'Primitives/Inputs/InputOTP', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen label="six digits, split">
                <Otp maxLength={6} aria-label="Code">
                    <Six />
                </Otp>
            </Specimen>
            <Specimen label="four digits">
                <Otp maxLength={4} aria-label="Code">
                    <InputOTPGroup>
                        {[0, 1, 2, 3].map((index) => (
                            <InputOTPSlot key={index} index={index} />
                        ))}
                    </InputOTPGroup>
                </Otp>
            </Specimen>
            <Specimen label="filled">
                <Otp maxLength={6} initial="482913" aria-label="Code">
                    <Six />
                </Otp>
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen label="disabled">
                <Otp maxLength={6} disabled initial="482" aria-label="Code">
                    <Six />
                </Otp>
            </Specimen>
            <Specimen label="invalid">
                <Otp maxLength={6} initial="000000" aria-label="Code">
                    <Six invalid />
                </Otp>
            </Specimen>
            <Specimen label="empty">
                <Otp maxLength={6} aria-label="Code">
                    <Six />
                </Otp>
            </Specimen>
        </Row>
    ),
}

export const ConfirmDelete: StoryObj = {
    render: () => (
        <Stack gap="lg" className="max-w-sm rounded-lg border border-border p-4">
            <Stack gap="2xs">
                <p className="text-sm font-medium">Confirm with your authenticator</p>
                <p className="text-sm text-muted-foreground">Deleting the service api stops 4 jobs. Enter the six-digit code to go on.</p>
            </Stack>
            <Otp maxLength={6} initial="4829" aria-label="Authenticator code">
                <Six />
            </Otp>
            <Row align="stretch" justify="end" wrap>
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive" disabled>
                    Delete
                </Button>
            </Row>
        </Stack>
    ),
}
