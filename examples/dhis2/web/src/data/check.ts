/**
 * What the simulated server says about an expression before running it: whether it reads, whether
 * every item names metadata it holds, and whether the server's version knows every function and
 * variable. Findings carry the span they are about, for the editor to underline.
 */
import { EVALUATED, ExpressionError, parse, walk, type Finding, type ItemKind, type Language, type Node } from './expression'
import { constant, DATA_SETS, dataElement, optionCombo, REPORTING_METRICS } from './metadata'
import { ADDED, LATEST, namesOf, type Version } from './versions'

/** What a check reads besides the expression: the server's version, and a program's rule variables. */
export interface CheckContext {
    version: Version
    /** The program rule variables a rule may name in `#{}` and `A{}`. */
    variables?: readonly string[]
    /** The variables the example evaluates in `V{}`. */
    evaluatedVariables?: readonly string[]
    /** The indicators an expression may name in `N{}`. */
    indicators?: readonly string[]
}

export interface Checked {
    node: Node | null
    findings: Finding[]
}

const since = (name: string, version: Version) =>
    ADDED[name] === undefined ? `this server (${version}) does not know it` : `it came in ${ADDED[name]}; this server runs ${version}`

/** The names an item stands for, as the editor's hover and the expression's description say them. */
export function itemName(kind: ItemKind, body: string): string | undefined {
    if (kind === '#') {
        const [element, combo] = body.split('.')
        const found = dataElement(element)
        if (found === undefined) return undefined
        if (combo === undefined || combo === '*') return found.name
        const comboName = optionCombo(combo)?.name
        return comboName === undefined ? undefined : `${found.name} ${comboName}`
    }
    if (kind === 'C') return constant(body)?.name
    if (kind === 'R') {
        const [set, metric] = body.split('.')
        const found = DATA_SETS.find((one) => one.id === set)
        return found === undefined ? undefined : `${found.name} ${(metric ?? '').toLowerCase().replace(/_/g, ' ')}`
    }
    if (kind === 'days') return 'Days'
    return undefined
}

function checkItem(node: Extract<Node, { type: 'item' }>, language: Language, context: CheckContext, findings: Finding[]) {
    const say = (message: string, tone: Finding['tone'] = 'error') => findings.push({ from: node.from, to: node.to, tone, message })
    const body = node.body.trim()
    if (node.kind === 'days') {
        if (language === 'rule') say('[days] belongs to aggregate expressions, not to program rules.')
        return
    }
    if (node.kind === 'C') {
        if (constant(body) === undefined) say(`No constant has the uid ${body}.`)
        return
    }
    if (language === 'rule') {
        if (node.kind === '#' || node.kind === 'A') {
            if (!(context.variables ?? []).includes(body)) say(`The program has no rule variable named "${body}".`)
            return
        }
        if (node.kind === 'V') {
            const names = namesOf(context.version).variables
            if (!names.includes(body))
                say(
                    namesOf(LATEST).variables.includes(body)
                        ? `V{${body}}: ${since(body, context.version)}.`
                        : `No program variable is called ${body}.`,
                )
            else if (!(context.evaluatedVariables ?? []).includes(body))
                say(`The server knows V{${body}}; this workbench does not try it on the form.`, 'warning')
            return
        }
        say(`${node.kind}{} has no meaning in a program rule.`)
        return
    }
    if (node.kind === '#') {
        const [element, combo, attribute] = body.split('.')
        const found = dataElement(element)
        if (found === undefined) {
            say(`No data element has the uid ${element}.`)
            return
        }
        if (combo !== undefined && combo !== '*') {
            if (optionCombo(combo) === undefined) say(`No category option combo has the uid ${combo}.`)
            else if (!found.categoryCombo.combos.some((one) => one.id === combo))
                say(`${optionCombo(combo)?.name ?? combo} is not one of the combinations ${found.name} is split by.`)
        }
        if (attribute !== undefined && attribute !== '*')
            say('Attribute option combos are not split out on this server; write * or leave it off.', 'warning')
        return
    }
    if (node.kind === 'R') {
        const [set, metric] = body.split('.')
        if (!DATA_SETS.some((one) => one.id === set)) say(`No data set has the uid ${set}.`)
        else if (!(REPORTING_METRICS as readonly string[]).includes(metric ?? ''))
            say(`A reporting rate asks for one of ${REPORTING_METRICS.join(', ')} after its data set.`)
        return
    }
    if (node.kind === 'N') {
        if (!(context.indicators ?? []).includes(body)) say(`No indicator has the uid ${body}.`)
        else say('The server knows this indicator; this workbench does not evaluate one indicator inside another.', 'warning')
        return
    }
    if (node.kind === 'OUG') {
        say('Organization unit groups are not held on this server.')
        return
    }
    if (node.kind === 'I') {
        say('This server holds no program indicators.')
        return
    }
    say(`${node.kind}{} belongs to program expressions, not to aggregate ones.`)
}

function checkCall(
    name: string,
    span: { from: number; to: number },
    count: number,
    language: Language,
    context: CheckContext,
    findings: Finding[],
) {
    const say = (message: string, tone: Finding['tone'] = 'error') => findings.push({ ...span, tone, message })
    if (language === 'expression' && name.startsWith('d2:')) {
        say(`${name} is a program function; it belongs to program rules and program indicators.`)
        return
    }
    const known = namesOf(context.version).functions
    if (!known.includes(name)) {
        say(namesOf(LATEST).functions.includes(name) ? `${name}: ${since(name, context.version)}.` : `No function is called ${name}.`)
        return
    }
    const arity = EVALUATED[name]
    if (arity === undefined) {
        say(`The server knows ${name}; this workbench does not evaluate it.`, 'warning')
        return
    }
    const [min, max] = arity
    if (count < min || count > max)
        say(
            min === max
                ? `${name} takes ${String(min)} ${min === 1 ? 'argument' : 'arguments'}, not ${String(count)}.`
                : max === Infinity
                  ? `${name} takes at least ${String(min)} ${min === 1 ? 'argument' : 'arguments'}.`
                  : `${name} takes ${String(min)} to ${String(max)} arguments, not ${String(count)}.`,
        )
}

/** An expression read and checked: its tree when it reads, and every finding. */
export function check(source: string, language: Language, context: CheckContext): Checked {
    if (source.replace(/\/\*[\s\S]*?\*\//g, '').trim() === '')
        return { node: null, findings: [{ from: 0, to: 0, tone: 'error', message: 'The expression is empty.' }] }
    let node: Node
    try {
        node = parse(source)
    } catch (error) {
        if (error instanceof ExpressionError)
            return {
                node: null,
                findings: [
                    { from: error.span.from, to: Math.max(error.span.to, error.span.from + 1), tone: 'error', message: error.message },
                ],
            }
        throw error
    }
    const findings: Finding[] = []
    walk(node, (one) => {
        if (one.type === 'item') checkItem(one, language, context, findings)
        if (one.type === 'call') checkCall(one.name, one.nameSpan, one.args.length, language, context, findings)
        if (one.type === 'after') {
            checkCall(one.name, one.nameSpan, one.args.length, language, context, findings)
            if (one.name === '.periodOffset' && one.target.type !== 'item' && one.target.type !== 'after')
                findings.push({ ...one.nameSpan, tone: 'error', message: '.periodOffset is written after a data item.' })
        }
        if (one.type === 'name')
            findings.push({ from: one.from, to: one.to, tone: 'error', message: `${one.name} is not a value, an item or a function call.` })
    })
    return { node, findings }
}
