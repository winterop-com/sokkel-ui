import type { Meta, StoryObj } from '@storybook/react-vite'

import { DiffView } from '@winterop-com/sokkel-ui/DiffView'
import { CodeBlockCopyButton } from '@winterop-com/sokkel-ui/primitives/code-block'

function ShortDiff() {
    return (
        <DiffView
            title="import-orders.yaml"
            before={`code: import-orders
schedule: every day at 02:00
steps:
  fetch:
    uses: http.get
  validate:
    uses: rows.check
    with: { rules: orders, on_invalid: fail }
`}
            after={`code: import-orders
schedule: every hour
steps:
  fetch:
    uses: http.get
  transform:
    uses: rows.filter
    with: { where: "try_cast(amount as double) is not null" }
  validate:
    uses: rows.check
    with: { rules: orders, on_invalid: warn }
`}
        />
    )
}

/** Two versions of the nightly-export pipeline, changed at its top and its end with a long unchanged middle. */
const PIPELINE_BEFORE = `code: nightly-export
project: harbor
schedule: every day at 02:00
owner: ada
timeout: 45m

defaults:
  retries: 2
  backoff: exponential
  service: worker

steps:
  fetch:
    uses: http.get
    with:
      url: https://api.example.org/v1/orders
      page_size: 500
      since: last_success
    timeout: 10m

  transform:
    uses: rows.map
    with:
      rename: { order_id: id, placed_at: placed }
      drop: [internal_note, legacy_ref]
      currency: from_field
    timeout: 10m

  validate:
    uses: rows.check
    with:
      rules: orders
      on_invalid: fail
      sample: 1000
    timeout: 10m

  upload:
    uses: store.put
    with:
      bucket: harbor-exports
      prefix: nightly/orders
      format: parquet
      compression: zstd
    timeout: 10m

  notify:
    uses: mail.send
    with:
      to: [ada@example.org]
      on: [failed]
`

const PIPELINE_AFTER = `code: nightly-export
project: harbor
schedule: every day at 01:30
owner: ada
timeout: 45m

defaults:
  retries: 3
  backoff: exponential
  service: worker

steps:
  fetch:
    uses: http.get
    with:
      url: https://api.example.org/v1/orders
      page_size: 500
      since: last_success
    timeout: 10m

  transform:
    uses: rows.map
    with:
      rename: { order_id: id, placed_at: placed }
      drop: [internal_note, legacy_ref]
      currency: from_field
    timeout: 10m

  validate:
    uses: rows.check
    with:
      rules: orders
      on_invalid: fail
      sample: 1000
    timeout: 10m

  upload:
    uses: store.put
    with:
      bucket: harbor-exports
      prefix: nightly/orders
      format: parquet
      compression: zstd
    timeout: 10m

  notify:
    uses: mail.send
    with:
      to: [ada@example.org, grace@example.org]
      on: [failed, cancelled]
      subject: nightly-export finished
`

function LongDiff() {
    return (
        <DiffView
            title="nightly-export.yaml"
            before={PIPELINE_BEFORE}
            after={PIPELINE_AFTER}
            actions={<CodeBlockCopyButton value={PIPELINE_AFTER} />}
        />
    )
}

const meta: Meta = { title: 'Patterns/Diff view', parameters: { frame: 'padded' } }
export default meta

/** A job definition before and after an edit: a changed schedule, a new step and a changed rule. */
export const Short: StoryObj = { name: 'Short', render: () => <ShortDiff /> }
/**
 * The nightly-export pipeline before and after an edit at its top and its end. Three lines of context
 * stay around each change and the long unchanged middle folds into a row that opens it on a press; a
 * copy button sits in the header's actions.
 */
export const Long: StoryObj = { name: 'Long', render: () => <LongDiff /> }
/** A pipeline saved without an edit: the header says No changes and every line folds into one row. */
export const Unchanged: StoryObj = {
    name: 'Unchanged',
    render: () => <DiffView title="nightly-export.yaml" before={PIPELINE_BEFORE} after={PIPELINE_BEFORE} />,
}
