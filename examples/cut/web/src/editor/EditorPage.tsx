import { useShortcuts } from '@winterop-com/sokkel-ui/hooks/use-shortcuts'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { PaneHeader } from '@winterop-com/sokkel-ui/PaneHeader'
import { useRailMode } from '@winterop-com/sokkel-ui/Shell'
import { SplitPane } from '@winterop-com/sokkel-ui/SplitPane'
import { toast } from '@winterop-com/sokkel-ui/primitives/toast'
import { Copy, Download, PencilLine, Redo2, Scissors, Trash2, Undo2, ZoomIn, ZoomOut, Maximize2, ListX } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { saveEdit } from '../actions'
import type { Source } from '../media'
import {
    addSource,
    addTitle,
    deleteClips,
    end,
    firstTrack,
    lengthOf,
    patchClip,
    splitAll,
    type Clip,
    type Edit,
    type Prefs,
    type Project,
    type Track,
} from '../model'
import { setSoundLevel } from '../sound'
import { useEditHistory } from '../history'
import { Bin } from './Bin'
import { ClipInspector } from './ClipInspector'
import { ExportDialog } from './ExportDialog'
import { Preview } from './Preview'
import { TimelinePlaceholder } from './TimelinePlaceholder'
import { usePlayback } from './use-playback'

/** How long the edit waits after the last change before it is saved, in milliseconds. */
const SAVE_AFTER = 600

/** The zoom's bounds and each step, in pixels a second. */
const ZOOM = { least: 4, most: 400, step: 1.5 }

/** Keeps the edit on the backend a moment after it last changed, and once more as the editor closes. */
function useAutosave(id: string, edit: Edit, initial: Edit) {
    const saved = useRef(initial)
    const latest = useRef(edit)
    latest.current = edit
    useEffect(() => {
        if (edit === saved.current) return
        const timer = window.setTimeout(() => {
            saved.current = edit
            saveEdit(id, edit).catch((error: unknown) => {
                toast.add({
                    type: 'error',
                    title: 'Could not save the edit',
                    description: error instanceof Error ? error.message : String(error),
                })
            })
        }, SAVE_AFTER)
        return () => window.clearTimeout(timer)
    }, [id, edit])
    useEffect(
        () => () => {
            if (latest.current !== saved.current) void saveEdit(id, latest.current).catch(() => undefined)
        },
        [id],
    )
}

/**
 * The editor: the media bin, the preview with its transport and the inspector over the timeline.
 * Every change is a step of undo and is saved as it is made.
 */
