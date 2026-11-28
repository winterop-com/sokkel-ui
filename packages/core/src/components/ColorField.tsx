import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '../lib/cn'
import { fromHsv, readColor, toHsv, type Hsv } from '../lib/color-value'
import { useWords, type WordMessages, type WordsPart } from '../lib/words'
import { TypedField, type EntryFieldProps } from './entry'
import { FIELD_PART, FIELD_WORDS, type FieldWords } from './Field'
import { Picker, useOpen } from './pickers'

export type { EntryFieldProps } from './entry'

/** A color a field offers to pick with one press, with its name. */
export interface ColorSwatch {
    value: string
    name: string
}

export interface ColorPickerWords {
    /** The area of saturation across and brightness up. */
    area: string
    /** Where the area stands, as its saturation and brightness in whole percents. */
    areaValue: (saturation: number, brightness: number) => string
    hue: string
    swatches: string
}

export const COLOR_PICKER_WORDS: ColorPickerWords = {
    area: 'Saturation and brightness',
    areaValue: (saturation, brightness) => `Saturation ${String(saturation)}%, brightness ${String(brightness)}%`,
    hue: 'Hue',
    swatches: 'Swatches',
}

/** Where a catalog holds a color picker's words, and the arguments its phrases name. */
export const COLOR_PICKER_PART: WordsPart<ColorPickerWords> = {
    id: 'colorPicker',
    words: COLOR_PICKER_WORDS,
    args: { areaValue: 'saturation brightness' },
}

/** A color picker's phrases as ICU messages in English, for the catalog. */
export const COLOR_PICKER_MESSAGES: WordMessages<ColorPickerWords> = {
    areaValue: 'Saturation {saturation}%, brightness {brightness}%',
}

export interface ColorPickerProps {
    /** The color, as `#rrggbb`. */
    value: string
    onValueChange: (value: string) => void
    swatches?: readonly ColorSwatch[]
    words?: Partial<ColorPickerWords>
    className?: string
}

/** What the picker stands on with no color yet. */
const BLACK = fromHsv({ h: 0, s: 0, v: 0 })

/** How far an arrow key moves the area's mark; Shift moves ten times as far. */
const STEP = 0.01

/**
 * A color picked by eye: an area of saturation across and brightness up in the chosen hue, a hue
 * strip under it, and swatches to pick with one press. The area's mark moves with the pointer, or
 * with the arrow keys while it has focus (Shift for larger steps); the hue keeps its place while the
 * color is gray, so dragging into the gray and out again keeps it.
 */
