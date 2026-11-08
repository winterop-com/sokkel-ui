/**
 * Write docs/components.md, the index of every exported component in the five packages: its
 * package, the path an app imports it by, the first sentence of its doc comment and the story that
 * shows it. Agents working in an app read it to find a part before building one.
 *
 *   bun scripts/components-index.ts          write the index
 *   bun scripts/components-index.ts --check  fail when the index is not what the sources make
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..')
const OUT = join(ROOT, 'docs', 'components.md')
const STORIES = join(ROOT, 'src', 'stories')
const STORYBOOK = 'https://winterop-com.github.io/sokkel-ui/'

export const PACKAGES = ['core', 'charts', 'maps', 'graph', 'terminal'] as const
export type PackageDir = (typeof PACKAGES)[number]

/** The area each core component outside a folder of its own belongs to, by module name. */
const CORE_AREAS: Record<string, string> = {
    // Frame: the app's shell and navigation.
    AccountMenu: 'Frame and navigation',
    AppBar: 'Frame and navigation',
    CommandPalette: 'Frame and navigation',
    Dock: 'Frame and navigation',
    NavBar: 'Frame and navigation',
    Rail: 'Frame and navigation',
    ResizeHandle: 'Frame and navigation',
    Shell: 'Frame and navigation',
    SidePanel: 'Frame and navigation',
    StatusLine: 'Frame and navigation',
    SubNav: 'Frame and navigation',
    TableOfContents: 'Frame and navigation',
    SchemeToggle: 'Frame and navigation',
    ThemePicker: 'Frame and navigation',
    ThemeToggle: 'Frame and navigation',
    TopBar: 'Frame and navigation',
    // Page layout: what a page is arranged with.
    Inspector: 'Page layout',
    Layout: 'Page layout',
    PageHeader: 'Page layout',
    PaneHeader: 'Page layout',
    Section: 'Page layout',
    Toolbar: 'Page layout',
    Unfoldable: 'Page layout',
    GroupLabel: 'Page layout',
    // Forms and inputs.
    AddressInput: 'Forms and inputs',
    AsyncSelect: 'Forms and inputs',
    CapabilityPicker: 'Forms and inputs',
    CheckboxField: 'Forms and inputs',
    ChoiceList: 'Forms and inputs',
    CodeField: 'Forms and inputs',
    CronField: 'Forms and inputs',
    Field: 'Forms and inputs',
    FilterChip: 'Forms and inputs',
    FormBar: 'Forms and inputs',
    InlineField: 'Forms and inputs',
    PeopleFilter: 'Forms and inputs',
    PermissionMatrix: 'Forms and inputs',
    SaveBar: 'Forms and inputs',
    SearchField: 'Forms and inputs',
    SecretReveal: 'Forms and inputs',
    Segmented: 'Forms and inputs',
    SettingRow: 'Forms and inputs',
    SliderField: 'Forms and inputs',
    SwitchField: 'Forms and inputs',
    TextField: 'Forms and inputs',
    TreeSelect: 'Forms and inputs',
    UnsavedChanges: 'Forms and inputs',
    // Data: tables, lists, trees and values.
    ActivityList: 'Data display',
    BarList: 'Data display',
    CheckList: 'Data display',
    ConsequenceList: 'Data display',
    Count: 'Data display',
    DataTable: 'Data display',
    DescriptionList: 'Data display',
    Dot: 'Data display',
    DueText: 'Data display',
    Highlight: 'Data display',
    IssueMark: 'Data display',
    ItemCard: 'Data display',
    JsonTree: 'Data display',
    MetaLine: 'Data display',
    PersonAvatar: 'Data display',
    PersonRow: 'Data display',
    SelectionBar: 'Data display',
    Stat: 'Data display',
    StatusChip: 'Data display',
    StepIndicator: 'Data display',
    Timeline: 'Data display',
    Tree: 'Data display',
    // Actions, dialogs and feedback.
    Banner: 'Actions, dialogs and feedback',
    ConfirmCard: 'Actions, dialogs and feedback',
    CopyButton: 'Actions, dialogs and feedback',
    DialogShell: 'Actions, dialogs and feedback',
    IconButton: 'Actions, dialogs and feedback',
    Loaders: 'Actions, dialogs and feedback',
    Loading: 'Actions, dialogs and feedback',
    PageState: 'Actions, dialogs and feedback',
    Problem: 'Actions, dialogs and feedback',
    SettingsDialog: 'Actions, dialogs and feedback',
    ShortcutsDialog: 'Actions, dialogs and feedback',
    StarButton: 'Actions, dialogs and feedback',
    TypedConfirmDialog: 'Actions, dialogs and feedback',
    // Chat and messaging.
    AssistantReply: 'Chat and messaging',
    ChannelHeader: 'Chat and messaging',
    ChannelList: 'Chat and messaging',
    ChatMessage: 'Chat and messaging',
    Composer: 'Chat and messaging',
    Conversation: 'Chat and messaging',
    MessageComposer: 'Chat and messaging',
    MessageRow: 'Chat and messaging',
    ToolCall: 'Chat and messaging',
    // Files and attachments.
    AttachmentList: 'Files and attachments',
    FileList: 'Files and attachments',
    FilePreview: 'Files and attachments',
    ImageAnnotations: 'Files and attachments',
    ImageLightbox: 'Files and attachments',
    SourceSheet: 'Files and attachments',
    UploadTray: 'Files and attachments',
    // Code, text and documents.
    Code: 'Code, text and documents',
    CodeEditor: 'Code, text and documents',
    DiffView: 'Code, text and documents',
    LogView: 'Code, text and documents',
    Markdown: 'Code, text and documents',
    MermaidDiagram: 'Code, text and documents',
    ProseText: 'Code, text and documents',
}

