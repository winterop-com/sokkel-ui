import { DescriptionList } from '@winterop-com/sokkel-ui/DescriptionList'
import { InspectorSection } from '@winterop-com/sokkel-ui/Inspector'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { NumberField } from '@winterop-com/sokkel-ui/NumberField'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { SliderField } from '@winterop-com/sokkel-ui/SliderField'
import { TextField } from '@winterop-com/sokkel-ui/TextField'
import { Scissors, Trash2 } from 'lucide-react'

import { sourceOf } from '../media'
import { end, FPS, FRAME, lengthOf, lengthText, nameOf, timecode, trackOf, type Clip, type Edit, type Track } from '../model'

/** Reads a time typed as a timecode (00:04:12), minutes and seconds (0:04), or plain seconds (4.4). */
export function parseTime(text: string): number | null {
    const parts = text.trim().split(':')
    if (parts.some((part) => part === '' || !/^\d+(\.\d+)?$/.test(part))) return null
    const numbers = parts.map(Number)
    if (numbers.length === 1) return numbers[0] ?? null
    if (numbers.length === 2) return (numbers[0] ?? 0) * 60 + (numbers[1] ?? 0)
    if (numbers.length === 3) return (numbers[0] ?? 0) * 60 + (numbers[1] ?? 0) + (numbers[2] ?? 0) / FPS
    if (numbers.length === 4) return (numbers[0] ?? 0) * 3600 + (numbers[1] ?? 0) * 60 + (numbers[2] ?? 0) + (numbers[3] ?? 0) / FPS
    return null
}

/** A time field written and read as a timecode, a frame a step. */
function TimeField({
    id,
    label,
    value,
    min,
    max,
    onChange,
    disabled,
}: {
    id: string
    label: string
    value: number
    min?: number
    max?: number
    onChange: (seconds: number) => void
    disabled?: boolean
}) {
    return (
        <NumberField
            id={id}
            label={label}
            value={value}
            min={min}
            max={max}
            step={FRAME}
            mono
            disabled={disabled}
            format={(seconds) => timecode(seconds)}
            parse={parseTime}
            onValueChange={(next) => {
                if (next !== null && (min === undefined || next >= min - 1e-6) && (max === undefined || next <= max + 1e-6)) onChange(next)
            }}
        />
    )
}

function ClipFields({
    clip,
    track,
    onPatch,
}: {
    clip: Clip
    track: Track | undefined
    onPatch: (patch: Partial<Omit<Clip, 'id'>>, field: string) => void
}) {
    const source = sourceOf(clip.source)
    const locked = track?.locked === true
    const id = (field: string) => `clip-${field}`
    return (
        <Stack gap="lg">
            <InspectorSection title="Clip">
                <TextField
                    id={id('name')}
                    label="Name"
                    value={clip.name ?? ''}
                    placeholder={source?.name ?? 'Title'}
                    disabled={locked}
                    onChange={(name) => onPatch({ name }, 'name')}
                />
                {clip.text !== undefined && (
                    <TextField
                        id={id('text')}
                        label="Text"
                        multiline
                        rows={2}
                        maxRows={5}
                        value={clip.text}
                        disabled={locked}
                        help="Written over the picture for the title's time."
                        onChange={(text) => onPatch({ text }, 'text')}
                    />
                )}
            </InspectorSection>
            <InspectorSection title="Timing">
                <TimeField
                    id={id('start')}
                    label="Start"
                    value={clip.start}
                    min={0}
                    disabled={locked}
                    onChange={(start) => onPatch({ start }, 'start')}
                />
                {source !== undefined && (
                    <>
                        <TimeField
                            id={id('in')}
                            label="In point"
                            value={clip.inPoint}
                            min={0}
                            max={clip.inPoint + clip.duration - FRAME}
                            disabled={locked}
                            onChange={(inPoint) => onPatch({ inPoint, duration: clip.inPoint + clip.duration - inPoint }, 'in')}
                        />
                        <TimeField
                            id={id('out')}
                            label="Out point"
                            value={clip.inPoint + clip.duration}
                            min={clip.inPoint + FRAME}
                            max={source.duration}
                            disabled={locked}
                            onChange={(out) => onPatch({ duration: out - clip.inPoint }, 'out')}
                        />
                    </>
                )}
                <TimeField
                    id={id('duration')}
                    label="Duration"
                    value={clip.duration}
                    min={FRAME}
                    max={source === undefined ? undefined : source.duration - clip.inPoint}
                    disabled={locked}
                    onChange={(duration) => onPatch({ duration }, 'duration')}
                />
            </InspectorSection>
            {source?.kind === 'audio' && (
                <InspectorSection title="Sound">
                    <SliderField
                        id={id('volume')}
                        label="Volume"
                        value={Math.round((clip.volume ?? 1) * 100)}
                        max={100}
                        unit="%"
                        onChange={(volume) => !locked && onPatch({ volume: volume / 100 }, 'volume')}
                    />
                </InspectorSection>
            )}
            <InspectorSection title="About">
                <DescriptionList
                    items={[
                        { term: 'Track', value: track?.name ?? clip.track },
                        { term: 'Ends at', value: timecode(end(clip)) },
                        ...(source === undefined
                            ? []
                            : [
                                  { term: 'Source', value: source.name },
                                  { term: 'Source length', value: lengthText(source.duration) },
                                  { term: 'Recorded at', value: source.place },
                              ]),
                    ]}
                />
            </InspectorSection>
        </Stack>
    )
}

