import type { ReactNode } from 'react'

import { DescriptionList, type Description } from './DescriptionList'
import { PanelSection } from './SidePanel'

/** One titled block of a detail pane: a sentence, the facts, then anything else it shows. */
export interface DetailPaneSection {
    id: string
    title: string
    /** A sentence over the facts, such as who did what. */
    summary?: ReactNode
    /** The thing's facts, its terms beside their values. */
    facts?: readonly Description[]
    /** What follows the facts: a preview, the steps of a run, a change. */
    content?: ReactNode
    /** Small buttons at the end of the section's heading that act on the whole section. */
    actions?: ReactNode
}

export interface DetailPaneProps {
    sections: readonly DetailPaneSection[]
    /** The verbs for the thing on a line after the sections, such as Download and Rename. */
    actions?: ReactNode
    /** How wide each section's term column is: a CSS length, or `auto` for its longest term. */
    termWidth?: string
}

/**
 * One thing's detail as a side panel's tab holds it, such as the run, the file or the event chosen
 * in the page beside it: titled sections one under the other, each with an optional sentence, its
 * facts as terms beside their values, and whatever else it shows after them (a preview, the steps
 * of a run, a change), then the thing's verbs on a line at the end.
 *
 * Every section takes the panel's width and a rule under it, as `PanelSection` draws, and each
 * section's terms line up in one column.
 */
export function DetailPane({ sections, actions, termWidth = 'auto' }: DetailPaneProps) {
    return (
        <>
            {sections.map((section) => (
                <PanelSection key={section.id} title={section.title} actions={section.actions}>
                    {section.summary !== undefined && <p className="text-sm text-pretty">{section.summary}</p>}
                    {section.facts !== undefined && section.facts.length > 0 && (
                        <DescriptionList items={section.facts} termWidth={termWidth} />
                    )}
                    {section.content}
                </PanelSection>
            ))}
            {actions !== undefined && <div className="flex flex-wrap items-stretch gap-2 px-4 py-3">{actions}</div>}
        </>
    )
}
