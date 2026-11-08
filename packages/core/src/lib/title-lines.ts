/** How many lines a card's title may take before it is cut short. */
export type TitleLines = 1 | 2 | 3

/** The classes that hold a title to its lines: one line ends in an ellipsis, more are clamped. */
export const TITLE_LINES: Record<TitleLines, string> = {
    1: 'truncate',
    2: 'line-clamp-2 break-words',
    3: 'line-clamp-3 break-words',
}
