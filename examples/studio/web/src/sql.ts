/**
 * A small SQL engine over the simulated tables: one SELECT with joins, a filter, groups, a sort and
 * a limit. Every refusal carries where in the text it is, so the editor marks it.
 */

export type Value = string | number | boolean | null

export interface Table {
    name: string
    description: string
    columns: readonly { name: string; type: 'integer' | 'text' | 'real'; description: string }[]
    rows: readonly Record<string, Value>[]
}

export interface QueryResult {
    columns: string[]
    rows: Value[][]
    ms: number
}

/** A refusal and where it is, as offsets into the query. */
export class SqlError extends Error {
    constructor(
        message: string,
        readonly from: number,
        readonly to: number,
    ) {
        super(message)
    }
}

type TokenType = 'word' | 'number' | 'string' | 'op' | 'end'
interface Token {
    type: TokenType
    text: string
    from: number
    to: number
}

const KEYWORDS = new Set([
    'select',
    'distinct',
    'from',
    'where',
    'group',
    'by',
    'having',
    'order',
    'asc',
    'desc',
    'limit',
    'offset',
    'join',
    'inner',
    'left',
    'outer',
    'on',
    'as',
    'and',
    'or',
    'not',
    'in',
    'like',
    'is',
    'null',
    'true',
    'false',
    'between',
    'case',
    'when',
    'then',
    'else',
    'end',
])

function tokenize(source: string): Token[] {
    const tokens: Token[] = []
    let at = 0
    while (at < source.length) {
        const char = source[at] as string
        if (/\s/.test(char)) {
            at += 1
            continue
        }
        if (source.startsWith('--', at)) {
            const end = source.indexOf('\n', at)
            at = end === -1 ? source.length : end
            continue
        }
        if (source.startsWith('/*', at)) {
            const end = source.indexOf('*/', at + 2)
            if (end === -1) throw new SqlError('This comment is never closed.', at, source.length)
            at = end + 2
            continue
        }
        const from = at
        if (/[A-Za-z_]/.test(char)) {
            while (at < source.length && /\w/.test(source[at] as string)) at += 1
            tokens.push({ type: 'word', text: source.slice(from, at), from, to: at })
        } else if (char === '"') {
            const end = source.indexOf('"', at + 1)
            if (end === -1) throw new SqlError('This name is never closed.', from, source.length)
            at = end + 1
            tokens.push({ type: 'word', text: source.slice(from + 1, end), from, to: at })
        } else if (/\d/.test(char) || (char === '.' && /\d/.test(source[at + 1] ?? ''))) {
            while (at < source.length && /[\d.]/.test(source[at] as string)) at += 1
            tokens.push({ type: 'number', text: source.slice(from, at), from, to: at })
        } else if (char === "'") {
            let text = ''
            at += 1
            for (;;) {
                if (at >= source.length) throw new SqlError('This text is never closed; end it with a quote.', from, source.length)
                if (source[at] === "'") {
                    if (source[at + 1] === "'") {
                        text += "'"
                        at += 2
                        continue
                    }
                    at += 1
                    break
                }
                text += source[at]
                at += 1
            }
            tokens.push({ type: 'string', text, from, to: at })
        } else {
            const two = source.slice(at, at + 2)
            if (['<=', '>=', '<>', '!=', '||'].includes(two)) {
                at += 2
                tokens.push({ type: 'op', text: two, from, to: at })
            } else if ('=<>+-*/%(),.;'.includes(char)) {
                at += 1
                tokens.push({ type: 'op', text: char, from, to: at })
            } else throw new SqlError(`${char} has no meaning here.`, from, from + 1)
        }
    }
    tokens.push({ type: 'end', text: '', from: source.length, to: source.length })
    return tokens
}

type Expr = { from: number; to: number } & (
    | { t: 'lit'; v: Value }
    | { t: 'col'; table?: string; name: string; alias?: string }
    | { t: 'bin'; op: string; l: Expr; r: Expr }
    | { t: 'not'; e: Expr }
    | { t: 'neg'; e: Expr }
    | { t: 'call'; name: string; args: Expr[]; star: boolean; distinct: boolean }
    | { t: 'in'; e: Expr; list: Expr[]; not: boolean }
    | { t: 'like'; e: Expr; pattern: Expr; not: boolean }
    | { t: 'isnull'; e: Expr; not: boolean }
    | { t: 'between'; e: Expr; lo: Expr; hi: Expr; not: boolean }
    | { t: 'case'; whens: { when: Expr; result: Expr }[]; otherwise?: Expr }
)

