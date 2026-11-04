import { Layers } from 'lucide-react'

import { cn } from '../../lib/cn'
import { Button } from '../ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import type { Basemap } from './basemap'
import { useOptionalMapContext } from './context'

/** A basemap's preview image, or the card color for one without tiles. */
export function BasemapPreview({ basemap, className }: { basemap: Basemap; className?: string }) {
    if (basemap.preview === undefined) {
        return (
            <span
                aria-hidden
                className={cn(
                    'block shrink-0 rounded-[3px] bg-card bg-[radial-gradient(var(--border-strong)_1px,transparent_1px)] bg-size-[6px_6px] ring-1 ring-foreground/15',
                    className,
                )}
            />
        )
    }
    return (
        <img
            src={basemap.preview}
            alt=""
            draggable={false}
            className={cn('block shrink-0 rounded-[3px] object-cover ring-1 ring-foreground/15', className)}
        />
    )
}

/**
 * A button that opens the choice of basemap: one entry per basemap, each with its preview. Inside
 * a map its menu opens in the map's own frame, so it still shows while the map is full screen.
 */
export function BasemapSwitcher({
    basemaps,
    value,
    onValueChange,
    label = 'Basemap',
    defaultOpen = false,
    className,
}: {
    basemaps: readonly Basemap[]
    /** The id of the basemap drawn. */
    value: string
    onValueChange: (id: string) => void
    /** What the button and the menu are called. */
    label?: string
    defaultOpen?: boolean
    className?: string
}) {
    const map = useOptionalMapContext()
    return (
        <DropdownMenu defaultOpen={defaultOpen}>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={label}
                        title={label}
                        className={cn('bg-card text-foreground shadow-xs hover:bg-muted dark:bg-card dark:hover:bg-muted', className)}
                    />
                }
            >
                <Layers />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="left" align="start" container={map?.scope} className="w-52">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>{label}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={value} onValueChange={(next: string) => onValueChange(next)}>
                        {basemaps.map((basemap) => (
                            <DropdownMenuRadioItem key={basemap.id} value={basemap.id} className="gap-2.5 py-1.5">
                                <BasemapPreview basemap={basemap} className="h-8 w-11" />
                                {basemap.name}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

/**
 * Every basemap as a preview tile with its name, the drawn one ringed: the choice laid out in a
 * panel rather than behind a button.
 */
export function BasemapGallery({
    basemaps,
    value,
    onValueChange,
    label = 'Basemap',
    className,
}: {
    basemaps: readonly Basemap[]
    value: string
    onValueChange: (id: string) => void
    label?: string
    className?: string
}) {
    return (
        <div role="radiogroup" aria-label={label} className={cn('grid grid-cols-3 gap-1.5', className)}>
            {basemaps.map((basemap) => {
                const chosen = basemap.id === value
                return (
                    <button
                        key={basemap.id}
                        type="button"
                        role="radio"
                        aria-checked={chosen}
                        onClick={() => onValueChange(basemap.id)}
                        className={cn(
                            'flex min-w-0 flex-col gap-1 rounded-md p-1 text-left text-[11px] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
                            chosen ? 'font-medium text-foreground' : 'text-muted-foreground',
                        )}
                    >
                        <BasemapPreview basemap={basemap} className={cn('aspect-[4/3] w-full', chosen && 'ring-2 ring-primary')} />
                        <span className="truncate">{basemap.name}</span>
                    </button>
                )
            })}
        </div>
    )
}
