import { Dialog } from '@base-ui/react/dialog'

import { cn } from '../lib/cn'

/**
 * An image that opens full screen when pressed: a chart an assistant drew, a screenshot someone
 * attached. A press anywhere or Escape closes it, and focus returns to the image.
 */
export function ImageLightbox({
    src,
    alt,
    className,
    defaultOpen = false,
    words = { open: 'Open the image full screen', close: 'Close' },
}: {
    src: string
    alt: string
    className?: string
    defaultOpen?: boolean
    words?: { open: string; close: string }
}) {
    return (
        <Dialog.Root defaultOpen={defaultOpen}>
            <Dialog.Trigger
                aria-label={words.open}
                className="cursor-zoom-in rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <img src={src} alt={alt} className={cn('rounded-md', className)} />
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-50 bg-shade/80 backdrop-blur-sm" />
                <Dialog.Popup aria-label={alt} className="fixed inset-0 z-50 flex items-center justify-center p-6 outline-none">
                    <Dialog.Close
                        aria-label={words.close}
                        className="flex max-h-full max-w-full cursor-zoom-out items-center justify-center"
                    >
                        <img src={src} alt={alt} className="max-h-[calc(100svh-3rem)] max-w-full rounded-lg object-contain shadow-pop" />
                    </Dialog.Close>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