type Item = { star: true; table?: string; from: number; to: number } | { star: false; e: Expr; name: string }

interface Source {
    table: string
    alias: string
    from: number
    to: number
}

interface Statement {
    distinct: boolean
    items: Item[]
    from: Source
    joins: { source: Source; on: Expr; left: boolean }[]
    where?: Expr
    groupBy: Expr[]
    having?: Expr
    orderBy: { e: Expr; desc: boolean }[]
    limit?: number
    offset?: number
}

const AGGREGATES = new Set(['count', 'sum', 'avg', 'min', 'max'])
const SCALARS = new Set(['lower', 'upper', 'length', 'round', 'abs', 'coalesce', 'substr', 'date', 'replace'])

class Parser {
    private at = 0
    constructor(
        private readonly tokens: Token[],
        private readonly source: string,
    ) {}

    private get token(): Token {
        return this.tokens[this.at] as Token
    }

    private is(word: string): boolean {
        const token = this.token
        return token.type === 'word' ? token.text.toLowerCase() === word : token.type === 'op' && token.text === word
    }

    private take(word: string): boolean {
        if (!this.is(word)) return false
        this.at += 1
        return true
    }

    private expect(word: string, what = word.toUpperCase()): Token {
        const token = this.token
        if (!this.is(word)) throw new SqlError(`Expected ${what} here${token.type === 'end' ? ', at the end' : ''}.`, token.from, token.to)
        this.at += 1
        return token
    }

    private name(what: string): Token {
        const token = this.token
        if (token.type !== 'word' || KEYWORDS.has(token.text.toLowerCase()))
            throw new SqlError(`Expected ${what} here.`, token.from, Math.max(token.to, token.from + 1))
        this.at += 1
        return token
    }

    statement(): Statement {
        if (this.token.type === 'end') throw new SqlError('Write a SELECT to run.', 0, 0)
        this.expect('select', 'SELECT')
        const distinct = this.take('distinct')
        const items: Item[] = []
        do items.push(this.item())
        while (this.take(','))
        this.expect('from', 'FROM')
        const from = this.source_()
        const joins: Statement['joins'] = []
        for (;;) {
            let left = false
            if (this.take('left')) {
                left = true
                this.take('outer')
                this.expect('join', 'JOIN')
            } else if (this.take('inner')) this.expect('join', 'JOIN')
            else if (!this.take('join')) break
            const source = this.source_()
            this.expect('on', 'ON')
            joins.push({ source, on: this.expr(), left })
        }
        const where = this.take('where') ? this.expr() : undefined
        const groupBy: Expr[] = []
        if (this.take('group')) {
            this.expect('by', 'BY')
            do groupBy.push(this.expr())
            while (this.take(','))
        }
        const having = this.take('having') ? this.expr() : undefined
        const orderBy: Statement['orderBy'] = []
        if (this.take('order')) {
            this.expect('by', 'BY')
            do {
                const e = this.expr()
                const desc = this.take('desc')
                if (!desc) this.take('asc')
                orderBy.push({ e, desc })
            } while (this.take(','))
        }
        let limit: number | undefined
        let offset: number | undefined
        if (this.take('limit')) limit = this.count('LIMIT')
        if (this.take('offset')) offset = this.count('OFFSET')
        this.take(';')
        const rest = this.token
        if (rest.type !== 'end')
            throw new SqlError(
                rest.text.toLowerCase() === 'select' ? 'Run one statement at a time.' : `${rest.text} is not expected here.`,
                rest.from,
                rest.to,
            )
        return { distinct, items, from, joins, where, groupBy, having, orderBy, limit, offset }
    }

    private count(what: string): number {
        const token = this.token
        if (token.type !== 'number' || !/^\d+$/.test(token.text)) throw new SqlError(`${what} takes a whole number.`, token.from, token.to)
        this.at += 1
        return Number(token.text)
    }

