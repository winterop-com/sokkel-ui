import type { Meta, StoryObj } from '@storybook/react-vite'

import { Code } from '@winterop-com/sokkel-ui/Code'
import { CodeEditor } from '@winterop-com/sokkel-ui/CodeEditor'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { THEMES } from '@winterop-com/sokkel-ui/lib/appearance'

/**
 * Code in the `code-*` tokens: keyword, operator, punctuation, string, regexp, number, constant,
 * comment, function, variable, type, property, tag, attribute, heading, link, inserted, deleted and
 * invalid. Shiki colors `Code` and `Markdown`'s fences from them and CodeMirror colors
 * `CodeEditor` from the same, so code follows the theme and scheme it stands in.
 */
const meta: Meta = { title: 'Foundations/Code colors', parameters: { frame: 'padded' } }
export default meta

const SAMPLES: { language: string; title: string; value: string }[] = [
    {
        language: 'typescript',
        title: 'retry.ts',
        value: `import { type Run, startRun } from './runs'

/** Starts a failed run again from the step that failed. */
export async function retry(run: Run, limit = 3): Promise<Run | null> {
    if (run.state !== 'failed' || run.attempt >= limit) return null
    const from = run.steps.find((step) => step.state === 'failed')?.name ?? 'fetch'
    return startRun({ job: run.job, from, attempt: run.attempt + 1 }) // ${'${run.id}'}
}`,
    },
    {
        language: 'jq',
        title: 'failed.jq',
        value: `# The failed runs of each job, newest first
def failed: select(.state == "failed");
[.runs[] | failed | {job, id: .id, at: .finished_at}]
  | group_by(.job)
  | map({job: .[0].job, count: length, last: (max_by(.at) | .at // null)})
  | .[] | "\\(.job): \\(.count) failed" as $line | $line`,
    },
    {
        language: 'python',
        title: 'digest.py',
        value: `from dataclasses import dataclass

@dataclass
class Digest:
    project: str
    runs: int = 0

    def line(self) -> str:
        """One line for the morning digest."""
        return f"{self.project}: {self.runs} runs" if self.runs else "nothing ran"`,
    },
    {
        language: 'yaml',
        title: 'nightly-export.yaml',
        value: `job: nightly-export
schedule: "0 2 * * *"   # 02:00 UTC
steps:
  - fetch
  - transform
  - name: upload
    retries: 2
    enabled: true`,
    },
    {
        language: 'sql',
        title: 'slow-runs.sql',
        value: `SELECT job, count(*) AS runs, avg(seconds) AS mean
FROM runs
WHERE state = 'succeeded' AND started_at > now() - interval '7 days'
GROUP BY job
HAVING avg(seconds) > 120;`,
    },
    {
        language: 'diff',
        title: 'schedule.diff',
        value: `@@ -1,3 +1,3 @@
 job: nightly-export
-schedule: "0 3 * * *"
+schedule: "0 2 * * *"
 steps:`,
    },
    {
        language: 'html',
        title: 'digest.html',
        value: `<section class="digest" data-project="harbor">
  <h2>Nightly export</h2>
  <a href="https://api.example.org/runs/4812">Run 4812</a>
</section>`,
    },
]

const SETTINGS = `{
  "job": "sync-inventory",
  "schedule": "*/15 * * * *",
  "retries": 2,
  "notify": ["ada", "grace"],
  "paused": false,
  "owner": null
}`

/** The same code in each language the highlighter knows, and an editor beside it, in the theme the toolbar sets. */
export const Languages: StoryObj = {
    name: 'Languages',
    render: () => (
        <Columns min="xl" gap="lg">
            {SAMPLES.map((sample) => (
                <Code key={sample.language} value={sample.value} language={sample.language} title={sample.title} />
            ))}
            <CodeEditor value={SETTINGS} language="json" label="Settings" readOnly />
        </Columns>
    ),
}

/**
 * The same TypeScript and jq in every theme, each tile scoped to its theme with `data-theme-scope`,
 * in the scheme the toolbar sets.
 */
export const EveryTheme: StoryObj = {
    name: 'Every theme',
    render: () => (
        <Columns min="xl" gap="lg">
            {THEMES.map((theme) => (
                <Stack
                    key={theme.value}
                    gap="sm"
                    data-theme-scope={theme.value}
                    className="rounded-surface bg-background p-3 text-foreground"
                >
                    <span className="text-head">{theme.label}</span>
                    <Code value={SAMPLES[0].value} language="typescript" size="sm" />
                    <Code value={SAMPLES[1].value} language="jq" size="sm" />
                </Stack>
            ))}
        </Columns>
    ),
}
