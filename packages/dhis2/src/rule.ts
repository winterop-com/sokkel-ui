import type { StreamParser } from '@codemirror/language'
import type { PluginLanguage } from '@winterop-com/sokkel-ui/lib/plugins'

import { DHIS2_FUNCTIONS, DHIS2_VARIABLES, type Dhis2Names } from './names'
import { expressionParser, type ExpressionState } from './tokens'

export type { ExpressionState } from './tokens'

/** What `dhis2-rule` is written as. */
export const RULE_MEDIA_TYPES = ['text/x-dhis2-rule', 'application/x-dhis2-rule'] as const

/**
 * The expression language of program rules and program indicators, as a CodeMirror stream parser:
 * program rule variables `#{name}` and `A{name}` (whose names may hold spaces, dashes and dots),
 * program data `#{stage.dataElement}`, program variables `V{event_date}`, `PS_EVENTDATE:`, program
 * functions (`d2:hasValue`, `d2:daysBetween`), the functions every expression takes, operators,
 * numbers, strings, booleans and block comments. It knows the functions and variables it is given,
 * the latest server's by default; any other name is read as a plain name.
 */
export function dhis2RuleParser(names: Dhis2Names = {}): StreamParser<ExpressionState> & { name: string } {
    return expressionParser('dhis2-rule', names.functions ?? DHIS2_FUNCTIONS, names.variables ?? DHIS2_VARIABLES)
}

/** The program language as a plugin's language: `language="dhis2-rule"`, written as `text/x-dhis2-rule`. */
export function dhis2RuleLanguage(names: Dhis2Names = {}): PluginLanguage {
    return {
        name: 'dhis2-rule',
        language: dhis2RuleParser(names) as StreamParser<unknown> & { name: string },
        mediaTypes: RULE_MEDIA_TYPES,
    }
}
