import type { Meta, StoryObj } from '@storybook/react-vite'
import { Radio } from 'lucide-react'
import { useState } from 'react'

import { SignIn, type SignInValues } from '@winterop-com/sokkel-ui/SignIn'
import { FlowLines, LevelBars } from '@winterop-com/sokkel-ui/SignInArt'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { TidevannMark } from '../fixtures/TidevannMark'

/** A sign-in screen: the brand pane with its art, mark and facts beside the form. */
const meta: Meta = { title: 'Patterns/Sign in' }
export default meta

const FACTS = [
    { label: 'instance', value: 'tidevann.example.org' },
    { label: 'version', value: '1.4.2' },
]

const BRAND = {
    mark: <TidevannMark />,
    name: 'Tidevann',
    facts: FACTS,
    eyebrow: 'Welcome to Tidevann',
    description: 'Enter your credentials to continue.',
}

/**
 * A username and a password over the flow lines, the seam between the panes draggable. Sending
 * the password "tide" signs in; any other is refused.
 */
export const Password: StoryObj = {
    render: function Render() {
        const [error, setError] = useState<string | undefined>()
        const submit = (values: SignInValues) =>
            setError(values.password === 'tide' ? undefined : 'That username and password do not match.')
        return <SignIn {...BRAND} art={<FlowLines />} resizable remember error={error} onSubmit={submit} />
    },
}

/** One field for an access token, with the server's address above it, over the level bars. */
export const Token: StoryObj = {
    render: () => (
        <SignIn
            {...BRAND}
            art={<LevelBars />}
            method="token"
            server
            defaultValues={{ server: 'https://tidevann.example.org' }}
            description="Paste a token from your settings on another device."
            onSubmit={() => undefined}
        />
    ),
}

/** Another way in under the rule, full width. */
export const Alternatives: StoryObj = {
    render: () => (
        <SignIn
            {...BRAND}
            art={<LevelBars seed={12} />}
            description="Looking for a server."
            alternatives={
                <Button variant="outline">
                    <Radio data-icon="inline-start" aria-hidden />
                    Watch the harbor board without signing in
                </Button>
            }
            onSubmit={() => undefined}
        />
    ),
}

/** The last try refused, the reason over the submit. */
export const Refused: StoryObj = {
    render: () => (
        <SignIn
            {...BRAND}
            art={<FlowLines />}
            defaultValues={{ user: 'ada' }}
            error="That username and password do not match."
            onSubmit={() => undefined}
        />
    ),
}

/** A try under way: the fields held and the submit saying so. */
export const Busy: StoryObj = {
    render: () => (
        <SignIn {...BRAND} art={<FlowLines />} busy defaultValues={{ user: 'ada', password: 'tidewater' }} onSubmit={() => undefined} />
    ),
}

/** The brand pane in the page's scheme rather than dark, a third of the width, with no art. */
export const PageScheme: StoryObj = {
    name: 'Page scheme',
    render: () => <SignIn {...BRAND} brandScheme="page" brandWidth="36%" onSubmit={() => undefined} />,
}

/**
 * In a desktop window with its title bar hidden: the brand pane drags the window, outlined here,
 * and the window's buttons sit over its corner, clear of the mark; on a narrow window the bar
 * over the form leaves them room at its start.
 */
export const Desktop: StoryObj = {
    parameters: { desktopWindow: true },
    render: () => <SignIn {...BRAND} art={<FlowLines />} desktop={{ trafficLights: true }} onSubmit={() => undefined} />,
}
