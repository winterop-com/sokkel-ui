/**
 * The simulated server's reading of its two expression languages: a parser for the subset the
 * example runs, a checker that says what is wrong with an expression against the server's metadata
 * and version, and an evaluator. The editor's colors come from the dhis2 package; what an expression
 * means is the server's business, so it lives here, in the example's backend.
 */

export type Language = 'expression' | 'rule'
export type Value = number | string | boolean | null

export interface Span {
    from: number
    to: number
}

export type ItemKind = '#' | 'A' | 'C' | 'R' | 'I' | 'D' | 'N' | 'OUG' | 'V' | 'days'

export type Node = Span &
    (
        | { type: 'number'; value: number }
        | { type: 'string'; value: string }
        | { type: 'boolean'; value: boolean }
        | { type: 'item'; kind: ItemKind; body: string }
        | { type: 'name'; name: string }
        | { type: 'call'; name: string; args: Node[]; nameSpan: Span }
        | { type: 'after'; name: string; target: Node; args: Node[]; nameSpan: Span }
        | { type: 'unary'; op: string; arg: Node }
        | { type: 'binary'; op: string; left: Node; right: Node }
    )

export type ItemNode = Extract<Node, { type: 'item' }>

/** Something wrong with an expression, over the span it is about. */
export interface Finding extends Span {
    tone: 'error' | 'warning'
    message: string
}

export class ExpressionError extends Error {
    constructor(
        message: string,
        readonly span: Span,
    ) {
        super(message)
    }
}

// Tokens

type Token = Span &
    (
        | { kind: 'number'; value: number }
        | { kind: 'string'; value: string }
        | { kind: 'item'; item: ItemKind; body: string }
        | { kind: 'name'; text: string }
        | { kind: 'op'; text: string }
        | { kind: 'end' }
    )

