/**
 * The function and variable names DHIS2's expression languages know, as the latest server writes
 * them. A server of another version knows other names: its app passes the names that server has,
 * and a name the editor is not given is still read, as a plain name.
 */

/** The names a DHIS2 server's expression languages know. */
export interface Dhis2Names {
    /**
     * The functions, as the grammar writes them before their `(`: `if`, `sum`, `orgUnit.ancestor`,
     * `d2:hasValue`, and `.periodOffset` for one written after a value.
     */
    functions?: readonly string[]
    /** The program variables written in `V{}`, such as `current_date`. */
    variables?: readonly string[]
}

/** The functions every expression takes: indicators, validation rules, predictors and program indicators. */
const COMMON = [
    'contains',
    'containsItems',
    'firstNonNull',
    'greatest',
    'if',
    'is',
    'isNotNull',
    'isNull',
    'least',
    'log',
    'log10',
    'normDistCum',
    'normDistDen',
    'removeZeros',
    'subExpression',
]

/** The functions that test the organization unit a validation rule or predictor runs for. */
const ORG_UNIT = ['orgUnit.ancestor', 'orgUnit.dataSet', 'orgUnit.group', 'orgUnit.program']

/** The functions that aggregate, in predictors and in program indicators with a custom aggregation. */
const AGGREGATION = ['avg', 'count', 'max', 'median', 'min', 'percentileCont', 'stddev', 'stddevPop', 'stddevSamp', 'sum', 'variance']

/** The functions written after a value or a parenthesis, as `#{uid}.periodOffset(-1)`. */
const AFTER_VALUE = ['.aggregationType', '.maxDate', '.minDate', '.periodOffset', '.stageOffset', '.yearToDate']

/** The program functions of program rules and program indicators. */
const PROGRAM = [
    'd2:addDays',
    'd2:ceil',
    'd2:concatenate',
    'd2:condition',
    'd2:contains',
    'd2:containsItems',
    'd2:count',
    'd2:countIfCondition',
    'd2:countIfValue',
    'd2:countIfZeroPos',
    'd2:daysBetween',
    'd2:exponent',
    'd2:extractDataMatrixValue',
    'd2:floor',
    'd2:hasUserRole',
    'd2:hasValue',
    'd2:inOrgUnitGroup',
    'd2:inUserGroup',
    'd2:lastEventDate',
    'd2:left',
    'd2:length',
    'd2:log',
    'd2:maxValue',
    'd2:minutesBetween',
    'd2:minValue',
    'd2:modulus',
    'd2:monthsBetween',
    'd2:oizp',
    'd2:relationshipCount',
    'd2:right',
    'd2:round',
    'd2:split',
    'd2:substring',
    'd2:validatePattern',
    'd2:weeksBetween',
    'd2:yearsBetween',
    'd2:zing',
    'd2:zpvc',
    'd2:zScoreHFA',
    'd2:zScoreWFA',
    'd2:zScoreWFH',
]

/** Every function the latest server knows, in all its expression languages. */
export const DHIS2_FUNCTIONS: readonly string[] = [...COMMON, ...ORG_UNIT, ...AGGREGATION, ...AFTER_VALUE, ...PROGRAM]

/** Every program variable the latest server knows in `V{}`. */
export const DHIS2_VARIABLES: readonly string[] = [
    'analytics_period_end',
    'analytics_period_start',
    'completed_date',
    'creation_date',
    'current_date',
    'due_date',
    'enrollment_count',
    'enrollment_date',
    'enrollment_id',
    'enrollment_status',
    'environment',
    'event_count',
    'event_date',
    'event_id',
    'event_status',
    'execution_date',
    'incident_date',
    'org_unit',
    'org_unit_count',
    'orgunit_code',
    'program_name',
    'program_stage_id',
    'program_stage_name',
    'scheduled_date',
    'scheduled_event_count',
    'sync_date',
    'tei_count',
    'value_count',
    'zero_pos_value_count',
]
