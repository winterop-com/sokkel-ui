/**
 * Links between notes and tags on them, as linked notes are written: `[[Note]]` links to the note
 * of that name, `[[Note|the words shown]]` shows other words, `[[Note#Heading]]` points at a
 * heading in it, and `#tag` tags the note. `Markdown` draws both as links through its `links`, the
 * code editor completes a link's name as it is typed, and an app reads them back with
 * `wikiLinksIn` and `tagsIn` to list a note's backlinks and its tags. Neither is read inside code.
 */

/** One `[[link]]` in a text: the note it names, the heading after `#`, the words shown after `|`, and where it stands. */
export interface WikiLink {
    /** The note's name, trimmed: `Nightly export` in `[[Nightly export#Steps|the steps]]`. */
    target: string
    heading?: string
    /** The words drawn in the link's place, when they are not the name. */
    label?: string
    /** Where `[[` starts in the text, counted from 0. */
    from: number
    /** Where the text goes on after `]]`. */
    to: number
}

/** A `[[link]]`: anything but brackets and line ends between the double brackets. */
const LINK = /\[\[([^[\]\n]+?)\]\]/g

/** A `#tag`: after the start or a space or an opening mark, letters, digits, `_`, `-` and `/`, at least one of them not a digit. */
const TAG = /(^|[\s([{"'“‘])#([\p{L}\p{N}_/-]*[\p{L}_][\p{L}\p{N}_/-]*)/gu

const blank = (part: string) => ' '.repeat(part.length)

/**
 * The text with its code blanked out, fenced blocks and spans between backticks on one line, so
 * nothing in it is read and every offset still holds.
 */
export function withoutCode(text: string): string {
    let fence: string | null = null
    return text
        .split('\n')
        .map((line) => {
            const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1]
            if (fence === null && marker !== undefined) {
                fence = marker
                return blank(line)
            }
            if (fence !== null) {
                if (marker !== undefined && marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = null
                return blank(line)
            }
            return line.replace(/(`+)[^`]+?\1/g, blank)
        })
        .join('\n')
}

/** One link's inside, `Note#Heading|words`, read into its parts. */
export function readWikiLink(inside: string): Pick<WikiLink, 'target' | 'heading' | 'label'> {
    const bar = inside.indexOf('|')
    const name = bar === -1 ? inside : inside.slice(0, bar)
    const label = bar === -1 ? undefined : inside.slice(bar + 1).trim()
    const hash = name.indexOf('#')
    const target = (hash === -1 ? name : name.slice(0, hash)).trim()
    const heading = hash === -1 ? undefined : name.slice(hash + 1).trim()
    return {
        target,
        ...(heading === undefined || heading === '' ? {} : { heading }),
        ...(label === undefined || label === '' ? {} : { label }),
    }
}

/** Every `[[link]]` in a text outside its code, in order, a link to nowhere (`[[#Heading]]`) left out. */
export function wikiLinksIn(text: string): WikiLink[] {
    const links: WikiLink[] = []
    for (const match of withoutCode(text).matchAll(LINK)) {
        const read = readWikiLink(text.slice(match.index + 2, match.index + match[0].length - 2))
        if (read.target !== '') links.push({ ...read, from: match.index, to: match.index + match[0].length })
    }
    return links
}

/** One `#tag` in a text: the tag without its `#`, and where the `#` stands. */
export interface TagMatch {
    tag: string
    from: number
    to: number
}

/** Every `#tag` in a text outside its code and its links, in order. A heading's `# ` is not a tag, nor is `#1`. */
export function tagMatches(text: string): TagMatch[] {
    const plain = withoutCode(text).replace(LINK, blank)
    return [...plain.matchAll(TAG)].map((match) => {
        const from = match.index + match[1].length
        return { tag: match[2], from, to: from + 1 + match[2].length }
    })
}

/** The tags of a text, each once, in the order they first appear, without their `#`. */
export function tagsIn(text: string): string[] {
    return [...new Set(tagMatches(text).map((match) => match.tag))]
}

/**
 * The places a name is written in a text without being linked: whole words, in any case, outside
 * code and outside `[[links]]`, for the mentions a note could turn into links.
 */
export function mentionsOf(text: string, name: string): { from: number; to: number }[] {
    const needle = name.trim().toLowerCase()
    if (needle === '') return []
    const plain = withoutCode(text).replace(LINK, blank).toLowerCase()
    const found: { from: number; to: number }[] = []
    const word = /[\p{L}\p{N}_]/u
    for (let at = plain.indexOf(needle); at !== -1; at = plain.indexOf(needle, at + needle.length)) {
        const before = plain[at - 1]
        const after = plain[at + needle.length]
        if ((before === undefined || !word.test(before)) && (after === undefined || !word.test(after)))
            found.push({ from: at, to: at + needle.length })
    }
    return found
}

/** The `[[link]]` being typed at the caret, if any: where its name starts and what is typed of it so far. */
export function wikiLinkQuery(text: string, caret: number): { start: number; query: string } | null {
    const line = text.slice(text.lastIndexOf('\n', caret - 1) + 1, caret)
    const open = line.lastIndexOf('[[')
    if (open === -1) return null
    const query = line.slice(open + 2)
    if (/[[\]]/.test(query)) return null
    return { start: caret - query.length, query }
}