/** The area of a component in a folder of its own, by the folder's path under the package's sources. */
const FOLDER_AREAS: Record<string, string> = {
    'core:components/board': 'Board',
    'core:components/calendar': 'Calendar',
    'core:components/dashboard': 'Dashboard frame',
    'core:components/media': 'Media',
    'core:components/schema': 'Schema',
    'charts:': 'Charts',
    'charts:dashboard': 'Dashboard chart panels',
    'maps:': 'Maps',
    'graph:': 'Graph',
    'terminal:': 'Terminal',
}

/** The order areas are listed in within a package; an area not named here follows, by name. */
const AREA_ORDER = [
    'Primitives',
    'Frame and navigation',
    'Page layout',
    'Forms and inputs',
    'Data display',
    'Actions, dialogs and feedback',
    'Chat and messaging',
    'Files and attachments',
    'Code, text and documents',
    'Dashboard frame',
    'Board',
    'Calendar',
    'Media',
    'Schema',
    'Charts',
    'Dashboard chart panels',
    'Maps',
    'Graph',
    'Terminal',
]

/** The first sentence of a doc comment's text, on one line. */
export function firstSentence(doc: string): string {
    const text = doc
        .split('\n')
        .map((line) => line.replace(/^\s*\/?\*+\/?\s?/, '').replace(/\s*\*+\/\s*$/, ''))
        .join('\n')
        .split(/\n\s*@/)[0]
        .replace(/\s+/g, ' ')
        .trim()
    // A sentence ends at a stop followed by a capital, a backtick, an opening mark or the end; "e.g. a" does not end one.
    const end = /[.!?](?=\s+[A-Z`*"(_]|\s*$)/.exec(text)
    return end ? text.slice(0, end.index + 1) : text
}

/** The doc comment written right before `index` in `source`, or undefined when none is. */
export function docBefore(source: string, index: number): string | undefined {
    const before = source.slice(0, index).trimEnd()
    if (!before.endsWith('*/')) return undefined
    const start = before.lastIndexOf('/**')
    if (start < 0) return undefined
    return before.slice(start)
}

/** A component name: PascalCase, not a constant written in capitals. */
const isComponentName = (name: string) => /^[A-Z]/.test(name) && /[a-z]/.test(name)

/** The components a module exports, in source order, each with its doc comment. */
export function exportedComponents(source: string): { name: string; doc?: string }[] {
    const found = new Map<string, { index: number; doc?: string }>()
    for (const match of source.matchAll(/^export (?:default )?(?:async )?(?:function|const|class) ([A-Za-z0-9_]+)/gm)) {
        if (isComponentName(match[1])) found.set(match[1], { index: match.index, doc: docBefore(source, match.index) })
    }
    for (const match of source.matchAll(/^export \{([^}]*)\}(?!\s*from)/gm)) {
        for (const part of match[1].split(',')) {
            const spec = part.trim()
            if (spec === '' || spec.startsWith('type ')) continue
            const [local, exported = local] = spec.split(/\s+as\s+/)
            if (!isComponentName(exported) || found.has(exported)) continue
            const declaration = new RegExp(`^(?:function|const|class) ${local}\\b`, 'm').exec(source)
            found.set(exported, {
                index: declaration?.index ?? match.index,
                doc: declaration ? docBefore(source, declaration.index) : undefined,
            })
        }
    }
    return [...found].sort(([, a], [, b]) => a.index - b.index).map(([name, { doc }]) => (doc === undefined ? { name } : { name, doc }))
}

/** PascalCase of a module's file name: `alert-dialog` is `AlertDialog`. */
export function pascal(name: string): string {
    return name
        .split(/[-_]/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')
}

type Exports = Record<string, string | { import?: string }>

/**
 * The path an app imports a source module by, from its package's `exports` map, or undefined when
 * the map does not reach it. `module` is the path under the package's `src`, without its extension.
 */
export function importPath(packageName: string, exports: Exports, module: string): string | undefined {
    let best: { path: string; length: number } | undefined
    for (const [key, target] of Object.entries(exports)) {
        const built = typeof target === 'string' ? target : target.import
        if (built === undefined || !built.startsWith('./dist/') || !built.endsWith('.js')) continue
        const source = built.slice('./dist/'.length, -'.js'.length)
        const star = source.indexOf('*')
        if (star < 0) {
            if (source === module && (best === undefined || source.length > best.length)) {
                best = { path: `${packageName}/${key.slice(2)}`, length: source.length }
            }
            continue
        }
        const prefix = source.slice(0, star)
        const suffix = source.slice(star + 1)
        if (!module.startsWith(prefix) || !module.endsWith(suffix) || module.length < prefix.length + suffix.length) continue
        if (best !== undefined && prefix.length <= best.length) continue
        const middle = module.slice(prefix.length, module.length - suffix.length)
        best = { path: `${packageName}/${key.slice(2).replace('*', middle)}`, length: prefix.length }
    }
    return best?.path
}

/** Storybook's id for a title or a story name: lower case, with a dash for every run of other characters. */
export function sanitize(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/** A story's name from its export name, as Storybook makes it: `LayerPanel` is `Layer Panel`. */
export function storyName(exported: string): string {
    return exported
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
        .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
        .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
        .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
        .trim()
}

/** The id of a story, from its file's title and its export name. */
export function storyId(title: string, exported: string): string {
    return `${sanitize(title)}--${sanitize(storyName(exported))}`
}

interface StoryFile {
    title: string
    /** The first story the file exports, which the link opens. */
    first: string
    /** The library modules it imports, by their import paths. */
    imports: Set<string>
}

/** The library modules a source imports by name. */
export function libraryImports(source: string): string[] {
    return [...source.matchAll(/from '(@winterop-com\/sokkel-ui[^']*)'/g)].map((match) => match[1])
}

/** A story file's title and first story, or undefined when it has no title or no story. */
export function readStoryFile(source: string): { title: string; first: string } | undefined {
    const meta = /^const meta\b[^=]*=\s*\{[\s\S]*?\btitle:\s*'([^']+)'/m.exec(source)
    if (!meta) return undefined
    const first = /^export (?:const|function) ([A-Z]\w*)/m.exec(source)
    if (!first) return undefined
    return { title: meta[1], first: first[1] }
}

/** The library modules a story file draws, its own imports and those of the local files it imports. */
function drawnModules(path: string, seen = new Set<string>()): Set<string> {
    const found = new Set<string>()
    if (seen.has(path)) return found
    seen.add(path)
    const source = readFileSync(path, 'utf8')
    for (const module of libraryImports(source)) found.add(module)
    for (const match of source.matchAll(/from '(\.{1,2}\/[^']+)'/g)) {
        const base = join(dirname(path), match[1])
        const local = [base, `${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')].find(
            (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
        )
        if (local && /\.tsx?$/.test(local)) for (const module of drawnModules(local, seen)) found.add(module)
    }
    return found
}

/** A letter-only key for comparing a component name with a story title: `Data table` and `DataTable` match. */
const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * The story that best shows a module: one whose title names it, then one whose file is named for
 * it, then one whose title is part of its name or holds it, then the story file outside the app
 * compositions that draws it among the fewest library modules.
 */
export function pickStory(module: string, name: string, stories: (StoryFile & { file: string })[]): StoryFile | undefined {
    const showing = stories.filter((story) => story.imports.has(module))
    const score = (story: StoryFile & { file: string }) => {
        const leaf = story.title.split('/').pop() ?? story.title
        if (key(leaf) === key(name)) return 0
        if (key(basename(story.file).replace(/\.stories\.tsx?$/, '')) === key(name)) return 1
        if (key(name).includes(key(leaf)) || key(leaf).includes(key(name))) return 2
        if (story.title.startsWith('Apps/')) return 4
        return 3
    }
    return showing.sort((a, b) => score(a) - score(b) || a.imports.size - b.imports.size || a.title.localeCompare(b.title))[0]
}

function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) return files(path)
        return [path]
    })
}

