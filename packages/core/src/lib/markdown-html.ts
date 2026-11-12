import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize'

export { rehypeRaw, rehypeSanitize }

const codeClasses = (defaultSchema.attributes?.code ?? []).filter((entry) => !(Array.isArray(entry) && entry[0] === 'className'))

/**
 * The sanitize schema `Markdown` uses with `allowHtml`: GitHub's, with the classes remark-math puts
 * on its math (`language-math`, `math-inline`, `math-display`) kept, so KaTeX, which runs after it,
 * finds them.
 */
export const markdownSchema: SanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [...codeClasses, ['className', /^language-./, 'math-inline', 'math-display']],
        // The links between notes and the tags Markdown draws with `links`.
        a: [...(defaultSchema.attributes?.a ?? []), 'dataWikiLink', 'dataHeading', 'dataTag'],
        // The placeholder of a part an app embeds, which Markdown fills.
        div: [...(defaultSchema.attributes?.div ?? []), 'dataPart'],
        span: [...(defaultSchema.attributes?.span ?? []), 'dataPart'],
    },
}

/** `markdownSchema` with links of the given schemes kept too, for a text whose `linkSchemes` lists more than GitHub's. */
export function schemaWithSchemes(schemes: readonly string[] | undefined): SanitizeSchema {
    const href = markdownSchema.protocols?.href ?? []
    const extra = (schemes ?? []).filter((scheme) => scheme !== 'relative' && !href.includes(scheme))
    if (extra.length === 0) return markdownSchema
    return { ...markdownSchema, protocols: { ...markdownSchema.protocols, href: [...href, ...extra] } }
}