    private source_(): Source {
        const table = this.name('a table')
        this.take('as')
        const token = this.token
        const alias = token.type === 'word' && !KEYWORDS.has(token.text.toLowerCase()) ? (this.at++, token.text) : table.text
        return { table: table.text.toLowerCase(), alias: alias.toLowerCase(), from: table.from, to: table.to }
    }

    private item(): Item {
        const token = this.token
        if (this.take('*')) return { star: true, from: token.from, to: token.to }
        const next = this.tokens[this.at + 1]
        const after = this.tokens[this.at + 2]
        if (token.type === 'word' && next?.text === '.' && after?.text === '*') {
            this.at += 3
            return { star: true, table: token.text.toLowerCase(), from: token.from, to: after.to }
        }
        const e = this.expr()
        let name = e.t === 'col' ? e.name : this.source.slice(e.from, e.to)
        if (this.take('as')) name = this.name('a name for the column').text
        else if (this.token.type === 'word' && !KEYWORDS.has(this.token.text.toLowerCase())) name = this.name('a name').text
        return { star: false, e, name }
    }

    expr(): Expr {
        let left = this.and()
        while (this.is('or')) {
            this.at += 1
            const right = this.and()
            left = { t: 'bin', op: 'or', l: left, r: right, from: left.from, to: right.to }
        }
        return left
    }

    private and(): Expr {
        let left = this.not()
        while (this.is('and')) {
            this.at += 1
            const right = this.not()
            left = { t: 'bin', op: 'and', l: left, r: right, from: left.from, to: right.to }
        }
        return left
    }

    private not(): Expr {
        const token = this.token
        if (this.take('not')) {
            const e = this.not()
            return { t: 'not', e, from: token.from, to: e.to }
        }
        return this.compare()
    }

    private compare(): Expr {
        const left = this.add()
        const token = this.token
        if (token.type === 'op' && ['=', '!=', '<>', '<', '<=', '>', '>='].includes(token.text)) {
            this.at += 1
            const right = this.add()
            return { t: 'bin', op: token.text === '<>' ? '!=' : token.text, l: left, r: right, from: left.from, to: right.to }
        }
        if (this.take('is')) {
            const not = this.take('not')
            const end = this.expect('null', 'NULL')
            return { t: 'isnull', e: left, not, from: left.from, to: end.to }
        }
        const not = this.take('not')
        if (this.take('like')) {
            const pattern = this.add()
            return { t: 'like', e: left, pattern, not, from: left.from, to: pattern.to }
        }
        if (this.take('in')) {
            this.expect('(', '(')
            const list: Expr[] = []
            do list.push(this.add())
            while (this.take(','))
            const end = this.expect(')', ')')
            return { t: 'in', e: left, list, not, from: left.from, to: end.to }
        }
        if (this.take('between')) {
            const lo = this.add()
            this.expect('and', 'AND')
            const hi = this.add()
            return { t: 'between', e: left, lo, hi, not, from: left.from, to: hi.to }
        }
        if (not) throw new SqlError('Expected LIKE, IN or BETWEEN after NOT.', this.token.from, this.token.to)
        return left
    }

    private add(): Expr {
        let left = this.mul()
        while (this.token.type === 'op' && ['+', '-', '||'].includes(this.token.text)) {
            const op = this.token.text
            this.at += 1
            const right = this.mul()
            left = { t: 'bin', op, l: left, r: right, from: left.from, to: right.to }
        }
        return left
    }

    private mul(): Expr {
        let left = this.unary()
        while (this.token.type === 'op' && ['*', '/', '%'].includes(this.token.text)) {
            const op = this.token.text
            this.at += 1
            const right = this.unary()
            left = { t: 'bin', op, l: left, r: right, from: left.from, to: right.to }
        }
        return left
    }

    private unary(): Expr {
        const token = this.token
        if (this.take('-')) {
            const e = this.unary()
            return { t: 'neg', e, from: token.from, to: e.to }
        }
        return this.primary()
    }

