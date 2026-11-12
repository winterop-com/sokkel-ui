import type { LanguageSupport, StreamParser } from '@codemirror/language'

/**
 * How a package outside the core adds to it: a plugin names what it contributes, and an app installs
 * it once with `registerPlugins` before it draws, after which the core's parts know those
 * contributions by name. The only kind of contribution so far is a `CodeEditor` language.
 */

/**
 * The names the installed plugins' languages go by, for `CodeEditor`'s `language` to accept them. A
 * plugin's package adds its own to this interface:
 *
 *     declare module '@winterop-com/sokkel-ui/lib/plugins' {
 *         interface PluginLanguageNames {
 *             fhirpath: true
 *         }
 *     }
 */
// oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- filled by the plugins' packages
export interface PluginLanguageNames {}

/** A language a plugin gives `CodeEditor`, by its name and the media types it is written in. */
export interface PluginLanguage {
    /** What `CodeEditor`'s `language` calls it. */
    name: string
    /** A CodeMirror `LanguageSupport`, or a stream parser `CodeEditor` builds one from. */
    language: LanguageSupport | (StreamParser<unknown> & { name: string })
    /** The media types `languageForMediaType` reads as this language: exact types, or patterns. */
    mediaTypes?: readonly (string | RegExp)[]
}

/** What a package adds to the core, under its own name. */
export interface SokkelPlugin {
    name: string
    /** Languages `CodeEditor` knows by name once the plugin is installed. */
    languages?: readonly PluginLanguage[]
}

const languages = new Map<string, PluginLanguage>()

/**
 * Installs plugins, once as the app starts and before anything that uses them draws. A plugin
 * installed again, or a language named again, replaces the one before.
 */
export function registerPlugins(plugins: readonly SokkelPlugin[]): void {
    for (const plugin of plugins) for (const language of plugin.languages ?? []) languages.set(language.name, language)
}

/** The installed language of that name, for `CodeEditor`. */
export function pluginLanguage(name: string): PluginLanguage | undefined {
    return languages.get(name)
}

/** The installed language a media type (lower case, without parameters) is written in, for `languageForMediaType`. */
export function pluginLanguageForMediaType(type: string): string | undefined {
    for (const language of languages.values())
        if (language.mediaTypes?.some((given) => (typeof given === 'string' ? given.toLowerCase() === type : given.test(type))))
            return language.name
    return undefined
}