export function ColorPicker({ value, onValueChange, swatches = [], words: given, className }: ColorPickerProps) {
    const words = useWords(COLOR_PICKER_PART, given)
    const [kept, setKept] = useState<Hsv>(() => toHsv(readColor(value) ?? BLACK))
    const shown = fromHsv(kept) === readColor(value) ? kept : { ...toHsv(readColor(value) ?? BLACK), ...grayHue(value, kept) }
    const area = useRef<HTMLDivElement>(null)

    const change = (next: Hsv) => {
        setKept(next)
        onValueChange(fromHsv(next))
    }
    const pointAt = (event: PointerEvent<HTMLDivElement>) => {
        const box = area.current?.getBoundingClientRect()
        if (box === undefined || box.width === 0) return
        change({ ...shown, s: clamp((event.clientX - box.left) / box.width), v: clamp(1 - (event.clientY - box.top) / box.height) })
    }
    const onAreaKey = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = event.shiftKey ? STEP * 10 : STEP
        const moves: Record<string, Partial<Hsv>> = {
            ArrowLeft: { s: clamp(shown.s - step) },
            ArrowRight: { s: clamp(shown.s + step) },
            ArrowUp: { v: clamp(shown.v + step) },
            ArrowDown: { v: clamp(shown.v - step) },
        }
        const move = moves[event.key] as Partial<Hsv> | undefined
        if (move === undefined) return
        event.preventDefault()
        change({ ...shown, ...move })
    }

    const pure = `hsl(${String(shown.h)} 100% 50%)`
    return (
        <div data-slot="color-picker" className={cn('flex w-56 flex-col gap-3', className)}>
            <div
                ref={area}
                role="slider"
                tabIndex={0}
                aria-label={words.area}
                aria-valuetext={words.areaValue(Math.round(shown.s * 100), Math.round(shown.v * 100))}
                aria-valuenow={Math.round(shown.s * 100)}
                data-slot="color-area"
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId)
                    pointAt(event)
                }}
                onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) pointAt(event)
                }}
                onKeyDown={onAreaKey}
                className="relative h-36 cursor-crosshair touch-none rounded-control outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                style={{
                    backgroundColor: pure,
                    backgroundImage: `linear-gradient(to top, hsl(${String(0)} 0% 0%), transparent), linear-gradient(to right, hsl(${String(0)} 0% 100%), transparent)`,
                }}
            >
                <span
                    aria-hidden
                    className="pointer-events-none absolute size-3.5 -translate-1/2 rounded-full border-2 border-background shadow-surface ring-1 ring-foreground/40"
                    style={{ left: `${String(shown.s * 100)}%`, top: `${String((1 - shown.v) * 100)}%`, backgroundColor: fromHsv(shown) }}
                />
            </div>
            <SliderPrimitive.Root
                value={shown.h}
                min={0}
                max={359}
                onValueChange={(hue) => change({ ...shown, h: Array.isArray(hue) ? hue[0] : hue })}
                thumbAlignment="edge"
                data-slot="color-hue"
            >
                <SliderPrimitive.Control className="relative flex h-4 w-full touch-none items-center select-none">
                    <SliderPrimitive.Track
                        className="relative h-3 w-full rounded-full"
                        style={{
                            backgroundImage: `linear-gradient(to right, ${[0, 60, 120, 180, 240, 300, 360].map((hue) => `hsl(${String(hue)} 100% 50%)`).join(', ')})`,
                        }}
                    >
                        <SliderPrimitive.Thumb
                            aria-label={words.hue}
                            className="block size-4 rounded-full border-2 border-background shadow-surface ring-1 ring-foreground/40 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            style={{ backgroundColor: pure }}
                        />
                    </SliderPrimitive.Track>
                </SliderPrimitive.Control>
            </SliderPrimitive.Root>
            {swatches.length > 0 && (
                <div role="group" aria-label={words.swatches} className="grid grid-cols-8 gap-1.5">
                    {swatches.map((swatch) => {
                        const isChosen = readColor(swatch.value) === readColor(value)
                        return (
                            <button
                                key={swatch.value}
                                type="button"
                                aria-label={swatch.name}
                                aria-pressed={isChosen}
                                title={swatch.name}
                                data-slot="color-swatch"
                                onClick={() => {
                                    const read = readColor(swatch.value)
                                    if (read !== null) change(toHsv(read))
                                }}
                                className={cn(
                                    'aspect-square w-full cursor-pointer rounded-control ring-1 ring-foreground/15 outline-none ring-inset focus-visible:ring-3 focus-visible:ring-ring/50',
                                    isChosen && 'ring-2 ring-foreground ring-offset-2 ring-offset-popover',
                                )}
                                style={{ backgroundColor: swatch.value }}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

/** The hue and saturation kept while the color is gray or black, which carry none of their own. */
function grayHue(value: string, kept: Hsv): Partial<Hsv> {
    const read = toHsv(readColor(value) ?? BLACK)
    if (read.v === 0) return { h: kept.h, s: kept.s }
    return read.s === 0 ? { h: kept.h } : {}
}

export interface ColorFieldWords extends FieldWords, ColorPickerWords {
    /** Said when what is typed is not a color. */
    unreadable: string
    /** How a color is written. */
    example: string
    /** The button that opens the picker. */
    pick: string
    /** The button that empties the field. */
    clear: string
}

export const COLOR_FIELD_WORDS: ColorFieldWords = {
    ...FIELD_WORDS,
    ...COLOR_PICKER_WORDS,
    unreadable: 'Enter a color',
    example: 'Write six hex digits after #, or rgb(r, g, b).',
    pick: 'Choose a color',
    clear: 'Clear',
}

/** Where a catalog holds a color field's words. */
export const COLOR_FIELD_PART: WordsPart<ColorFieldWords> = {
    id: 'colorField',
    words: COLOR_FIELD_WORDS,
    args: { areaValue: 'saturation brightness' },
    from: [FIELD_PART, COLOR_PICKER_PART],
}

export interface ColorFieldProps extends Omit<EntryFieldProps<string>, 'min' | 'max'> {
    swatches?: readonly ColorSwatch[]
    /** Whether the picker is open, held from outside with `onOpenChange`. */
    open?: boolean
    /** Whether the picker starts open when `open` is not given. */
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    words?: Partial<ColorFieldWords>
}

/**
 * A color typed (six or three hex digits after `#`, or `rgb(r, g, b)`) or picked: the value is always
 * `#rrggbb`.
 * A swatch of the color stands at the frame's end and opens a `ColorPicker` under it; Alt and the
 * down arrow open it from the input. Text that is not a color keeps the value as it was and is
 * said. An optional field empties with a clear button.
 */
export function ColorField({ swatches, open, defaultOpen, onOpenChange, words: said, placeholder, ...field }: ColorFieldProps) {
    const words = useWords(COLOR_FIELD_PART, said)
    const [opened, setOpened] = useOpen(open, defaultOpen, onOpenChange)
    return (
        <TypedField
            {...field}
            placeholder={placeholder ?? '#rrggbb'}
            read={readColor}
            write={(value) => value}
            before={() => false}
            unreadable={() => ({ tone: 'critical', text: words.unreadable, detail: words.example })}
            bounds={{ under: () => '', over: () => '', use: () => '' }}
            fieldWords={words}
            clear={words.clear}
            onKeyDown={(event) => {
                if (!event.altKey || event.key !== 'ArrowDown') return
                event.preventDefault()
                setOpened(true)
            }}
            end={(entry, frame) => (
                <Picker
                    label={words.pick}
                    icon={
                        <span
                            data-slot="color-field-swatch"
                            className="block size-4 rounded-mini ring-1 ring-foreground/20 ring-inset"
                            style={{ backgroundColor: entry.value ?? 'transparent' }}
                        />
                    }
                    anchor={frame}
                    open={opened}
                    onOpenChange={setOpened}
                    className="p-3"
                >
                    <ColorPicker
                        value={entry.value ?? BLACK}
                        onValueChange={(value) => entry.set(value)}
                        swatches={swatches}
                        words={words}
                    />
                </Picker>
            )}
        />
    )
}

function clamp(value: number): number {
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}
