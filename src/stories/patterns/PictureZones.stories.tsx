import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { DetectionOverlay } from '@winterop-com/sokkel-ui/DetectionOverlay'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { VideoPlayer } from '@winterop-com/sokkel-ui/media/VideoPlayer'
import { PictureZones, type PictureZone } from '@winterop-com/sokkel-ui/PictureZones'
import { STREET_DETECTIONS } from '../fixtures/detections'
import street from '../media/fixtures/street.webm?url'

/**
 * The parts of a camera's picture a finder watches, drawn over the video: regions as tinted shapes
 * and tripwires as lines, which a viewer picks, reshapes by their corners, or draws anew.
 */
const meta: Meta = { title: 'Patterns/Picture zones' }
export default meta

const ZONES: PictureZone[] = [
    {
        id: 'road',
        name: 'Road',
        kind: 'region',
        tone: 'warning',
        points: [
            [0, 0.63],
            [1, 0.63],
            [1, 0.85],
            [0, 0.85],
        ],
    },
    {
        id: 'gate',
        name: 'Gate line',
        kind: 'line',
        tone: 'critical',
        points: [
            [0.5, 0.3],
            [0.5, 0.75],
        ],
    },
    {
        id: 'quay',
        name: 'Quay',
        kind: 'region',
        points: [
            [0.68, 0.38],
            [0.9, 0.4],
            [0.92, 0.6],
            [0.7, 0.62],
        ],
    },
]

/** A road, a gate line and a quay over the street, with the finder's boxes, four seconds in. */
export const Zones: StoryObj = {
    render: () => (
        <div className="p-6">
            <VideoPlayer
                src={`${street}#t=4`}
                preload="auto"
                title="Street"
                picture={
                    <>
                        <PictureZones zones={ZONES} />
                        <DetectionOverlay detections={STREET_DETECTIONS} />
                    </>
                }
            />
        </div>
    ),
}

function EditingStory() {
    const [zones, setZones] = useState<PictureZone[]>(ZONES)
    const [selected, setSelected] = useState<string | undefined>('quay')
    const [draw, setDraw] = useState<'region' | 'line' | undefined>()
    return (
        <Stack gap="md" className="p-6">
            <Row gap="sm">
                <Button variant="outline" size="sm" onClick={() => setDraw('region')}>
                    New region
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDraw('line')}>
                    New line
                </Button>
            </Row>
            <VideoPlayer
                src={`${street}#t=4`}
                preload="auto"
                title="Street"
                picture={
                    <PictureZones
                        zones={zones}
                        selected={selected}
                        onSelect={setSelected}
                        onChange={setZones}
                        draw={draw}
                        onDrawn={(points) => {
                            const id = `zone-${String(zones.length + 1)}`
                            setZones([...zones, { id, name: `Zone ${String(zones.length + 1)}`, kind: draw ?? 'region', points }])
                            setSelected(id)
                            setDraw(undefined)
                        }}
                        onDrawCancel={() => setDraw(undefined)}
                    />
                }
            />
        </Stack>
    )
}

/**
 * The quay picked, its corners handles: drag one, or focus it and move it with the arrow keys
 * (Shift for larger steps). Press a zone to pick it. New region and New line start drawing: press
 * to add points, then Enter or a double press to finish, Escape to give up.
 */
export const Editing: StoryObj = { render: () => <EditingStory /> }
