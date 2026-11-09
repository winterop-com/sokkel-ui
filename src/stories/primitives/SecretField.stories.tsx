import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { SecretField } from '@winterop-com/sokkel-ui/SecretField'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'

/**
 * A secret a form sets but never reads back, such as a connection's token. With one already set
 * it says so, masked, and when, and stays as it is unless Replace is pressed; the value is the new
 * secret, or undefined while the one set is left alone.
 */
const meta: Meta = { title: 'Primitives/Inputs/Secret field', parameters: { frame: 'column' } }
export default meta

const NOW = new Date('2026-11-09T10:00:00Z')
const SET_AT = '2026-11-06T08:30:00Z'

function Token({ sealed = false, replacing = false }: { sealed?: boolean; replacing?: boolean }) {
    const [token, setToken] = useState<string | undefined>(undefined)
    return (
        <TooltipProvider>
            <Stack gap="lg" className="max-w-sm">
                <SecretField
                    id={`token-${String(sealed)}-${String(replacing)}`}
                    label="API token"
                    hint="sync-inventory"
                    required
                    help={
                        token === undefined
                            ? sealed
                                ? 'Saving leaves the token as it is.'
                                : 'The token sync-inventory signs in to the api with.'
                            : 'Saving replaces the token.'
                    }
                    value={token}
                    onChange={setToken}
                    sealed={sealed}
                    setAt={sealed ? SET_AT : undefined}
                    now={NOW}
                    defaultReplacing={replacing}
                />
            </Stack>
        </TooltipProvider>
    )
}

/** No token set yet: a masked input with Show. */
export const NotSet: StoryObj = { name: 'Not set', render: () => <Token /> }

/** A token set three days ago, sealed: it is never read back, and Replace opens an input for a new one. */
export const Sealed: StoryObj = { name: 'Set', render: () => <Token sealed /> }

/** The set token being replaced: an empty input for the new one, and Cancel (or Escape) to seal it again. */
export const Replacing: StoryObj = { render: () => <Token sealed replacing /> }
