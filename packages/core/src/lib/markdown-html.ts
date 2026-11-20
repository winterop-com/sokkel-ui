import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from 'rehype-sanitize'

export { rehypeRaw, rehypeSanitize }

const codeClasses = (defaultSchema.attributes?.code ?? []).filter((entry) => !(Array.isArray(entry) && entry[0] === 'className'))

/**
 * The sanitize schema `Markdown` uses with `allowHtml`: GitHub's, with the classes remark-math puts
 * on its math (`language-math`, `math-inline`, `math-display`) kept, so KaTeX, which runs after it,
 * finds them, and the attributes Markdown draws links between notes, callouts, embeds, highlights and
 * parts with.
 */
export const markdownSchema: SanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [...codeClasses, ['className', /^language-./, 'math-inline', 'math-display']],
        // The links between notes and the tags Markdown draws with `links`.
        a: [...(defaultSchema.attributes?.a ?? []), 'dataWikiLink', 'dataHeading', 'dataTag'],
        // The placeholder of a part an app embeds, which Markdown fills, a callout's title and a note's embed.
        div: [...(defaultSchema.attributes?.div ?? []), 'dataPart', 'dataCalloutTitle', 'dataEmbed', 'dataHeading'],
        span: [...(defaultSchema.attributes?.span ?? []), 'dataPart', 'dataEmbed', 'dataHeading'],
        // A callout's kind and fold, and an image embed.
        blockquote: [...(defaultSchema.attributes?.blockquote ?? []), 'dataCallout', 'dataFold'],
        img: [...(defaultSchema.attributes?.img ?? []), 'dataEmbed', 'width', 'height'],
        // A `==highlight==`.
        mark: ['dataMarked'],
        // The words a heading's id is made of, which Markdown takes off after sanitizing.
        ...Object.fromEntries(
            ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => [tag, [...(defaultSchema.attributes?.[tag] ?? []), 'dataHeadingText']]),
        ),
    },
    tagNames: [...(defaultSchema.tagNames ?? []), 'mark'],
}

/** `markdownSchema` with links of the given schemes kept too, for a text whose `linkSchemes` lists more than GitHub's. */
export function schemaWithSchemes(schemes: readonly string[] | undefined): SanitizeSchema {
    const href = markdownSchema.protocols?.href ?? []
    const extra = (schemes ?? []).filter((scheme) => scheme !== 'relative' && !href.includes(scheme))
    if (extra.length === 0) return markdownSchema
    return { ...markdownSchema, protocols: { ...markdownSchema.protocols, href: [...href, ...extra] } }
}
