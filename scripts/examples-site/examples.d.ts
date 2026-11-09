/** The examples `scripts/examples-site.ts` found, handed to the index page when it builds it. */
declare module 'virtual:examples' {
    export interface SiteExample {
        /** The example's folder in `examples/`, which is also its folder on the site. */
        id: string
        name: string
        /** What it is, in one line. */
        summary: string
        /** The packages its web app installs, by their short names: core, charts, maps. */
        packages: string[]
        /** Its stills, relative to the index, when the site was built with `--shots`. */
        stills?: { light: string; dark: string }
    }

    const examples: readonly SiteExample[]
    export default examples
}
