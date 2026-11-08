import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect, useState } from 'react'

import { DownloadButton, type DownloadState } from '@winterop-com/sokkel-ui/DownloadButton'
import { Row } from '@winterop-com/sokkel-ui/Layout'
import { Specimen } from '../fixtures/Specimen'

/** A button that downloads something for keeping: idle, n of m with a cancel, and kept. */
const meta: Meta = { title: 'Patterns/Download button', parameters: { frame: 'column' } }
export default meta

/** The three states, held by the story. */
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