const OPERATORS = ['&&', '||', '==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/', '%', '^', '!', '(', ')', ',', '.']
const ITEM = /^(OUG|[#ACRIDNV])\{/
const NAME = /^(?:d2:)?[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*/
const NUMBER = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/

/** The tokens of an expression, comments and spaces left out. */
export function tokenize(source: string): Token[] {
    const tokens: Token[] = []
    let at = 0
    while (at < source.length) {
        const rest = source.slice(at)
        const space = /^\s+/.exec(rest)
        if (space !== null) {
            at += space[0].length
            continue
        }
        if (rest.startsWith('/*')) {
            const end = source.indexOf('*/', at + 2)
            if (end < 0) throw new ExpressionError('The comment is not closed with */.', { from: at, to: source.length })
            at = end + 2
            continue
        }
        if (rest.startsWith('//')) {
            const end = source.indexOf('\n', at)
            at = end < 0 ? source.length : end
            continue
        }
        const item = ITEM.exec(rest)
        if (item !== null) {
            const end = source.indexOf('}', at)
            const newline = source.indexOf('\n', at)
            if (end < 0 || (newline >= 0 && newline < end))
                throw new ExpressionError(`The braces of ${item[1]}{ are not closed.`, {
                    from: at,
                    to: newline < 0 ? source.length : newline,
                })
            tokens.push({ kind: 'item', item: item[1] as ItemKind, body: source.slice(at + item[0].length, end), from: at, to: end + 1 })
            at = end + 1
            continue
        }
        if (rest.startsWith('[days]')) {
            tokens.push({ kind: 'item', item: 'days', body: '', from: at, to: at + 6 })
            at += 6
            continue
        }
        if (rest[0] === "'" || rest[0] === '"') {
            const quote = rest[0]
            let end = at + 1
            let text = ''
            while (end < source.length && source[end] !== quote) {
                if (source[end] === '\\' && end + 1 < source.length) end += 1
                text += source[end]
                end += 1
            }
            if (end >= source.length) throw new ExpressionError('The text is not closed with its quote.', { from: at, to: source.length })
            tokens.push({ kind: 'string', value: text, from: at, to: end + 1 })
            at = end + 1
            continue
        }
        const number = NUMBER.exec(rest)
        if (number !== null) {
            tokens.push({ kind: 'number', value: Number(number[0]), from: at, to: at + number[0].length })
            at += number[0].length
            continue
        }
        const name = NAME.exec(rest)
        if (name !== null) {
            tokens.push({ kind: 'name', text: name[0], from: at, to: at + name[0].length })
            at += name[0].length
            continue
        }
        const op = OPERATORS.find((one) => rest.startsWith(one))
        if (op === undefined) throw new ExpressionError(`"${rest[0]}" has no meaning here.`, { from: at, to: at + 1 })
        tokens.push({ kind: 'op', text: op, from: at, to: at + op.length })
        at += op.length
    }
    tokens.push({ kind: 'end', from: source.length, to: source.length })
    return tokens
}

// Parsing

const BINARY: Record<string, number> = {
    '||': 1,
    or: 1,
    '&&': 2,
    and: 2,
    '==': 3,
    '!=': 3,
    '<': 4,
    '>': 4,
    '<=': 4,
    '>=': 4,
    '+': 5,
    '-': 5,
    '*': 6,
    '/': 6,
    '%': 6,
    '^': 8,
}

const opText = (token: Token) => (token.kind === 'op' ? token.text : token.kind === 'name' ? token.text : undefined)

/** An expression as a tree; throws an `ExpressionError` where it cannot be read. */
export function parse(source: string): Node {
    const tokens = tokenize(source)
    let at = 0
    const peek = () => tokens[at]
    const next = () => tokens[at++]
    const expect = (text: string, what: string) => {
        const token = peek()
        if (opText(token) !== text)
            throw new ExpressionError(token.kind === 'end' ? `${what} is missing at the end.` : `${what} was expected here.`, token)
        return next()
    }

    function expression(min: number): Node {
        let left = unary()
        for (;;) {
            const token = peek()
            const text = opText(token)
            const precedence = text === undefined ? undefined : BINARY[text]
            if (precedence === undefined || precedence < min) return left
            next()
            const right = expression(text === '^' ? precedence : precedence + 1)
            left = {
                type: 'binary',
                op: text === 'and' ? '&&' : text === 'or' ? '||' : (text as string),
                left,
                right,
                from: left.from,
                to: right.to,
            }
        }
    }

    function unary(): Node {
        const token = peek()
        const text = opText(token)
        if (text === '-' || text === '+' || text === '!' || text === 'not') {
            next()
            const arg = expression(7)
            return { type: 'unary', op: text === 'not' ? '!' : text, arg, from: token.from, to: arg.to }
        }
        return postfix(primary())
    }

    function args(): { args: Node[]; to: number } {
        expect('(', 'An opening parenthesis')
        const list: Node[] = []
        if (opText(peek()) !== ')')
            for (;;) {
                list.push(expression(1))
                if (opText(peek()) !== ',') break
                next()
            }
        const close = expect(')', 'A closing parenthesis')
        return { args: list, to: close.to }
    }

    function postfix(target: Node): Node {
        let node = target
        while (opText(peek()) === '.' && tokens[at + 1]?.kind === 'name') {
            next()
            const name = next() as Extract<Token, { kind: 'name' }>
            const called = args()
            node = {
                type: 'after',
                name: `.${name.text}`,
                target: node,
                args: called.args,
                nameSpan: { from: name.from - 1, to: name.to },
                from: node.from,
                to: called.to,
            }
        }
        return node
    }

    function primary(): Node {
        const token = next()
        switch (token.kind) {
            case 'number':
                return { type: 'number', value: token.value, from: token.from, to: token.to }
            case 'string':
                return { type: 'string', value: token.value, from: token.from, to: token.to }
            case 'item':
                return { type: 'item', kind: token.item, body: token.body, from: token.from, to: token.to }
            case 'name': {
                if (token.text === 'true' || token.text === 'false')
                    return { type: 'boolean', value: token.text === 'true', from: token.from, to: token.to }
                if (opText(peek()) === '(') {
                    const called = args()
                    return {
                        type: 'call',
                        name: token.text,
                        args: called.args,
                        nameSpan: { from: token.from, to: token.to },
                        from: token.from,
                        to: called.to,
                    }
                }
                return { type: 'name', name: token.text, from: token.from, to: token.to }
            }
            case 'op':
                if (token.text === '(') {
                    const inner = expression(1)
                    const close = expect(')', 'A closing parenthesis')
                    return { ...inner, from: token.from, to: close.to }
                }
                throw new ExpressionError(`"${token.text}" cannot start a value.`, token)
            case 'end':
                throw new ExpressionError(at === 1 ? 'The expression is empty.' : 'A value is missing at the end.', token)
        }
    }

    const root = expression(1)
    const left = peek()
    if (left.kind !== 'end')
        throw new ExpressionError('This is left over after the expression ends.', { from: left.from, to: source.length })
    return root
}

/** Every node of a tree, the root first. */
export function walk(node: Node, visit: (node: Node) => void): void {
    visit(node)
    if (node.type === 'call') for (const arg of node.args) walk(arg, visit)
    if (node.type === 'after') {
        walk(node.target, visit)
        for (const arg of node.args) walk(arg, visit)
    }
    if (node.type === 'unary') walk(node.arg, visit)
    if (node.type === 'binary') {
        walk(node.left, visit)
        walk(node.right, visit)
    }
}

// Evaluation

/** What an evaluation reads from outside the expression. */
export interface Scope {
    /** An item's value, the period moved by `offset` months for one written with `.periodOffset`. */
    item(node: ItemNode, offset: number): Value
}

/** The functions the example evaluates, with how many arguments each takes. */
export const EVALUATED: Readonly<Record<string, readonly [number, number]>> = {
    if: [3, 3],
    isNull: [1, 1],
    isNotNull: [1, 1],
    firstNonNull: [1, Infinity],
    greatest: [1, Infinity],
    least: [1, Infinity],
    log: [1, 2],
    log10: [1, 1],
    removeZeros: [1, 1],
    '.periodOffset': [1, 1],
    'd2:hasValue': [1, 1],
    'd2:daysBetween': [2, 2],
    'd2:weeksBetween': [2, 2],
    'd2:monthsBetween': [2, 2],
    'd2:yearsBetween': [2, 2],
    'd2:addDays': [2, 2],
    'd2:ceil': [1, 1],
    'd2:floor': [1, 1],
    'd2:round': [1, 2],
    'd2:concatenate': [1, Infinity],
    'd2:length': [1, 1],
    'd2:left': [2, 2],
    'd2:right': [2, 2],
    'd2:substring': [3, 3],
    'd2:modulus': [2, 2],
    'd2:zing': [1, 1],
    'd2:oizp': [1, 1],
    'd2:validatePattern': [2, 2],
}

const number = (value: Value): number => {
    if (typeof value === 'number') return value
    if (typeof value === 'boolean') return value ? 1 : 0
    if (value === null || value === '') return 0
    const read = Number(value)
    return Number.isNaN(read) ? 0 : read
}

const truthy = (value: Value): boolean => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') return value !== '' && value !== 'false'
    return false
}

const text = (value: Value): string => (value === null ? '' : String(value))

const DAY = 86_400_000
const date = (value: Value): number | null => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text(value))
    return match === null ? null : Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function monthsBetween(from: number, to: number): number {
    const a = new Date(from)
    const b = new Date(to)
    let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth()
    if (b.getUTCDate() < a.getUTCDate()) months -= 1
    return months
}

/** An expression's value in a scope. `missing` and `items` count the data items read and those with no value. */
export function evaluate(node: Node, scope: Scope): { value: Value; items: number; missing: number } {
    let items = 0
    let missing = 0
    let offset = 0

    function item(node: ItemNode): Value {
        const value = scope.item(node, offset)
        if (node.kind === '#' || node.kind === 'R' || node.kind === 'A') {
            items += 1
            if (value === null || value === '') missing += 1
        }
        return value
    }

    function run(node: Node): Value {
        switch (node.type) {
            case 'number':
            case 'string':
            case 'boolean':
                return node.value
            case 'item':
                return item(node)
            case 'name':
                return null
            case 'unary': {
                const value = run(node.arg)
                if (node.op === '!') return !truthy(value)
                if (value === null) return null
                return node.op === '-' ? -number(value) : number(value)
            }
            case 'binary':
                return binary(node.op, node.left, node.right)
            case 'after': {
                if (node.name !== '.periodOffset') return run(node.target)
                const by = number(run(node.args[0]))
                offset += by
                try {
                    return run(node.target)
                } finally {
                    offset -= by
                }
            }
            case 'call':
                return call(node.name, node.args)
        }
    }

    function binary(op: string, leftNode: Node, rightNode: Node): Value {
        if (op === '&&') return truthy(run(leftNode)) ? truthy(run(rightNode)) : false
        if (op === '||') return truthy(run(leftNode)) ? true : truthy(run(rightNode))
        const left = run(leftNode)
        const right = run(rightNode)
        if (op === '==' || op === '!=') {
            const same =
                typeof left === 'number' || typeof right === 'number'
                    ? left !== null && right !== null && number(left) === number(right)
                    : typeof left === 'boolean' || typeof right === 'boolean'
                      ? left !== null && right !== null && truthy(left) === truthy(right)
                      : text(left) === text(right)
            return op === '==' ? same : !same
        }
        if (op === '<' || op === '>' || op === '<=' || op === '>=') {
            if (left === null || right === null) return false
            const [a, b] = typeof left === 'string' && typeof right === 'string' ? [left, right] : [number(left), number(right)]
            return op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b
        }
        if (left === null && right === null) return null
        const a = number(left)
        const b = number(right)
        switch (op) {
            case '+':
                return a + b
            case '-':
                return a - b
            case '*':
                return a * b
            case '/':
                return b === 0 ? null : a / b
            case '%':
                return b === 0 ? null : a % b
            case '^':
                return a ** b
        }
        return null
    }

    function call(name: string, argNodes: Node[]): Value {
        if (name === 'if') return truthy(run(argNodes[0])) ? run(argNodes[1]) : run(argNodes[2])
        if (name === 'd2:hasValue') {
            const arg = argNodes[0]
            const value =
                arg.type === 'string'
                    ? scope.item({ type: 'item', kind: '#', body: arg.value, from: arg.from, to: arg.to }, offset)
                    : run(arg)
            return value !== null && value !== ''
        }
        const args = argNodes.map(run)
        const [first = null, second = null, third = null] = args
        switch (name) {
            case 'isNull':
                return first === null
            case 'isNotNull':
                return first !== null
            case 'firstNonNull':
                return args.find((one) => one !== null) ?? null
            case 'greatest': {
                const present = args.filter((one) => one !== null).map(number)
                return present.length === 0 ? null : Math.max(...present)
            }
            case 'least': {
                const present = args.filter((one) => one !== null).map(number)
                return present.length === 0 ? null : Math.min(...present)
            }
            case 'log':
                return first === null
                    ? null
                    : second === null
                      ? Math.log(number(first))
                      : Math.log(number(first)) / Math.log(number(second))
            case 'log10':
                return first === null ? null : Math.log10(number(first))
            case 'removeZeros':
                return first === null || number(first) === 0 ? null : first
            case 'd2:daysBetween':
            case 'd2:weeksBetween':
            case 'd2:monthsBetween':
            case 'd2:yearsBetween': {
                const from = date(first)
                const to = date(second)
                if (from === null || to === null) return null
                if (name === 'd2:daysBetween') return Math.round((to - from) / DAY)
                if (name === 'd2:weeksBetween') return Math.trunc((to - from) / (7 * DAY))
                const months = monthsBetween(from, to)
                return name === 'd2:monthsBetween' ? months : Math.trunc(months / 12)
            }
            case 'd2:addDays': {
                const from = date(first)
                return from === null ? null : new Date(from + number(second) * DAY).toISOString().slice(0, 10)
            }
            case 'd2:ceil':
                return Math.ceil(number(first))
            case 'd2:floor':
                return Math.floor(number(first))
            case 'd2:round': {
                const places = second === null ? 0 : number(second)
                return Math.round(number(first) * 10 ** places) / 10 ** places
            }
            case 'd2:concatenate':
                return args.map(text).join('')
            case 'd2:length':
                return text(first).length
            case 'd2:left':
                return text(first).slice(0, number(second))
            case 'd2:right':
                return number(second) <= 0 ? '' : text(first).slice(-number(second))
            case 'd2:substring':
                return text(first).slice(number(second), number(third))
            case 'd2:modulus':
                return number(second) === 0 ? null : number(first) % number(second)
            case 'd2:zing':
                return Math.max(0, number(first))
            case 'd2:oizp':
                return number(first) >= 0 ? 1 : 0
            case 'd2:validatePattern': {
                try {
                    return new RegExp(`^(?:${text(second)})$`).test(text(first))
                } catch {
                    return false
                }
            }
        }
        return null
    }

    const value = run(node)
    return { value: typeof value === 'number' && !Number.isFinite(value) ? null : value, items, missing }
}

/** The source with each item written by `name`, as the server describes an expression in words. */
export function describe(source: string, name: (kind: ItemKind, body: string) => string | undefined): string {
    let tokens: Token[]
    try {
        tokens = tokenize(source)
    } catch {
        return source
    }
    let out = ''
    let at = 0
    for (const token of tokens) {
        if (token.kind !== 'item') continue
        const said = name(token.item, token.body)
        if (said === undefined) continue
        out += source.slice(at, token.from) + said
        at = token.to
    }
    return (out + source.slice(at))
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim()
}
