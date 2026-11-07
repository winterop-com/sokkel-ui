import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { AddressInput, type Address } from '@winterop-com/sokkel-ui/AddressInput'
import { Stack } from '@winterop-com/sokkel-ui/Layout'

/** A field of recipients as chips: empty, filled, with an address that is not one, and bare in a form. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <Stack gap="lg" className="mx-auto w-full max-w-lg">
            {children}
        </Stack>
    )
}

function Live({ start, label, bare = false }: { start: Address[]; label?: string; bare?: boolean }) {
    const [value, setValue] = useState(start)
    return (
        <AddressInput value={value} onChange={setValue} label={label} bare={bare} className={bare ? 'border-b border-border' : undefined} />
    )
}

const meta: Meta = { title: 'Patterns/Address input', parameters: { frame: 'padded' } }
export default meta

/** No recipients yet. */
export const Empty: StoryObj = {
    render: () => (
        <Ground>
            <Live start={[]} />
        </Ground>
    ),
}

/** Named and bare addresses, and one marked because it has no dotted host. */
export const Filled: StoryObj = {
    render: () => (
        <Ground>
            <Live
                label="To"
                start={[
                    { address: 'grace@example.org', name: 'Grace' },
                    { address: 'linus@example.org' },
                    { address: 'margaret@example', name: 'Margaret' },
                ]}
            />
        </Ground>
    ),
}

/** Bare rows divided by rules, as the head of a message being written. */
export const Bare: StoryObj = {
    render: () => (
        <Ground>
            <Stack gap="none">
                <Live bare label="To" start={[{ address: 'ada@example.org', name: 'Ada' }]} />
                <Live bare label="Cc" start={[]} />
            </Stack>
        </Ground>
    ),
}