export interface Entry {
    pkg: string
    area: string
    module: string
    path: string
    names: string[]
    description: string
    story?: string
    /** The component whose story shows this one, when no story imports it directly. */
    via?: string
}

/** The area a module belongs to: its primitive group, its folder's area or its named area. */
function areaOf(pkg: PackageDir, module: string, story: StoryFile | undefined): string {
    if (pkg === 'core' && module.startsWith('components/ui/')) {
        const group = story?.title.startsWith('Primitives/') ? story.title.split('/')[1] : undefined
        return group ? `Primitives: ${group}` : 'Primitives'
    }
    const folder = dirname(module) === '.' ? '' : dirname(module)
    if (pkg === 'core' && folder === 'components') return CORE_AREAS[basename(module)] ?? 'Other'
    return FOLDER_AREAS[`${pkg}:${folder}`] ?? 'Other'
}

/** Every exported component module in the packages, with its import path, description and story. */
export function collect(): Entry[] {
    const stories = files(STORIES)
        .filter((path) => /\.stories\.tsx?$/.test(path))
        .flatMap((path) => {
            const story = readStoryFile(readFileSync(path, 'utf8'))
            return story ? [{ ...story, file: path, imports: drawnModules(path) }] : []
        })
    const entries: Entry[] = []
    for (const pkg of PACKAGES) {
        const dir = join(ROOT, 'packages', pkg)
        const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { name: string; exports: Exports }
        for (const file of files(join(dir, 'src')).sort()) {
            if (!file.endsWith('.tsx') || /\.(test|stories)\.tsx$/.test(file)) continue
            const module = relative(join(dir, 'src'), file).replace(/\.tsx$/, '')
            if (pkg === 'core' && !module.startsWith('components/')) continue
            const source = readFileSync(file, 'utf8')
            const components = exportedComponents(source)
            if (components.length === 0) continue
            const path = importPath(manifest.name, manifest.exports, module)
            if (path === undefined) continue
            const own = pascal(basename(module))
            const main = components.find((component) => component.name === own) ?? components[0]
            const names = [main.name, ...components.filter((component) => component !== main).map((component) => component.name)]
            const doc = main.doc
            const story = pickStory(path, main.name, stories)
            entries.push({
                pkg: manifest.name,
                area: areaOf(pkg, module, story),
                module: `${pkg}:${module}`,
                path,
                names,
                description: doc === undefined ? '' : firstSentence(doc),
                ...(story ? { story: `${STORYBOOK}?path=/story/${storyId(story.title, story.first)}` } : {}),
            })
        }
    }
    // A part no story imports is shown through the component that imports it, at any depth.
    for (let found = true; found;) {
        found = false
        for (const entry of entries.filter((candidate) => candidate.story === undefined)) {
            const leaf = entry.path.split('/').pop()
            const parent = entries.find((other) => {
                if (other === entry || other.story === undefined) return false
                const [pkg, module] = other.module.split(':')
                return readFileSync(join(ROOT, 'packages', pkg, 'src', `${module}.tsx`), 'utf8').includes(`/${leaf}'`)
            })
            if (parent) {
                entry.story = parent.story
                entry.via = parent.via ?? parent.names[0]
                found = true
            }
        }
    }
    return entries
}

