import type { ReactNode } from 'react'

/** A story's page: a title over a graph that takes the rest of the screen. */
export function Stage({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
    return (
        <div className="flex h-svh flex-col gap-3 bg-background p-4 text-foreground md:p-6">
            <header>
                <h1 className="text-page font-medium">{title}</h1>
                {meta !== undefined && <p className="text-sm text-muted-foreground">{meta}</p>}
            </header>
            <div className="flex min-h-0 flex-1 gap-4 max-md:flex-col">{children}</div>
        </div>
    )
}
