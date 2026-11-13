import type { Meta, StoryObj } from '@storybook/react-vite'

import * as danger from './dialogs/danger'
import * as flows from './dialogs/flows'
import * as forms from './dialogs/forms'
import * as small from './dialogs/small'

/**
 * A dialog for each thing an app asks a person to do in one: confirm, rename, create, delete,
 * move, pick, schedule, share, import and export, each open over a page of the harbor project
 * and working when pressed. On a phone each is a full-screen sheet with its verbs at the bottom.
 * A field's problem is a mark inside it and a count beside the verb, so no dialog changes height.
 */
const meta: Meta = { title: 'Patterns/Dialogs' }
export default meta

/** A question with one answer, and no body. */
export const Confirm: StoryObj = { render: () => <danger.ConfirmDelete /> }

/** One field, prefilled; Rename is shut while the name is unchanged, and Enter renames. */
export const Rename: StoryObj = { name: 'Rename', render: () => <small.Rename /> }

/** A filled-in field first and the one still to write after it: `initialFocus` opens on the message. */
export const InitialFocus: StoryObj = { name: 'Initial focus', render: () => <small.PublishOutput /> }

/** Nothing to fill: `initialFocus="confirm"` focuses Run, so Enter runs it. */
export const ConfirmFocused: StoryObj = { name: 'Confirm focused', render: () => <small.RunNow /> }

/** Delete stays shut until the pipeline's code is typed exactly; the input checks when it matches. */
export const TypeToConfirm: StoryObj = { name: 'Type to confirm', render: () => <danger.TypeToDelete /> }

/** A delete that says what goes with it, a row per kind with its count. */
export const DeleteCascade: StoryObj = { name: 'Delete cascade', render: () => <danger.DeleteWithConsequences /> }

/** A confirm that says what it does as facts, a row each, under the heading a `neutral` list takes. */
export const ClearCache: StoryObj = { name: 'Clear cache', render: () => <danger.ClearCache /> }

/** The confirm is working: its verb spins, and Cancel, Escape and the backdrop do nothing until it is done. */
export const Busy: StoryObj = { name: 'Busy', render: () => <small.Busy /> }

/** The server refused: its words in the dialog with the raw answer folded away, and Retry. */
export const ServerRefusal: StoryObj = { name: 'Server refusal', render: () => <small.Refused /> }

/** Done, with the two ways on: open what was made, or make another. */
export const Success: StoryObj = { render: () => <small.Created /> }

/** A run's log to read, with nothing to confirm: the corner closes it, and Copy and Download stand alone in the footer. */
export const RunLog: StoryObj = { name: 'Run log', render: () => <small.RunLog /> }

/** A form from a JSON Schema after Create: the marks in the fields, and the count beside the verb. */
export const Create: StoryObj = { render: () => <forms.CreateJob /> }

/** A copy under a new code, with a choice of what comes along; the code is taken, and the mark offers a free one. */
export const Duplicate: StoryObj = { name: 'Duplicate', render: () => <forms.Duplicate /> }

/** Cancel pressed on a changed form: discard, or keep editing with the changes. */
export const UnsavedChanges: StoryObj = { name: 'Unsaved changes', render: () => <forms.UnsavedEdit /> }

/** A half-written note that a press outside leaves open; Cancel, the close and Escape still close it. */
export const OutsidePress: StoryObj = { name: 'Outside press', render: () => <small.RunNote /> }

/** An editing dialog with a confirm opened on top of it for one of its rows. */
export const Nested: StoryObj = { render: () => <forms.NestedConfirm /> }

/** Moving jobs to a folder picked from a tree of projects and folders. */
export const MoveTo: StoryObj = { name: 'Move to', render: () => <small.MoveTo /> }

/** One block picked from a long catalog by search and by what it can do. */
export const PickOne: StoryObj = { name: 'Pick one', render: () => <small.PickOne /> }

/** A cron expression with presets, read back in words, and the next five runs. */
export const Schedule: StoryObj = { name: 'Schedule', render: () => <small.Schedule /> }

/** A new schedule, its field empty with an example in it: no issue, no reading and no runs yet. */
export const NewSchedule: StoryObj = { name: 'New schedule', render: () => <small.NewSchedule /> }

/** nightly-export at 02:00 Europe/Oslo over the March change of clocks: the skipped 02:00 runs at 03:00, when the clock jumps. */
export const ScheduleZone: StoryObj = { name: 'Time zone', render: () => <small.ScheduleZone /> }

/** The app's scheduler is still reading the runs back: the field's own reading shows muted, beside Checking. */
export const ScheduleChecking: StoryObj = { name: 'Schedule checking', render: () => <small.ScheduleChecking /> }

/** The app's scheduler refused the expression: its words are the field's issue, and no runs are listed. */
export const ScheduleRefused: StoryObj = { name: 'Schedule refused', render: () => <small.ScheduleRefused /> }

/** `0 2 L * ?`, the last day of each month: the field reads it in words and counts its runs itself. */
export const ScheduleMonthRules: StoryObj = { name: 'Month rules', render: () => <small.ScheduleMonthRules /> }

/** `0 2 L-3 * ?`, three days before each month's end, read by the app's scheduler and not by the field: the scheduler's runs, no issue, no words. */
export const ScheduleServerSyntax: StoryObj = { name: 'Server syntax', render: () => <small.ScheduleServerSyntax /> }

/** A saved schedule shown with no input: the expression, its reading and its next runs. */
export const ScheduleReadOnly: StoryObj = { name: 'Schedule read only', render: () => <small.ScheduleReadOnly /> }
export const SchedulePaused: StoryObj = { name: 'Schedule paused', render: () => <small.SchedulePaused /> }

/** The same change made to many jobs, every field starting at Leave as is. */
export const BulkEdit: StoryObj = { name: 'Bulk edit', render: () => <forms.BulkEdit /> }

/** Who has the project and how, invites by address as chips, link access, and Copy link. */
export const Share: StoryObj = { name: 'Share', render: () => <flows.Share /> }

/** Two steps for handing a project over: choose the new owner, then confirm what moves to them. */
export const TransferOwnership: StoryObj = { name: 'Transfer ownership', render: () => <danger.TransferOwnership /> }

/** Format, dates and parts, then progress, then a file to download. */
export const Export: StoryObj = { render: () => <flows.ExportRuns /> }

/** A dropped CSV with its columns mapped to fields and a preview, then progress and the rows that failed. */
export const Import: StoryObj = { render: () => <flows.ImportOrders /> }

/** The import's last step: what went in, and each failed row with why. */
export const ImportResult: StoryObj = { name: 'Import result', render: () => <flows.ImportOrders stage="done" /> }

/** A new job in five steps with Back and Next, ending on a review. */
export const Wizard: StoryObj = { render: () => <flows.NewJobWizard /> }

/** Release notes longer than the window: the body scrolls under a footer that stays. */
/** `width="full"`: a tester filling the window but a margin, an editor beside what it gives; `finalFocus={false}` leaves focus where it lands on close. */
export const Workbench: StoryObj = { render: () => <small.Workbench /> }

export const LongContent: StoryObj = { name: 'Long content', render: () => <small.ReleaseNotes /> }

/** A side sheet for editing details in place, with the save bar at its foot. */
export const SideSheet: StoryObj = { name: 'Side sheet', render: () => <forms.DetailsSheet /> }

/** The session ended under a half-written comment: sign in again without leaving, or losing, the page. */
export const SessionExpired: StoryObj = { name: 'Session expired', render: () => <small.SessionExpired /> }
