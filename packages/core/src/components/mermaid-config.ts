import type { MermaidConfig } from 'mermaid'

/**
 * The config keys a diagram's own `%%{init}%%` directive or front matter may not set, at any depth:
 * mermaid's six defaults, then every key that reaches the diagram's CSS (its theme, theme
 * variables, CSS, look and dark mode) and every typeface, size and weight a diagram kind reads.
 */
export const MERMAID_SECURE: readonly string[] = [
    'secure',
    'securityLevel',
    'startOnLoad',
    'maxTextSize',
    'suppressErrorRendering',
    'maxEdges',
    'theme',
    'themeVariables',
    'themeCSS',
    'look',
    'darkMode',
    'fontFamily',
    'altFontFamily',
    'fontSize',
    'fontWeight',
    'fontSizeFactor',
    'labelStyle',
    'titleFontFamily',
    'titleFontSize',
    'actorFont',
    'actorFontFamily',
    'actorFontSize',
    'actorFontWeight',
    'messageFont',
    'messageFontFamily',
    'messageFontSize',
    'messageFontWeight',
    'noteFont',
    'noteFontFamily',
    'noteFontSize',
    'noteFontWeight',
    'taskFontFamily',
    'taskFontSize',
    'boundaryFont',
    'boundaryFontFamily',
    'boundaryFontSize',
    'boundaryFontWeight',
    'componentFont',
    'componentFontFamily',
    'componentFontSize',
    'componentFontWeight',
    'containerFont',
    'containerFontFamily',
    'containerFontSize',
    'containerFontWeight',
    'personFont',
    'personFontFamily',
    'personFontSize',
    'personFontWeight',
    'systemFont',
    'systemFontFamily',
    'systemFontSize',
    'systemFontWeight',
    'usecaseFontFamily',
    'usecaseFontSize',
    'usecaseFontWeight',
]

/** The chart tokens a diagram's plotted series take, in order. */
const SERIES = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5']

/** The colors a pie or an xychart plots with, given each token's color: the chart tokens, in order. */
export interface PlotVariables {
    xyChart: { plotColorPalette: string }
    [pie: `pie${number}`]: string
}

/**
 * The theme variables a pie and an xychart plot with: the chart tokens, in order, where mermaid would
 * otherwise mix pale tints of the primary color that vanish on a light card. A pie's twelve slices
 * start over after the last token.
 */
export function plotVariables(hex: (name: string) => string): PlotVariables {
    const series = SERIES.map(hex)
    const plot: PlotVariables = { xyChart: { plotColorPalette: series.join(', ') } }
    for (let slice = 1; slice <= 12; slice += 1) plot[`pie${slice}`] = series[(slice - 1) % series.length]
    return plot
}

/**
 * What `MermaidDiagram` hands `mermaid.initialize`: the base theme painted with these variables,
 * corners of this radius, strict security, and `MERMAID_SECURE` so the diagram's text cannot
 * restyle it.
 */
export function mermaidConfig(themeVariables: Record<string, unknown>, radius: string): MermaidConfig {
    return {
        startOnLoad: false,
        theme: 'base',
        themeVariables,
        themeCSS: `.node rect, .node polygon, .node circle, .cluster rect { filter: none !important; } .node rect, .cluster rect { rx: ${radius}; ry: ${radius}; }`,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        secure: [...MERMAID_SECURE],
    }
}
