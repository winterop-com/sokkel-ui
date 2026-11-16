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

/**
 * What `MermaidDiagram` hands `mermaid.initialize`: the base theme painted with these variables,
 * corners of this radius, strict security, and `MERMAID_SECURE` so the diagram's text cannot
 * restyle it.
 */
export function mermaidConfig(themeVariables: Record<string, string>, radius: string): MermaidConfig {
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