const cell = (text: string) => text.replace(/\|/g, '\\|')

/** The index as Markdown: a section per package, a table per area. */
export function render(entries: Entry[]): string {
    const lines = [
        '# Components',
        '',
        '<!-- Generated by scripts/components-index.ts from the packages and the stories. Run `bun run components` to rewrite it; never edit it by hand. -->',
        '',
        'Every exported component in the five sokkel-ui packages, by package and area: the path an app',
        'imports it by, what it is (the first sentence of its doc comment) and a story that shows it. Look',
        'here before building any UI part in an app; a part that is close but not right gets an option in',
        'the library, never a local copy.',
        '',
        'A row is one module. Its first name is the main component; the others are the parts it exports',
        'with it, imported from the same path. Hooks are under `@winterop-com/sokkel-ui/hooks/*` and helpers',
        'under `@winterop-com/sokkel-ui/lib/*`; the chart kinds and the fields they read are in `docs/charts.md`.',
        '',
        'Every app has the same frame: `Shell` with a `Rail` of its places, the command palette on ⌘K or',
        "Ctrl+K through `Shell`'s `palette` (`placeCommands` and `appearanceCommands` in",
        "`@winterop-com/sokkel-ui/lib/commands`), an `AccountMenu` in the rail's foot, `local` until the",
        "app has sign-in, and a `StatusLine` as the shell's `foot`.",
        'The look is kept and worn by `useAppearance` and `useScheme` (`hooks/use-appearance`,',
        '`hooks/use-scheme`), with the option lists in `@winterop-com/sokkel-ui/lib/appearance`.',
        '',
    ]
    const packages = [...new Set(entries.map((entry) => entry.pkg))]
    lines.push(
        ...packages.map((pkg) => `- [\`${pkg}\`](#${sanitize(pkg)}): ${entries.filter((entry) => entry.pkg === pkg).length} modules`),
        '',
    )
    for (const pkg of packages) {
        lines.push(`## ${pkg}`, '')
        const inPackage = entries.filter((entry) => entry.pkg === pkg)
        const rank = (area: string) => {
            const index = AREA_ORDER.indexOf(area.split(':')[0])
            return index < 0 ? AREA_ORDER.length : index
        }
        const areas = [...new Set(inPackage.map((entry) => entry.area))].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
        for (const area of areas) {
            lines.push(`### ${area}`, '', '| Component | Import | What it is | Story |', '| --- | --- | --- | --- |')
            for (const entry of inPackage
                .filter((candidate) => candidate.area === area)
                .sort((a, b) => a.names[0].localeCompare(b.names[0]))) {
                const [main, ...parts] = entry.names
                const names = parts.length > 0 ? `**${main}**, ${parts.join(', ')}` : `**${main}**`
                const story = entry.story ? `[story](${entry.story})${entry.via ? ` (in ${entry.via})` : ''}` : ''
                lines.push(`| ${names} | \`${entry.path}\` | ${cell(entry.description)} | ${story} |`)
            }
            lines.push('')
        }
    }
    return lines.join('\n')
}

if (import.meta.main) {
    const entries = collect()
    const markdown = render(entries)
    const unplaced = entries.filter((entry) => entry.area === 'Other').map((entry) => entry.module)
    if (unplaced.length > 0) {
        console.error(`no area for ${unplaced.join(', ')}: name one in CORE_AREAS or FOLDER_AREAS in scripts/components-index.ts`)
        process.exit(1)
    }
    if (process.argv.includes('--check')) {
        if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== markdown) {
            console.error('docs/components.md is not what the packages and stories make: run bun run components')
            process.exit(1)
        }
        console.log(`docs/components.md matches the packages: ${entries.length} modules`)
    } else {
        writeFileSync(OUT, markdown)
        const undocumented = entries.filter((entry) => entry.description === '').map((entry) => entry.path)
        const unshown = entries.filter((entry) => entry.story === undefined).map((entry) => entry.path)
        console.log(`wrote docs/components.md: ${entries.length} modules`)
        if (undocumented.length > 0) console.log(`without a doc comment: ${undocumented.join(', ')}`)
        if (unshown.length > 0) console.log(`without a story: ${unshown.join(', ')}`)
    }
}