function ProjectFields({ edit }: { edit: Edit }) {
    return (
        <Stack gap="lg">
            <InspectorSection title="Summary">
                <DescriptionList
                    items={[
                        { term: 'Length', value: timecode(lengthOf(edit)) },
                        { term: 'Clips', value: String(edit.clips.length) },
                        { term: 'Frame rate', value: `${String(FPS)} frames a second` },
                    ]}
                />
            </InspectorSection>
        </Stack>
    )
}

/**
 * The inspector beside the preview: the chosen clip's name, text, in and out points, start,
 * duration and volume, each change one step of undo; with none chosen, a summary of the edit.
 */
export function ClipInspector({
    edit,
    selected,
    playhead,
    onPatch,
    onSplit,
    onDelete,
}: {
    edit: Edit
    selected: readonly string[]
    playhead: number
    onPatch: (id: string, patch: Partial<Omit<Clip, 'id'>>, field: string) => void
    onSplit: () => void
    onDelete: (ripple: boolean) => void
}) {
    const chosen = edit.clips.filter((clip) => selected.includes(clip.id))
    const clip = chosen.length === 1 ? chosen[0] : undefined
    const under = chosen.some((one) => one.start < playhead && playhead < end(one))
    const title = clip !== undefined ? nameOf(clip) : chosen.length > 1 ? `${String(chosen.length)} clips` : 'Edit'
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <PaneHeader
                title={title}
                variant="panel"
                actions={
                    chosen.length > 0 && (
                        <>
                            <Button size="sm" variant="outline" disabled={!under} onClick={onSplit}>
                                <Scissors aria-hidden />
                                Split
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onDelete(false)}>
                                <Trash2 aria-hidden />
                                Delete
                            </Button>
                        </>
                    )
                }
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {clip !== undefined ? (
                    <ClipFields
                        key={clip.id}
                        clip={clip}
                        track={trackOf(edit, clip.track)}
                        onPatch={(patch, field) => onPatch(clip.id, patch, field)}
                    />
                ) : chosen.length > 1 ? (
                    <DescriptionList
                        items={chosen.map((one) => ({
                            term: nameOf(one),
                            value: `${timecode(one.start)} for ${lengthText(one.duration)}`,
                        }))}
                    />
                ) : (
                    <ProjectFields edit={edit} />
                )}
            </div>
        </div>
    )
}
