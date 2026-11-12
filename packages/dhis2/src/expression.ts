import type { StreamParser } from '@codemirror/language'
import type { PluginLanguage } from '@winterop-com/sokkel-ui/lib/plugins'

import { DHIS2_FUNCTIONS, type Dhis2Names } from './names'
import { expressionParser, type ExpressionState } from './tokens'

export type { ExpressionState } from './tokens'

/** What `dhis2-expression` is written as. */
export const EXPRESSION_MEDIA_TYPES = ['text/x-dhis2-expression', 'application/x-dhis2-expression'] as const

/**
 * The expression language of indicators, validation rules and predictors, as a CodeMirror stream
 * parser: data items in braces (`#{dataElement.categoryOptionCombo.attributeOptionCombo}` with `*`
 * wildcards, `I{}`, `R{dataSet.REPORTING_RATE}`, `D{}`, `A{}`, `C{}`, `N{}`, `OUG{}`), `[days]`,
 * functions (`if`, `isNull`, `orgUnit.group`, `sum`, `.periodOffset(-1)`), operators, numbers,
 * strings, booleans and block comments. It knows the functions it is given that are not program
 * functions (`d2:`), the latest server's by default; any other name is read as a plain name.
 */
export function dhis2ExpressionParser(names: Dhis2Names = {}): StreamParser<ExpressionState> & { name: string } {
    const functions = (names.functions ?? DHIS2_FUNCTIONS).filter((name) => !name.startsWith('d2:'))
    return expressionParser('dhis2-expression', functions, [])
}

/** The expression language as a plugin's language: `language="dhis2-expression"`, written as `text/x-dhis2-expression`. */
export function dhis2ExpressionLanguage(names: Dhis2Names = {}): PluginLanguage {
    return {
        name: 'dhis2-expression',
        language: dhis2ExpressionParser(names) as StreamParser<unknown> & { name: string },
        mediaTypes: EXPRESSION_MEDIA_TYPES,
    }
}
