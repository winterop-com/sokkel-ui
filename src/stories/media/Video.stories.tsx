import type { Meta, StoryObj } from '@storybook/react-vite'

import { VideoPlayer } from '../../components/media/VideoPlayer'
import captions from './fixtures/captions.vtt?url'
import clip from './fixtures/clip.webm?url'

/** A player in the middle of a plain page. The clip is a local, silent gradient. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-4 text-foreground sm:p-8">
            <div className="mx-auto flex max-w-4xl flex-col gap-3">
                {children}
                <div>
                    <p className="text-sm font-medium">Coastline, morning to evening</p>
                    <p className="text-xs text-muted-foreground">Margaret &middot; 1:36</p>
                </div>
            </div>
        </div>
    )
}

const meta: Meta = { title: 'Media/Video' }
export default meta

/** Paused at a frame before the first play: only the play button is drawn over the picture. */
export const PausedFrame: StoryObj = {
    name: 'Paused frame',
    render: () => (
        <Ground>
            <VideoPlayer src={`${clip}#t=24`} preload="auto" />
        </Ground>
    ),
}

/** The controls drawn over the same frame, with English captions on. */
export const ControlsShown: StoryObj = {
    name: 'Controls shown',
    render: () => (
        <Ground>
            <VideoPlayer
                src={`${clip}#t=24`}
                preload="auto"
                defaultControlsVisible
                tracks={[
                    { src: captions, label: 'English', lang: 'en', default: true },
                    { src: captions, label: 'English (plain)', lang: 'en-x-plain' },
                ]}
            />
        </Ground>
    ),
}
