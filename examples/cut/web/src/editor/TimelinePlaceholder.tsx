// TEMPORARY: stands where the library's ClipTimeline goes until it is released, and is replaced by it.

import { ListRow, ListRows } from '@winterop-com/sokkel-ui/ListRow'

import { nameOf, timecode, type Edit } from '../model'

/** The clips track by track as a plain list, each chosen by a press. */
export function TimelinePlaceholder({
    edit,
    selected,
    onSelectedChange,
}: {
    edit: Edit
    selected: readonly string[]
    onSelectedChange: (ids: string[]) => void
}) {
    const rows = edit.tracks.flatMap((track) =>
        edit.clips
            .filter((clip) => clip.track === track.id)
            .sort((a, b) => a.start - b.start)
            .map((clip) => ({ clip, track })),
    )
    return (
        <ListRows label="Clips">
            {rows.map(({ clip, track }) => (
                <ListRow
                    key={clip.id}
                    title={nameOf(clip)}
                    detail={`${track.name}: ${timecode(clip.start)} to ${timecode(clip.start + clip.duration)}`}
                    current={selected.includes(clip.id)}
                    onPress={() => onSelectedChange([clip.id])}
                />
            ))}
        </ListRows>
    )
}
