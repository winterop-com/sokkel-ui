import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { SignIn, type SignInValues } from '@winterop-com/sokkel-ui/SignIn'
import { TidevannMark } from '../fixtures/TidevannMark'

/** A sign-in screen: the app's brand beside a form of one or two fields. */
const meta: Meta = { title: 'Patterns/Sign in' }
export default meta

const LINE = 'Runs, schedules and the jobs behind them, for harbor, juniper and larkspur.'

/** A user name and a password. Sending with the password "tide" signs in; any other is refused. */
export const Password: StoryObj = {
    render: function Render() {
        const [error, setError] = useState<string | undefined>()
        const submit = (values: SignInValues) =>
            setError(values.password === 'tide' ? undefined : 'That user name and password do not match.')
        return <SignIn mark={<TidevannMark />} name="Tidevann" line={LINE} error={error} onSubmit={submit} />
    },
}

/** One field for an access token, as a tool signed in by a token from the settings wants. */
export const Token: StoryObj = {
    render: () => <SignIn mark={<TidevannMark />} name="Tidevann" line={LINE} method="token" onSubmit={() => undefined} />,
}

/** A field for the server's address over the user and password, for an app that talks to more than one. */
export const Server: StoryObj = {
    render: () => (
        <SignIn
            mark={<TidevannMark />}
            name="Tidevann"
            line={LINE}
            server
            defaultValues={{ server: 'https://tidevann.example.org' }}
            onSubmit={() => undefined}
            footer="Ask margaret for an account on a new server."
        />
    ),
}

/** The last try refused, with the reason over the fields. */
export const Refused: StoryObj = {
    render: () => (
        <SignIn
            mark={<TidevannMark />}
            name="Tidevann"
            line={LINE}
            defaultValues={{ user: 'ada' }}
            error="That user name and password do not match."
            onSubmit={() => undefined}
        />
    ),
}

/** A try under way: the fields held and the submit saying so. */
export const Busy: StoryObj = {
    render: () => (
        <SignIn
            mark={<TidevannMark />}
            name="Tidevann"
            line={LINE}
            busy
            defaultValues={{ user: 'ada', password: 'tidewater' }}
            onSubmit={() => undefined}
        />
    ),
}