export function EditorPage({
    project,
    prefs,
    onRename,
    onDuplicate,
    onDelete,
}: {
    project: Project
    prefs: Prefs
    onRename: () => void
    onDuplicate: () => void
    onDelete: () => void
}) {
    useRailMode('collapsed')
    const [initial] = useState<Edit>(() => ({ tracks: project.tracks, clips: project.clips }))
    const history = useEditHistory(initial)
    const { edit, apply } = history
    useAutosave(project.id, edit, initial)
    const length = lengthOf(edit)
    const playback = usePlayback(edit, length, prefs.loop)
    const { playhead } = playback
    const [selected, setSelected] = useState<string[]>([])
    const [exporting, setExporting] = useState(false)
    const [level, setLevel] = useState(1)
    const [muted, setMuted] = useState(false)
    const [zoom, setZoom] = useState<number | null>(null)
    const area = useRef<HTMLDivElement>(null)
    const [room, setRoom] = useState(0)

    useEffect(() => setSoundLevel(muted ? 0 : level), [level, muted])

    // The timeline's width, which a fit zoom shares out over the edit's length.
    useLayoutEffect(() => {
        const element = area.current
        if (element === null) return
        const measure = () => setRoom(element.clientWidth)
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [])
    const fit = Math.max(ZOOM.least, Math.min(ZOOM.most, (room - 160) / Math.max(length, 1)))
    const pixels = zoom ?? fit

    // A clip deleted or undone away is no longer chosen.
    const present = selected.filter((id) => edit.clips.some((clip) => clip.id === id))
    if (present.length !== selected.length) setSelected(present)

    const place = (source: Source, at: 'playhead' | 'end') => {
        const track = firstTrack(edit, source.kind)
        const where =
            at === 'playhead' || track === undefined
                ? playhead
                : Math.max(0, ...edit.clips.filter((clip) => clip.track === track.id).map(end))
        const done = addSource(edit, source, where)
        if (done === undefined) {
            toast.add({ type: 'warning', title: `No unlocked ${source.kind === 'video' ? 'picture' : 'sound'} track to place it on` })
            return
        }
        apply(done.edit)
        setSelected([done.id])
    }

    const title = () => {
        const done = addTitle(edit, playhead, 'A new title', prefs.titleLength)
        if (done === undefined) {
            toast.add({ type: 'warning', title: 'No unlocked title track to place it on' })
            return
        }
        apply(done.edit)
        setSelected([done.id])
    }

    const split = () => {
        apply((current) => splitAll(current, playhead, selected))
    }
    const remove = (ripple: boolean) => {
        if (selected.length === 0) return
        apply((current) => deleteClips(current, selected, ripple))
        setSelected([])
    }
    const patch = (id: string, change: Partial<Omit<Clip, 'id'>>, field: string) =>
        apply((current) => patchClip(current, id, change), `${id}:${field}`)
    const setTrack = (id: string, change: Partial<Track>) =>
        apply((current) => ({ ...current, tracks: current.tracks.map((track) => (track.id === id ? { ...track, ...change } : track)) }))
    const zoomBy = (factor: number) => setZoom(Math.max(ZOOM.least, Math.min(ZOOM.most, pixels * factor)))

    const group = 'Editing'
    useShortcuts(
        [
            { id: 'play', key: ' ', label: 'Play or pause', group: 'Playback', run: playback.toggle },
            { id: 'forward', key: 'l', label: 'Play forward, faster on each press', group: 'Playback', run: playback.forward },
            { id: 'pause', key: 'k', label: 'Pause', group: 'Playback', run: playback.pause },
            { id: 'backward', key: 'j', label: 'Play backward, faster on each press', group: 'Playback', run: playback.backward },
            { id: 'frame-back', key: 'ArrowLeft', label: 'A frame back', group: 'Playback', repeat: true, run: () => playback.step(-1) },
            { id: 'frame-on', key: 'ArrowRight', label: 'A frame on', group: 'Playback', repeat: true, run: () => playback.step(1) },
            {
                id: 'second-back',
                key: 'ArrowLeft',
                shift: true,
                label: 'A second back',
                group: 'Playback',
                repeat: true,
                run: () => playback.step(-30),
            },
            {
                id: 'second-on',
                key: 'ArrowRight',
                shift: true,
                label: 'A second on',
                group: 'Playback',
                repeat: true,
                run: () => playback.step(30),
            },
            { id: 'start', key: 'Home', label: 'To the start', group: 'Playback', run: () => playback.seek(0) },
            { id: 'end', key: 'End', label: 'To the end', group: 'Playback', run: () => playback.seek(length) },
            { id: 'undo', key: 'z', mod: true, label: 'Undo', group, run: history.undo, disabled: !history.canUndo },
            { id: 'redo', key: 'z', mod: true, shift: true, label: 'Redo', group, run: history.redo, disabled: !history.canRedo },
            { id: 'split', key: 's', label: 'Split at the playhead', group, run: split },
            { id: 'delete', key: 'Delete', label: 'Delete', group, run: () => remove(prefs.rippleByDefault) },
            { id: 'backspace', key: 'Backspace', group, run: () => remove(prefs.rippleByDefault) },
            { id: 'ripple', key: 'Delete', shift: true, label: 'Ripple delete', group, run: () => remove(true) },
            { id: 'title', key: 't', label: 'Add a title at the playhead', group, run: title },
            { id: 'zoom-in', key: '=', label: 'Zoom in', group: 'Timeline', run: () => zoomBy(ZOOM.step) },
            { id: 'zoom-out', key: '-', label: 'Zoom out', group: 'Timeline', run: () => zoomBy(1 / ZOOM.step) },
            { id: 'zoom-fit', key: '0', label: 'Fit the edit', group: 'Timeline', run: () => setZoom(null) },
            { id: 'none', key: 'Escape', label: 'Choose no clip', group, run: () => setSelected([]) },
        ],
        [playback, history, length, selected, playhead, prefs, pixels, edit],
    )

    const chosenUnder = edit.clips.some(
        (clip) => (selected.length === 0 || selected.includes(clip.id)) && clip.start < playhead && playhead < end(clip),
    )
    const timeline = (
        <div ref={area} className="flex min-h-0 flex-1 flex-col">
            <PaneHeader
                title="Timeline"
                variant="panel"
                actions={
                    <>
                        <IconButton label="Split at the playhead" variant="ghost" size="icon-sm" disabled={!chosenUnder} onClick={split}>
                            <Scissors aria-hidden />
                        </IconButton>
                        <IconButton
                            label="Delete"
                            variant="ghost"
                            size="icon-sm"
                            disabled={selected.length === 0}
                            onClick={() => remove(prefs.rippleByDefault)}
                        >
                            <Trash2 aria-hidden />
                        </IconButton>
                        <IconButton
                            label="Ripple delete"
                            variant="ghost"
                            size="icon-sm"
                            disabled={selected.length === 0}
                            onClick={() => remove(true)}
                        >
                            <ListX aria-hidden />
                        </IconButton>
                        <IconButton
                            label="Zoom out"
                            variant="ghost"
                            size="icon-sm"
                            disabled={pixels <= ZOOM.least}
                            onClick={() => zoomBy(1 / ZOOM.step)}
                        >
                            <ZoomOut aria-hidden />
                        </IconButton>
                        <IconButton
                            label="Zoom in"
                            variant="ghost"
                            size="icon-sm"
                            disabled={pixels >= ZOOM.most}
                            onClick={() => zoomBy(ZOOM.step)}
                        >
                            <ZoomIn aria-hidden />
                        </IconButton>
                        <IconButton
                            label="Fit the edit"
                            variant="ghost"
                            size="icon-sm"
                            disabled={zoom === null}
                            onClick={() => setZoom(null)}
                        >
                            <Maximize2 aria-hidden />
                        </IconButton>
                    </>
                }
            />
            <div className="min-h-0 flex-1 overflow-auto">
                <TimelinePlaceholder edit={edit} selected={selected} onSelectedChange={setSelected} />
            </div>
        </div>
    )

    return (
        <>
            <PageHeader
                title={project.name}
                items={[
                    {
                        id: 'undo',
                        label: 'Undo',
                        icon: <Undo2 aria-hidden />,
                        onSelect: history.undo,
                        reason: history.canUndo ? undefined : 'Nothing to undo.',
                    },
                    {
                        id: 'redo',
                        label: 'Redo',
                        icon: <Redo2 aria-hidden />,
                        onSelect: history.redo,
                        reason: history.canRedo ? undefined : 'Nothing to redo.',
                    },
                    { id: 'rename', label: 'Rename', icon: <PencilLine aria-hidden />, onSelect: onRename },
                    { id: 'duplicate', label: 'Duplicate', icon: <Copy aria-hidden />, onSelect: onDuplicate },
                    { id: 'delete', label: 'Delete', icon: <Trash2 aria-hidden />, onSelect: onDelete, destructive: true },
                ]}
                primary={{
                    id: 'export',
                    label: 'Export',
                    icon: <Download aria-hidden />,
                    onSelect: () => setExporting(true),
                    reason: length === 0 ? 'The edit has nothing in it to export.' : undefined,
                }}
            />
            <SplitPane
                direction="down"
                id="cut-rows"
                className="min-h-0 flex-1"
                defaultShare={0.62}
                minShare={0.35}
                maxShare={0.8}
                first={
                    <SplitPane
                        id="cut-bin"
                        defaultShare={0.24}
                        minShare={0.15}
                        maxShare={0.4}
                        narrowBelow={720}
                        first={
                            <Bin
                                onAdd={(source) => place(source, 'playhead')}
                                onAppend={(source) => place(source, 'end')}
                                onTitle={title}
                            />
                        }
                        second={
                            <SplitPane
                                id="cut-inspector"
                                defaultShare={0.66}
                                minShare={0.45}
                                maxShare={0.8}
                                narrowBelow={720}
                                first={
                                    <Preview
                                        edit={edit}
                                        length={length}
                                        playback={playback}
                                        light={prefs.lightPreview}
                                        level={level}
                                        muted={muted}
                                        onLevelChange={setLevel}
                                        onMutedChange={setMuted}
                                    />
                                }
                                second={
                                    <ClipInspector
                                        edit={edit}
                                        selected={selected}
                                        playhead={playhead}
                                        onPatch={patch}
                                        onTrack={setTrack}
                                        onSplit={split}
                                        onDelete={remove}
                                    />
                                }
                            />
                        }
                    />
                }
                second={timeline}
            />
            {exporting && <ExportDialog name={project.name} edit={edit} size={prefs.exportSize} onClose={() => setExporting(false)} />}
        </>
    )
}
