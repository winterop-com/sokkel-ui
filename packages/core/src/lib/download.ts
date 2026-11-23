/** What a file handed over is made of: its bytes, its text, or the address of it (a `data:` or `blob:` URL). */
export type DownloadContent = Blob | string | { href: string }

/** How long a blob address made for a download is kept, in milliseconds, so a large file has time to start. */
const KEPT_FOR = 10_000

/**
 * Hands the person a file to keep under `name`, as the browser's own download does. Text is made a
 * file of `type` (plain UTF-8 text by default, `text/csv;charset=utf-8` for a table); a blob keeps
 * its own type, and `{ href }` hands over a file already at an address, such as a chart's PNG as a
 * `data:` URL. A blob address made here is let go once the download has had time to start.
 */
export function download(name: string, content: DownloadContent, type = 'text/plain;charset=utf-8'): void {
    const made = typeof content === 'string' ? new Blob([content], { type }) : content instanceof Blob ? content : null
    const href = made === null ? (content as { href: string }).href : URL.createObjectURL(made)
    const link = document.createElement('a')
    link.href = href
    link.download = name
    link.rel = 'noopener'
    link.hidden = true
    document.body.append(link)
    link.click()
    link.remove()
    if (made !== null) window.setTimeout(() => URL.revokeObjectURL(href), KEPT_FOR)
}

/**
 * A file name from a title: its letters and digits in lowercase, the rest one dash, with `extension`
 * after it; `fallback` when the title has none.
 */
export function fileName(title: string, extension: string, fallback = 'file'): string {
    const slug = title
        .toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '')
    return `${slug === '' ? fallback : slug}.${extension.replace(/^\./, '')}`
}
