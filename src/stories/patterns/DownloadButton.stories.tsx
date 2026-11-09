import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

import { DownloadButton, type DownloadState } from '@winterop-com/sokkel-ui/DownloadButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

/** A button that downloads something for keeping: idle, n of m or a share with a cancel and a pause, paused, and kept. */
const meta: Meta = { title: 'Patterns/Download button', parameters: { frame: 'column' } }
export default meta

/** The states, held by the story. */
export const States: StoryObj = {
    render: () => (
        <Row gap="lg" align="start" wrap>
            <Specimen label="idle">
                <DownloadButton state="idle" />
            </Specimen>
            <Specimen label="running">
                <DownloadButton state="running" count={4} total={12} onCancel={() => undefined} />
            </Specimen>
            <Specimen label="running, a share">
                <DownloadButton state="running" value={0.62} onCancel={() => undefined} />
            </Specimen>
            <Specimen label="running, pausable">
                <DownloadButton state="running" value={0.62} onPause={() => undefined} onCancel={() => undefined} />
            </Specimen>
            <Specimen label="paused">
                <DownloadButton state="paused" value={0.62} onResume={() => undefined} onCancel={() => undefined} />
            </Specimen>
            <Specimen label="kept">
                <DownloadButton state="kept" />
            </Specimen>
        </Row>
    ),
}

/** The sizes, in each state. */
export const Sizes: StoryObj = {
    render: () => (
        <Row gap="lg" align="end" wrap>
            {(['sm', 'default', 'lg'] as const).map((size) => (
                <Specimen key={size} label={size}>
                    <Row gap="sm" wrap>
                        <DownloadButton size={size} state="idle" />
                        <DownloadButton size={size} state="running" count={7} total={12} onCancel={() => undefined} />
                        <DownloadButton size={size} state="kept" />
                    </Row>
                </Specimen>
            ))}
        </Row>
    ),
}

/** A kept copy that can be removed: what is kept on hover, armed after a first press, and a failed try with its reason; compact draws the icon alone. */
export const Removing: StoryObj = {
    render: () => (
        <Row gap="lg" align="start" wrap>
            <Specimen label="kept, removable">
                <DownloadButton state="kept" keptDetail="On this device, 48.2 MB" onRemove={() => undefined} />
            </Specimen>
            <Specimen label="armed">
                <DownloadButton state="kept" onRemove={() => undefined} defaultArmed />
            </Specimen>
            <Specimen label="failed">
                <DownloadButton state="idle" error="The server stopped answering." />
            </Specimen>
            <Specimen label="compact">
                <Row gap="sm">
                    <DownloadButton state="idle" compact />
                    <DownloadButton state="kept" compact onRemove={() => undefined} />
                </Row>
            </Specimen>
        </Row>
    ),
}

/** Press to download an album's twelve tracks, one every half second; cancel while it runs, and it is kept once done. */
export const Live: StoryObj = {
    render: function Render() {
        const [state, setState] = useState<DownloadState>('idle')
        const [count, setCount] = useState(0)
        useEffect(() => {
            if (state !== 'running') return
            if (count >= 12) {
                setState('kept')
                return
            }
            const timer = setTimeout(() => setCount(count + 1), 500)
            return () => clearTimeout(timer)
        }, [state, count])
        return (
            <Row>
                <DownloadButton
                    state={state}
                    count={count}
                    total={12}
                    onDownload={() => {
                        setCount(0)
                        setState('running')
                    }}
                    onCancel={() => setState('idle')}
                />
            </Row>
        )
    },
}

/**
 * A large file downloaded by its bytes: press to start, the share fills, pause holds it where it
 * is and resume carries on from there; cancel starts over, and it is kept once done.
 */
export const Pausing: StoryObj = {
    render: function Render() {
        const [state, setState] = useState<DownloadState>('idle')
        const [share, setShare] = useState(0)
        useEffect(() => {
            if (state !== 'running') return
            if (share >= 1) {
                setState('kept')
                return
            }
            const timer = setTimeout(() => setShare(Math.min(1, share + 0.04)), 250)
            return () => clearTimeout(timer)
        }, [state, share])
        return (
            <Row>
                <DownloadButton
                    state={state}
                    value={share}
                    onDownload={() => {
                        setShare(0)
                        setState('running')
                    }}
                    onPause={() => setState('paused')}
                    onResume={() => setState('running')}
                    onCancel={() => {
                        setShare(0)
                        setState('idle')
                    }}
                />
            </Row>
        )
    },
}
