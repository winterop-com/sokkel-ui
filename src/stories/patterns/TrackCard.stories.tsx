import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Columns, Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { TrackCard, type TrackAffiliation } from '@winterop-com/sokkel-ui/TrackCard'
import { TrackGlyph } from '@winterop-com/sokkel-ui/TrackGlyph'
import { TRACK_AFFILIATIONS, TRACK_KINDS } from '@winterop-com/sokkel-ui/lib/tracks'
import { WATCH_NOW, WATCH_TRACKS, motionOf } from '../fixtures/watch'

const meta: Meta = { title: 'Patterns/Track card', parameters: { frame: 'padded' } }
export default meta

const track = (id: string) => {
    const found = WATCH_TRACKS.find((each) => each.id === id)
    if (found === undefined) throw new Error(id)
    return found
}

/** One contact: its glyph turned to its heading in the hostile color, its name and id, live, its affiliation and how it moves. */
export const Card: StoryObj = {
    render: () => {
        const contact = track('contact-14')
        return (
            <TrackCard
                className="max-w-sm"
                name={contact.name}
                code={contact.id}
                kind={contact.kind}
                affiliation={contact.affiliation}
                heading={contact.heading}
                states={contact.states}
                detail={motionOf(contact.speed, contact.heading)}
                updatedAt={WATCH_NOW - contact.lag}
                now={WATCH_NOW}
            />
        )
    },
}

/** Every kind's glyph in every affiliation's color, as the map draws them. */
export const Glyphs: StoryObj = {
    render: () => (
        <Stack gap="md">
            {TRACK_AFFILIATIONS.map((affiliation) => (
                <Row key={affiliation} gap="lg">
                    {TRACK_KINDS.map((kind) => (
                        <TrackGlyph
                            key={kind}
                            kind={kind}
                            affiliation={affiliation}
                            size="lg"
                            heading={kind === 'aircraft' ? 45 : undefined}
                            label
                        />
                    ))}
                </Row>
            ))}
        </Stack>
    ),
}

/** Cards of a few tracks: a sensor with a picture, a ferry gone quiet (stale), a contact lost for minutes, and a simulated aircraft. */
export const Several: StoryObj = {
    render: () => (
        <Columns count={2} min="sm" gap="sm" className="max-w-3xl">
            {['radar-harbor', 'ferry-juniper', 'contact-9', 'survey-1'].map((id) => {
                const each = track(id)
                return (
                    <TrackCard
                        key={id}
                        name={each.name}
                        code={each.id}
                        kind={each.kind}
                        affiliation={each.affiliation}
                        heading={each.heading}
                        thumbnail={each.thumbnail}
                        states={each.states}
                        detail={motionOf(each.speed, each.heading)}
                        updatedAt={WATCH_NOW - each.lag}
                        now={WATCH_NOW}
                    />
                )
            })}
        </Columns>
    ),
}

/** A pending track whose affiliation chip is a menu: choosing one judges it, and the glyph and chip follow. Pressing the card picks it. */
export const Judge: StoryObj = {
    name: 'Change affiliation',
    render: function Render() {
        const pending = track('new-33')
        const [affiliation, setAffiliation] = useState<TrackAffiliation>(pending.affiliation)
        const [selected, setSelected] = useState(false)
        return (
            <TrackCard
                className="max-w-sm"
                name={pending.name}
                code={pending.id}
                kind={pending.kind}
                affiliation={affiliation}
                heading={pending.heading}
                detail={motionOf(pending.speed, pending.heading)}
                updatedAt={WATCH_NOW - pending.lag}
                now={WATCH_NOW}
                onAffiliationChange={setAffiliation}
                selected={selected}
                onSelect={() => setSelected((was) => !was)}
            />
        )
    },
}