    private primary(): Expr {
        const token = this.token
        const { from, to } = token
        if (token.type === 'number') {
            this.at += 1
            return { t: 'lit', v: Number(token.text), from, to }
        }
        if (token.type === 'string') {
            this.at += 1
            return { t: 'lit', v: token.text, from, to }
        }
        if (this.take('(')) {
            const e = this.expr()
            const end = this.expect(')', ')')
            return { ...e, from, to: end.to }
        }
        if (this.take('null')) return { t: 'lit', v: null, from, to }
        if (this.take('true')) return { t: 'lit', v: true, from, to }
        if (this.take('false')) return { t: 'lit', v: false, from, to }
        if (this.take('case')) {
            const whens: { when: Expr; result: Expr }[] = []
            while (this.take('when')) {
                const when = this.expr()
                this.expect('then', 'THEN')
                whens.push({ when, result: this.expr() })
            }
            if (whens.length === 0) throw new SqlError('CASE takes at least one WHEN.', this.token.from, this.token.to)
            const otherwise = this.take('else') ? this.expr() : undefined
            const end = this.expect('end', 'END')
            return { t: 'case', whens, otherwise, from, to: end.to }
        }
        if (token.type === 'word' && !KEYWORDS.has(token.text.toLowerCase())) {
            this.at += 1
            if (this.take('(')) {
                const name = token.text.toLowerCase()
                if (!AGGREGATES.has(name) && !SCALARS.has(name))
                    throw new SqlError(`No function is named ${token.text}. There are ${[...AGGREGATES, ...SCALARS].join(', ')}.`, from, to)
                const distinct = this.take('distinct')
                const args: Expr[] = []
                let star = false
                if (this.take('*')) star = true
                else if (!this.is(')'))
                    do args.push(this.expr())
                    while (this.take(','))
                const end = this.expect(')', ')')
                return { t: 'call', name, args, star, distinct, from, to: end.to }
            }
            if (this.take('.')) {
                const column = this.name('a column')
                return { t: 'col', table: token.text.toLowerCase(), name: column.text.toLowerCase(), from, to: column.to }
            }
            return { t: 'col', name: token.text.toLowerCase(), from, to }
        }
        throw new SqlError(
            token.type === 'end' ? 'The query ends too soon.' : `${token.text} is not expected here.`,
            from,
            Math.max(to, from + 1),
        )
    }
}

type Row = Record<string, Record<string, Value> | null>
interface Context {
    row: Row
    group?: readonly Row[]
}

function truthy(value: Value): boolean {
    return value !== null && value !== false && value !== 0 && value !== ''
}

function compare(a: Value, b: Value): number {
    if (a === null || b === null) return a === b ? 0 : a === null ? -1 : 1
    if (typeof a === 'number' && typeof b === 'number') return a - b
    const x = Number(a)
    const y = Number(b)
    if (typeof a !== 'string' && typeof b !== 'string' && !Number.isNaN(x) && !Number.isNaN(y)) return x - y
    return String(a).localeCompare(String(b))
}

function hasAggregate(e: Expr | undefined): boolean {
    if (e === undefined) return false
    switch (e.t) {
        case 'call':
            return AGGREGATES.has(e.name) || e.args.some(hasAggregate)
        case 'bin':
            return hasAggregate(e.l) || hasAggregate(e.r)
        case 'not':
        case 'neg':
        case 'isnull':
            return hasAggregate(e.e)
        case 'in':
            return hasAggregate(e.e) || e.list.some(hasAggregate)
        case 'like':
            return hasAggregate(e.e) || hasAggregate(e.pattern)
        case 'between':
            return hasAggregate(e.e) || hasAggregate(e.lo) || hasAggregate(e.hi)
        case 'case':
            return e.whens.some((w) => hasAggregate(w.when) || hasAggregate(w.result)) || hasAggregate(e.otherwise)
        default:
            return false
    }
}

