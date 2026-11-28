import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { DetectionGallery, type Sighting } from '@winterop-com/sokkel-ui/DetectionGallery'
import { STREET_DETECTIONS } from '../fixtures/detections'
import frame2 from '../media/fixtures/street-2.jpg?url'
import frame4 from '../media/fixtures/street-4.jpg?url'
import frame6 from '../media/fixtures/street-6.jpg?url'
import frame9 from '../media/fixtures/street-9.jpg?url'
import street from '../media/fixtures/street.webm?url'

/**
 * Each time something was seen, as a tile cropped from its frame around what was found, with how
 * sure the finder was, what it is, where and when; a press takes the player there.
 */
const meta: Meta = { title: 'Patterns/Detection gallery' }
export default meta

const FRAMES: Record<number, string> = { 2: frame2, 4: frame4, 6: frame6, 9: frame9 }
const PLACES = ['Harbor gate', 'Juniper yard']

/** Every detection on the street at four moments, from two cameras, each cropped from that moment's frame. */
const SIGHTINGS: Sighting[] = [2, 4, 6, 9].flatMap((t, index) =>
    STREET_DETECTIONS.flatMap((detection) => {
        const sample = detection.samples.find((one) => one.t === t)
        if (sample === undefined) return []
        return [
            {
                id: `${detection.id}@${String(t)}`,
                label: detection.label,
                affiliation: detection.affiliation,
                place: PLACES[index % 2],
                when: `14:02:0${String(t)}`,
                image: FRAMES[t],
                box: sample,
                confidence: sample.confidence,
                preview: `${street}#t=${String(Math.max(0, t - 1))},${String(t + 1)}`,
                alert: detection.affiliation === 'unknown',
            },
        ]
    }),
)

/** The street's sightings, the unknown walker's ringed as alerts. Rest the pointer on one to play a moment of it. */
export const Gallery: StoryObj = { render: () => <DetectionGallery sightings={SIGHTINGS} className="p-6" /> }

function PickedStory() {
    const [selected, setSelected] = useState<string | undefined>('p-23@4')
    return <DetectionGallery sightings={SIGHTINGS} selected={selected} onSelect={setSelected} className="p-6" />
}

/** Each tile a button, one picked: a press picks another, as a player beside it would seek to it. */
export const Picked: StoryObj = { render: () => <PickedStory /> }
