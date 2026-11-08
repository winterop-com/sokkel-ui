import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'

import { ImageLightbox } from '@winterop-com/sokkel-ui/ImageLightbox'
import { ShortcutsDialog } from '@winterop-com/sokkel-ui/ShortcutsDialog'
import { ThemeToggle } from '@winterop-com/sokkel-ui/ThemeToggle'
import { TooltipProvider } from '@winterop-com/sokkel-ui/primitives/tooltip'
import { Row, Stack } from '@winterop-com/sokkel-ui/Layout'
import { CHART as PHOTO_CHART, FIELD, HARBOR_DUSK, LIGHTHOUSE, PINES } from '../fixtures/photos'

/** The app-level controls: the scheme switch, the shortcuts dialog, an image that opens full screen. */
function Ground({ children }: { children: React.ReactNode }) {
    return (
        <TooltipProvider>
            <Stack gap="xl" className="mx-auto max-w-3xl">
                {children}
            </Stack>
        </TooltipProvider>
    )
}

const CHART = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320" viewBox="0 0 640 320">
<rect width="640" height="320" fill="#f6f7f9"/>
<g fill="#3b82f6">${[120, 160, 140, 190, 210, 180, 230, 250, 220, 260, 280, 270].map((h, i) => `<rect x="${30 + i * 50}" y="${300 - h}" width="34" height="${h}" rx="3"/>`).join('')}</g>
<text x="30" y="30" font-family="sans-serif" font-size="16" fill="#111">Runs per month, 2026</text>
</svg>`)}`

function Toggle() {
    const [dark, setDark] = useState(true)
    return (
        <Ground>
            <Row className="h-shell-top rounded-surface border border-border-strong bg-sidebar px-3">
                <span className="text-sm font-medium">Tidevann</span>
                <span className="font-mono text-xs text-muted-foreground">1.4.0</span>
                <div className="flex-1" />
                <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />
            </Row>
        </Ground>
    )
}

function Shortcuts() {
    const [open, setOpen] = useState(true)
    return (
        <Ground>
            <ShortcutsDialog
                open={open}
                onOpenChange={setOpen}
                groups={[
                    {
                        title: 'Anywhere',
                        shortcuts: [
                            { id: 'palette', action: 'Open the command palette', keys: ['⌘', 'K'] },
                            { id: 'search', action: 'Search this list', keys: ['/'] },
                            { id: 'help', action: 'Show these shortcuts', keys: ['?'] },
                        ],
                    },
                    {
                        title: 'Go to',
                        shortcuts: [
                            { id: 'runs', action: 'Runs', keys: ['G', 'R'] },
                            { id: 'jobs', action: 'Jobs', keys: ['G', 'J'] },
                            { id: 'services', action: 'Services', keys: ['G', 'S'] },
                        ],
                    },
                    {
                        title: 'Editor',
                        shortcuts: [
                            { id: 'save', action: 'Save the job', keys: ['⌘', 'S'] },
                            { id: 'run', action: 'Run it', keys: ['⌘', 'Enter'] },
                        ],
                    },
                ]}
            />
        </Ground>
    )
}

function Lightbox({ open }: { open: boolean }) {
    return (
        <Ground>
            <p className="text-sm">The chart the assistant drew:</p>
            <ImageLightbox src={CHART} alt="Runs per month, 2026" className="w-80" defaultOpen={open} />
        </Ground>
    )
}

const BOXES = [
    { id: 'boat-near', x: 0.14, y: 0.64, w: 0.17, h: 0.18, label: 'boat', confidence: 0.94 },
    { id: 'boat-far', x: 0.615, y: 0.72, w: 0.195, h: 0.165, label: 'boat', confidence: 0.88 },
    { id: 'sun', x: 0.625, y: 0.365, w: 0.2, h: 0.265, label: 'sun', confidence: 0.71 },
]

function BoxedLightbox({ open }: { open: boolean }) {
    return (
        <Ground>
            <p className="text-sm">What the worker found in the upload:</p>
            <ImageLightbox src={HARBOR_DUSK} alt="A harbor at dusk" boxes={BOXES} numbered className="w-80" defaultOpen={open} />
        </Ground>
    )
}

const GALLERY = [
    { src: HARBOR_DUSK, alt: 'A harbor at dusk' },
    { src: LIGHTHOUSE, alt: 'A lighthouse on the coast' },
    { src: PINES, alt: 'Pines in the fog' },
    { src: FIELD, alt: 'A field at noon' },
    { src: PHOTO_CHART, alt: 'Rows loaded per run' },
]

/** Each photo opens the gallery at itself, and the arrows, the side buttons or a swipe move through them all. */
function Gallery({ open }: { open?: number }) {
    return (
        <Ground>
            <p className="text-sm">Photos from the site visit:</p>
            <Row gap="sm" wrap>
                {GALLERY.map((image, index) => (
                    <ImageLightbox
                        key={image.alt}
                        src={image.src}
                        alt={image.alt}
                        images={GALLERY}
                        index={index}
                        defaultOpen={open === index}
                        className="w-32"
                    />
                ))}
            </Row>
        </Ground>
    )
}

const meta: Meta = { title: 'Patterns/App controls', parameters: { frame: 'padded' } }
export default meta

export const Theme: StoryObj = { name: 'Theme toggle', render: () => <Toggle /> }
export const Keys: StoryObj = { name: 'Shortcuts dialog', render: () => <Shortcuts /> }
export const Image: StoryObj = { name: 'Image lightbox', render: () => <Lightbox open={false} /> }
export const ImageOpen: StoryObj = { name: 'Image lightbox, open', render: () => <Lightbox open /> }
/** An image with boxes over it, numbered and tagged, small and full screen alike. */
export const ImageBoxes: StoryObj = { name: 'Image lightbox, boxes', render: () => <BoxedLightbox open={false} /> }
/** The boxed image opened full screen. */
export const ImageBoxesOpen: StoryObj = { name: 'Image lightbox, boxes open', render: () => <BoxedLightbox open /> }
/** Several photos, each opening the gallery at itself. */
export const ImageGallery: StoryObj = { name: 'Image gallery', render: () => <Gallery /> }
/**
 * The gallery open at the third photo, "3 of 5": the arrows and the side buttons move, the wheel, a
 * pinch or the buttons zoom, a drag moves the zoomed photo, and a double press goes between the fit
 * and the photo's own pixels.
 */
export const ImageGalleryOpen: StoryObj = { name: 'Image gallery, open', render: () => <Gallery open={2} /> }