/** Runs a query over the tables. */
export function runQuery(source: string, tables: readonly Table[]): QueryResult {
    const started = performance.now()
    const statement = new Parser(tokenize(source), source).statement()
    const byName = new Map(tables.map((table) => [table.name, table]))
    const sources = [statement.from, ...statement.joins.map((join) => join.source)]
    const scope = new Map<string, Table>()
    for (const one of sources) {
        const table = byName.get(one.table)
        if (table === undefined)
            throw new SqlError(`No table is named ${one.table}. The tables are ${tables.map((t) => t.name).join(', ')}.`, one.from, one.to)
        if (scope.has(one.alias)) throw new SqlError(`${one.alias} names two tables; give one another name.`, one.from, one.to)
        scope.set(one.alias, table)
    }

    // Every column is found before a row is read, so a wrong name is refused on an empty table too.
    const outputNames = new Set(statement.items.flatMap((item) => (item.star ? [] : [item.name.toLowerCase()])))
    const bind = (e: Expr | undefined, allowOutput = false): void => {
        if (e === undefined) return
        switch (e.t) {
            case 'col': {
                if (e.table !== undefined) {
                    const table = scope.get(e.table)
                    if (table === undefined) throw new SqlError(`No table in this query is called ${e.table}.`, e.from, e.to)
                    if (!table.columns.some((c) => c.name === e.name))
                        throw new SqlError(`${table.name} has no column ${e.name}.`, e.from, e.to)
                    e.alias = e.table
                    return
                }
                const owners = [...scope].filter(([, table]) => table.columns.some((c) => c.name === e.name)).map(([alias]) => alias)
                if (owners.length === 1) {
                    e.alias = owners[0]
                    return
                }
                if (owners.length > 1)
                    throw new SqlError(`${e.name} is in ${owners.join(' and ')}; say which, as ${owners[0]}.${e.name}.`, e.from, e.to)
                if (allowOutput && outputNames.has(e.name)) return
                throw new SqlError(`No column is named ${e.name}.`, e.from, e.to)
            }
            case 'bin':
                bind(e.l, allowOutput)
                bind(e.r, allowOutput)
                return
            case 'not':
            case 'neg':
            case 'isnull':
                bind(e.e, allowOutput)
                return
            case 'call':
                for (const arg of e.args) bind(arg, allowOutput)
                return
            case 'in':
                bind(e.e, allowOutput)
                for (const one of e.list) bind(one, allowOutput)
                return
            case 'like':
                bind(e.e, allowOutput)
                bind(e.pattern, allowOutput)
                return
            case 'between':
                bind(e.e, allowOutput)
                bind(e.lo, allowOutput)
                bind(e.hi, allowOutput)
                return
            case 'case':
                for (const w of e.whens) {
                    bind(w.when, allowOutput)
                    bind(w.result, allowOutput)
                }
                bind(e.otherwise, allowOutput)
                return
            default:
                return
        }
    }
    for (const item of statement.items) {
        if (item.star && item.table !== undefined && !scope.has(item.table))
            throw new SqlError(`No table in this query is called ${item.table}.`, item.from, item.to)
        if (!item.star) bind(item.e)
    }
    for (const join of statement.joins) bind(join.on)
    if (hasAggregate(statement.where)) {
        const where = statement.where as Expr
        throw new SqlError('WHERE cannot hold a count or a sum; use HAVING.', where.from, where.to)
    }
    bind(statement.where)
    for (const e of statement.groupBy) bind(e)
    bind(statement.having, true)
    for (const order of statement.orderBy) if (!(order.e.t === 'lit' && typeof order.e.v === 'number')) bind(order.e, true)

    const evaluate = (e: Expr, context: Context, output?: Map<string, Value>): Value => {
        switch (e.t) {
            case 'lit':
                return e.v
            case 'col': {
                if (e.alias === undefined) return output?.get(e.name) ?? null
                const row = context.group === undefined ? context.row : (context.group[0] ?? context.row)
                return row[e.alias]?.[e.name] ?? null
            }
            case 'not':
                return !truthy(evaluate(e.e, context, output))
            case 'neg': {
                const v = evaluate(e.e, context, output)
                return v === null ? null : -Number(v)
            }
            case 'isnull': {
                const isNull = evaluate(e.e, context, output) === null
                return e.not ? !isNull : isNull
            }
            case 'bin': {
                if (e.op === 'and') return truthy(evaluate(e.l, context, output)) && truthy(evaluate(e.r, context, output))
                if (e.op === 'or') return truthy(evaluate(e.l, context, output)) || truthy(evaluate(e.r, context, output))
                const a = evaluate(e.l, context, output)
                const b = evaluate(e.r, context, output)
                if (e.op === '||') return a === null || b === null ? null : `${String(a)}${String(b)}`
                if (a === null || b === null) return null
                switch (e.op) {
                    case '=':
                        return compare(a, b) === 0
                    case '!=':
                        return compare(a, b) !== 0
                    case '<':
                        return compare(a, b) < 0
                    case '<=':
                        return compare(a, b) <= 0
                    case '>':
                        return compare(a, b) > 0
                    case '>=':
                        return compare(a, b) >= 0
                    case '+':
                        return Number(a) + Number(b)
                    case '-':
                        return Number(a) - Number(b)
                    case '*':
                        return Number(a) * Number(b)
                    case '/':
                        return Number(b) === 0 ? null : Number(a) / Number(b)
                    case '%':
                        return Number(b) === 0 ? null : Number(a) % Number(b)
                    default:
                        return null
                }
            }
            case 'in': {
                const v = evaluate(e.e, context, output)
                if (v === null) return null
                const found = e.list.some((one) => compare(v, evaluate(one, context, output)) === 0)
                return e.not ? !found : found
            }
            case 'like': {
                const v = evaluate(e.e, context, output)
                const pattern = evaluate(e.pattern, context, output)
                if (v === null || pattern === null) return null
                const test = new RegExp(
                    `^${String(pattern)
                        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                        .replaceAll('%', '.*')
                        .replaceAll('_', '.')}$`,
                    'is',
                )
                const matched = test.test(String(v))
                return e.not ? !matched : matched
            }
            case 'between': {
                const v = evaluate(e.e, context, output)
                const lo = evaluate(e.lo, context, output)
                const hi = evaluate(e.hi, context, output)
                if (v === null || lo === null || hi === null) return null
                const inside = compare(v, lo) >= 0 && compare(v, hi) <= 0
                return e.not ? !inside : inside
            }
            case 'case': {
                for (const w of e.whens) if (truthy(evaluate(w.when, context, output))) return evaluate(w.result, context, output)
                return e.otherwise === undefined ? null : evaluate(e.otherwise, context, output)
            }
            case 'call': {
                if (AGGREGATES.has(e.name)) {
                    if (context.group === undefined) throw new SqlError(`${e.name} needs a group of rows.`, e.from, e.to)
                    if (e.star) {
                        if (e.name !== 'count') throw new SqlError(`${e.name}(*) means nothing; name a column.`, e.from, e.to)
                        return context.group.length
                    }
                    const arg = e.args[0]
                    if (arg === undefined || e.args.length > 1) throw new SqlError(`${e.name} takes one value.`, e.from, e.to)
                    let values = context.group.map((row) => evaluate(arg, { row })).filter((v): v is Exclude<Value, null> => v !== null)
                    if (e.distinct) values = [...new Map(values.map((v) => [`${typeof v}:${String(v)}`, v])).values()]
                    if (e.name === 'count') return values.length
                    if (values.length === 0) return null
                    if (e.name === 'min') return values.reduce((a, b) => (compare(a, b) <= 0 ? a : b))
                    if (e.name === 'max') return values.reduce((a, b) => (compare(a, b) >= 0 ? a : b))
                    const sum = values.reduce<number>((total, v) => total + Number(v), 0)
                    return e.name === 'sum' ? sum : sum / values.length
                }
                const args = e.args.map((arg) => evaluate(arg, context, output))
                const [first = null, second = null, third = null] = args
                switch (e.name) {
                    case 'coalesce':
                        return args.find((v) => v !== null) ?? null
                    case 'lower':
                        return first === null ? null : String(first).toLowerCase()
                    case 'upper':
                        return first === null ? null : String(first).toUpperCase()
                    case 'length':
                        return first === null ? null : String(first).length
                    case 'abs':
                        return first === null ? null : Math.abs(Number(first))
                    case 'round': {
                        if (first === null) return null
                        const places = second === null ? 0 : Number(second)
                        return Math.round(Number(first) * 10 ** places) / 10 ** places
                    }
                    case 'date':
                        return first === null ? null : String(first).slice(0, 10)
                    case 'substr': {
                        if (first === null) return null
                        const start = Math.max(0, Number(second ?? 1) - 1)
                        return third === null ? String(first).slice(start) : String(first).slice(start, start + Number(third))
                    }
                    case 'replace':
                        return first === null ? null : String(first).replaceAll(String(second ?? ''), String(third ?? ''))
                    default:
                        return null
                }
            }
        }
    }

    // FROM and the joins, as rows keyed by each table's alias.
    const rowsOf = (one: Source) => (scope.get(one.alias) as Table).rows
    let rows: Row[] = rowsOf(statement.from).map((row) => ({ [statement.from.alias]: row }))
    for (const join of statement.joins) {
        const next: Row[] = []
        const right = rowsOf(join.source)
        for (const row of rows) {
            let matched = false
            for (const other of right) {
                const joined = { ...row, [join.source.alias]: other }
                if (truthy(evaluate(join.on, { row: joined }))) {
                    next.push(joined)
                    matched = true
                }
            }
            if (!matched && join.left) next.push({ ...row, [join.source.alias]: null })
        }
        rows = next
    }
    if (statement.where !== undefined) {
        const where = statement.where
        rows = rows.filter((row) => truthy(evaluate(where, { row })))
    }

    // The columns: a star stands for every column of its table, or of every table.
    const aliases = [...scope.keys()]
    const columns: { name: string; value: (context: Context, output: Map<string, Value>) => Value }[] = []
    for (const item of statement.items) {
        if (item.star) {
            for (const alias of item.table === undefined ? aliases : [item.table]) {
                const table = scope.get(alias) as Table
                for (const column of table.columns)
                    columns.push({
                        name: aliases.length > 1 && item.table === undefined ? `${alias}.${column.name}` : column.name,
                        value: (context) => (context.group?.[0] ?? context.row)[alias]?.[column.name] ?? null,
                    })
            }
        } else {
            const e = item.e
            columns.push({ name: item.name, value: (context, output) => evaluate(e, context, output) })
        }
    }

    const grouped =
        statement.groupBy.length > 0 ||
        statement.items.some((item) => !item.star && hasAggregate(item.e)) ||
        hasAggregate(statement.having) ||
        statement.orderBy.some((order) => hasAggregate(order.e))
    let contexts: Context[]
    if (grouped) {
        const groups = new Map<string, Row[]>()
        for (const row of rows) {
            const key = JSON.stringify(statement.groupBy.map((e) => evaluate(e, { row })))
            groups.set(key, [...(groups.get(key) ?? []), row])
        }
        if (statement.groupBy.length === 0 && groups.size === 0) groups.set('[]', [])
        contexts = [...groups.values()].map((group) => ({ row: group[0] ?? {}, group }))
    } else contexts = rows.map((row) => ({ row }))

    let out = contexts.map((context) => {
        const output = new Map<string, Value>()
        const values = columns.map((column) => {
            const value = column.value(context, output)
            output.set(column.name.toLowerCase(), value)
            return value
        })
        return { context, output, values }
    })
    if (statement.having !== undefined) {
        const having = statement.having
        out = out.filter((one) => truthy(evaluate(having, one.context, one.output)))
    }
    if (statement.distinct) {
        const seen = new Set<string>()
        out = out.filter((one) => {
            const key = JSON.stringify(one.values)
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
    }
    if (statement.orderBy.length > 0) {
        const keyed = out.map((one) => ({
            one,
            keys: statement.orderBy.map((order) => {
                const e = order.e
                if (e.t === 'lit' && typeof e.v === 'number') {
                    const index = e.v - 1
                    if (index < 0 || index >= columns.length)
                        throw new SqlError(`There are ${String(columns.length)} columns to sort by.`, e.from, e.to)
                    return one.values[index] ?? null
                }
                return evaluate(e, one.context, one.output)
            }),
        }))
        keyed.sort((a, b) => {
            for (const [index, order] of statement.orderBy.entries()) {
                const by = compare(a.keys[index] ?? null, b.keys[index] ?? null)
                if (by !== 0) return order.desc ? -by : by
            }
            return 0
        })
        out = keyed.map((one) => one.one)
    }
    const start = statement.offset ?? 0
    const sliced = out.slice(start, statement.limit === undefined ? undefined : start + statement.limit)
    return {
        columns: columns.map((column) => column.name),
        rows: sliced.map((one) => one.values),
        ms: performance.now() - started,
    }
}
