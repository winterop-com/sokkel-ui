/** What a person does to the dashboards themselves, each through the backend: make, rename, duplicate, delete and order. */

import { toast } from '@winterop-com/sokkel-ui/primitives/toast'

import { go } from 'tidevann-shared/router'
import { dashboards, prefs, todos } from './collections'
import { copyWidgets, PRESETS, widgetId, type Dashboard, type Prefs, type Widget } from './model'

const failed = (title: string) => (error: unknown) => {
    toast.add({ type: 'error', title, description: error instanceof Error ? error.message : String(error) })
}

/** The dashboards in the order the person put them; those not in it follow, oldest first. */
export function inOrder(all: readonly Dashboard[], order: readonly string[]): Dashboard[] {
    const place = new Map(order.map((id, index) => [id, index]))
    const ranked = all.filter((one) => place.has(one.id)).sort((a, b) => (place.get(a.id) ?? 0) - (place.get(b.id) ?? 0))
    return [...ranked, ...all.filter((one) => !place.has(one.id)).sort((a, b) => a.created - b.created)]
}

/** Makes a dashboard, empty or from one of the starting ones, listed last, and opens it. */
export async function createDashboard(name: string, from: string, mine: Prefs): Promise<void> {
    const preset = PRESETS.find((one) => one.id === from)
    const widgets = preset === undefined ? [] : copyWidgets(preset.widgets).widgets
    try {
        const made = await dashboards.create({ name, widgets, base: widgets, created: Date.now() })
        await prefs.update(mine.id, { order: [...mine.order, made.id] })
        toast.add({ type: 'success', title: `${name} made` })
        go(`/d/${made.id}`)
    } catch (error) {
        failed('Could not make the dashboard')(error)
    }
}

export async function renameDashboard(board: Dashboard, name: string): Promise<void> {
    await dashboards.update(board.id, { name }).catch(failed('Could not rename the dashboard'))
}

/** A copy of a dashboard, its to-do lists with it, listed after it, and opens it. */
export async function duplicateDashboard(board: Dashboard, mine: Prefs, order: readonly string[]): Promise<void> {
    const { widgets, ids } = copyWidgets(board.widgets)
    const base = board.base.map((widget): Widget => ({ ...widget, id: ids.get(widget.id) ?? widgetId(widget.kind) }))
    try {
        const made = await dashboards.create({ name: `${board.name} copy`, widgets, base, created: Date.now() })
        const lists = await todos.list()
        const copied = lists
            .filter((todo) => ids.has(todo.widget))
            .map((todo, index) => ({ ...todo, id: `${made.id}-todo-${String(index)}`, widget: ids.get(todo.widget) ?? todo.widget }))
        if (copied.length > 0) await todos.insert(copied)
        const at = order.indexOf(board.id)
        const next = [...order]
        next.splice(at === -1 ? next.length : at + 1, 0, made.id)
        await prefs.update(mine.id, { order: next })
        toast.add({ type: 'success', title: `${made.name} made` })
        go(`/d/${made.id}`)
    } catch (error) {
        failed('Could not duplicate the dashboard')(error)
    }
}

/** Deletes a dashboard with its to-do lists, and opens the one listed first. */
export async function deleteDashboard(board: Dashboard, mine: Prefs, rest: readonly Dashboard[]): Promise<void> {
    try {
        await dashboards.remove(board.id)
        const lists = await todos.list()
        const widgets = new Set(board.widgets.map((widget) => widget.id))
        for (const todo of lists) if (widgets.has(todo.widget)) await todos.remove(todo.id)
        await prefs.update(mine.id, { order: mine.order.filter((id) => id !== board.id) })
        toast.add({ title: `${board.name} deleted` })
        const first = rest.find((one) => one.id !== board.id)
        go(first === undefined ? '/dashboards' : `/d/${first.id}`)
    } catch (error) {
        failed('Could not delete the dashboard')(error)
    }
}

/** Keeps a dashboard's widgets, and drops the to-dos of a to-do list taken off it. */
export async function saveWidgets(board: Dashboard, widgets: Widget[]): Promise<void> {
    try {
        await dashboards.update(board.id, { widgets })
        const kept = new Set(widgets.map((widget) => widget.id))
        const gone = new Set(board.widgets.filter((widget) => !kept.has(widget.id)).map((widget) => widget.id))
        if (gone.size === 0) return
        const lists = await todos.list()
        for (const todo of lists) if (gone.has(todo.widget)) await todos.remove(todo.id)
    } catch (error) {
        failed('Could not save the dashboard')(error)
    }
}
