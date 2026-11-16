import { describe, expect, it } from 'vitest'

import { pluginLanguage, pluginLanguageForMediaType, registerPlugins, type PluginLanguage } from './plugins'

const language = (name: string, mediaTypes?: PluginLanguage['mediaTypes']): PluginLanguage => ({
    name,
    language: { name, token: () => null } as unknown as PluginLanguage['language'],
    mediaTypes,
})

describe('plugins', () => {
    it('takes back the languages a plugin installed again no longer gives', () => {
        registerPlugins([{ name: 'tide', languages: [language('tide-query'), language('tide-rule')] }])
        registerPlugins([{ name: 'other', languages: [language('other-query')] }])
        registerPlugins([{ name: 'tide', languages: [language('tide-query')] }])
        expect(pluginLanguage('tide-query')).toBeDefined()
        expect(pluginLanguage('tide-rule')).toBeUndefined()
        expect(pluginLanguage('other-query')).toBeDefined()
    })

    it('reads a media type by a global pattern the same every time', () => {
        registerPlugins([{ name: 'pattern', languages: [language('tide-pattern', [/^text\/x-tide/g])] }])
        expect(pluginLanguageForMediaType('text/x-tide')).toBe('tide-pattern')
        expect(pluginLanguageForMediaType('text/x-tide')).toBe('tide-pattern')
        expect(pluginLanguageForMediaType('text/x-tide')).toBe('tide-pattern')
    })
})
