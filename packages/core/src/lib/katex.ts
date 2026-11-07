/**
 * The math engine `Markdown` loads the first time a message holds math: remark-math to read it,
 * rehype-katex to draw it, and KaTeX's stylesheet. It is reached only by a dynamic import, so an app
 * that shows no formula fetches none of it, and its CSS carries no KaTeX.
 */
import 'katex/dist/katex.min.css'

import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'

export { rehypeKatex, remarkMath }
