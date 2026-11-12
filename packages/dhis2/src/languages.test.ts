import { StringStream, type StreamParser } from '@codemirror/language'
import { languageForMediaType } from '@winterop-com/sokkel-ui/CodeEditor'
import { pluginLanguage, registerPlugins } from '@winterop-com/sokkel-ui/lib/plugins'
import { describe, expect, it } from 'vitest'

import { dhis2ExpressionParser } from './expression'
import { DHIS2_FUNCTIONS, DHIS2_VARIABLES } from './names'
import { dhis2, dhis2Plugin } from './plugin'
import { dhis2RuleParser } from './rule'
import type { ExpressionState } from './tokens'

type Read = [string, string | null][]

/** Each line of `source` as the parser reads it: every token and its tag, whitespace dropped. */
function tokens(parser: StreamParser<ExpressionState>, source: string): Read[] {
    const state = parser.startState!(2)
    return source.split('\n').map((line) => {
        const read: Read = []
        const stream = new StringStream(line, 4, 2)
        while (!stream.eol()) {
            const tag = parser.token(stream, state)
            const text = stream.current()
            if (text.trim() !== '') read.push([text.trim(), tag])
            stream.start = stream.pos
        }
        return read
    })
}

const expression = dhis2ExpressionParser()
const rule = dhis2RuleParser()

const oneLine = (parser: StreamParser<ExpressionState>, source: string): Read => tokens(parser, source)[0]

/** Expressions as a live server holds them: indicators' numerators and denominators, validation rules' sides and a predictor's generator. */
const EXPRESSIONS = [
    '0',
    '#{DTVRnCGamkV}',
    'I{luLGbE2WKGP}',
    '#{DTVRnCGamkV}*3',
    'OUG{oRVt7g429ZO}',
    'AVG(#{MSZuQ1mTsia}*1.5)',
    'AVG((#{eY5ehpbEsB7})*1.5)',
    'D{IpHINAT79UW.bx6fsa0t90x}',
    '#{LhoRsqtRn4r}+#{k1vnEuKnRYE}',
    'AVG(#{BXgDHhPdFVU.J2Qf1jtZuj8})',
    '#{fbfJHSPpUQD}+#{cYeuwXTCPkU}+#{Jtf34kNZhzP}',
    'avg(#{r6nrJANOqMw})+1.5*stddevPop(#{r6nrJANOqMw})',
    '#{R4KStuS8qt7.LbkJRbDblhe} + #{o0fOD1HLuv8.LbkJRbDblhe}',
    '(#{fClA2Erf6IO.Prlt0C1RF0s}+#{fClA2Erf6IO.V6L425pT3A0})',
    '#{bqK6eSIwo3h}+#{yTHydhurQQU}+#{V37YqbqpEhV}+#{SA7WeFZnUci}',
    '#{iuSIObmKutb}+#{nGCLjZDn0Q4}-#{FTINmL2lehN}-#{WVrH6j3Wfye}',
    '#{zzHwXqxKYy1}+#{DUTSJE8MGCw}+#{jWaNoH0X0Am}+#{tbudfYMNFS5}+#{B2ocYtYkPBD}',
    '(#{UOlfIjgN8X6.Prlt0C1RF0s}+#{UOlfIjgN8X6.V6L425pT3A0})*(#{BfMAe6Itzgt.REPORTING_RATE}/100)',
    '(#{s46m5MS0hxu.V6L425pT3A0}+#{s46m5MS0hxu.Prlt0C1RF0s})*(R{BfMAe6Itzgt.REPORTING_RATE}/100)',
    '(#{GCGfEY82Wz6.V6L425pT3A0}+#{GCGfEY82Wz6.Prlt0C1RF0s}+#{GCGfEY82Wz6.psbwp3CQEhs}+#{GCGfEY82Wz6.hEFKSsPV5et})',
    '(#{fClA2Erf6IO.Prlt0C1RF0s}+#{fClA2Erf6IO.V6L425pT3A0})-(#{YtbsuPPo010.Prlt0C1RF0s}+#{YtbsuPPo010.V6L425pT3A0})',
    '((#{fClA2Erf6IO.Prlt0C1RF0s}+#{fClA2Erf6IO.V6L425pT3A0})-(#{n6aMJNLdvep.Prlt0C1RF0s}+#{n6aMJNLdvep.V6L425pT3A0}))',
    '#{gQNFkFkObU8.L4P9VSgHkF6}+#{gQNFkFkObU8.YEmiuCcgNQI}+#{gQNFkFkObU8.Tzg8I9KyEwd}+#{gQNFkFkObU8.PvFFIeF2J9x}+#{gQNFkFkObU8.Gmbgme7z9BF}+#{gQNFkFkObU8.s3jlIgFCbUb}',
    '#{CjLP7zAhlP4.zPpvbvpmkxN}+#{CjLP7zAhlP4.rCMUTmcreqP}+#{CjLP7zAhlP4.TkDhg29x18A}+#{CjLP7zAhlP4.uX9yDetTdOp}+#{CjLP7zAhlP4.LbeIlyHEhKr}+#{CjLP7zAhlP4.qa0VqgYlgtN}+#{CjLP7zAhlP4.GuJESuyOCMW}+#{CjLP7zAhlP4.qNCMOhkoQju}',
    '#{gQNFkFkObU8.AKQ15Z2uqit}+#{gQNFkFkObU8.YEmiuCcgNQI}+#{gQNFkFkObU8.HVFCn1yjoGx}+#{gQNFkFkObU8.CYHGl18lR0W}+#{gQNFkFkObU8.w3BcsdjOcfk}+#{gQNFkFkObU8.L4P9VSgHkF6}+#{gQNFkFkObU8.b19Ye0TWs1D}+#{gQNFkFkObU8.Gmbgme7z9BF}+#{gQNFkFkObU8.Tzg8I9KyEwd}+#{gQNFkFkObU8.s3jlIgFCbUb}+#{gQNFkFkObU8.PvFFIeF2J9x}+#{gQNFkFkObU8.MaXD86iob3M}',
    '#{FUrCpcvMAmC.OrDRjJL9bTS}+#{FUrCpcvMAmC.D9HOVHItnAW}+#{FUrCpcvMAmC.lKQatl72hbs}+#{FUrCpcvMAmC.Qvaa6XQsYJG}+#{FUrCpcvMAmC.RYnkI3dHV2r}+#{FUrCpcvMAmC.R2e7o7AGaZl}+#{FUrCpcvMAmC.ylnUkus0uWL}+#{FUrCpcvMAmC.B0gmWQQnjRB}+#{FUrCpcvMAmC.OkTqmleJPNt}+#{FUrCpcvMAmC.rpnukMmWBmK}+#{FUrCpcvMAmC.TsI6OWSobTy}+#{FUrCpcvMAmC.UwZkJFuoed4}+#{FUrCpcvMAmC.fCEasSwk4iA}+#{FUrCpcvMAmC.fXLSLTafPAa}+#{FUrCpcvMAmC.TW3dSLS3Yez}',
    '(#{lVsbKXoF0zX.hEFKSsPV5et} * 1.0) + (#{lVsbKXoF0zX.Prlt0C1RF0s} * 1.0) + (#{lVsbKXoF0zX.psbwp3CQEhs} * 1.0) + (#{lVsbKXoF0zX.V6L425pT3A0} * 1.0) + (#{qPVDd87kS9Z.hEFKSsPV5et} * 1.0) + (#{qPVDd87kS9Z.Prlt0C1RF0s} * 1.0) + (#{qPVDd87kS9Z.psbwp3CQEhs} * 1.0) + (#{qPVDd87kS9Z.V6L425pT3A0} * 1.0) + (#{pnL2VG8Bn7N.hEFKSsPV5et} * 1.0) + (#{pnL2VG8Bn7N.Prlt0C1RF0s} * 1.0) + (#{pnL2VG8Bn7N.psbwp3CQEhs} * 1.0) + (#{pnL2VG8Bn7N.V6L425pT3A0} * 1.0)',
]

/** Program indicators' expressions and filters, program rules' conditions and their actions' data, as a live server holds them. */
const RULES = [
    'true',
    '!#{smoking}',
    '#{TestedBy}',
    'V{environment}',
    'V{event_count}',
    "A{Sex} == 'MALE'",
    'V{value_count}>0',
    "#{TestedBy} == ''",
    '#{apgarscore} > 7',
    '#{hemoglobin} < 9',
    '#{indexcase} != 1',
    'V{org_unit_count}',
    "d2:hasValue('lmp')",
    'V{enrollment_count}',
    "V{environment} != ''",
    '! #{HHFeverPastMonth}',
    "#{TestedBy} != 'OTHER'",
    "#{allergies} !== 'Yes'",
    "A{cejWyOfXge6} == 'Female'",
    'd2:hasValue(V{event_date})',
    "#{Diagnosis_Method} !='RDT'",
    "'\\n**Expression** for value'",
    '#{Zj7UnCAulEk.qrur9Dvnyt5} <= 5',
    "V{enrollment_status} == 'ACTIVE'",
    "d2:hasValue('TestedBy') && false",
    "#{Diagnosis_Method}!='Microscope'",
    "V{environment} == 'AndroidClient'",
    "V{program_stage_id} =='CWaAcQYKVpq'",
    "V{program_stage_id} == 'CWaAcQYKVpq'",
    'd2:weeksBetween(#{lmp},V{event_date})',
    "#{hYyB7FUS5eR.aY4kB8kS521}=='POSITIVE'",
    "d2:validatePattern(A{mobile} ,'.*555.*')",
    'd2:yearsBetween(A{born},V{current_date})',
    "#{Symptoms} == 'NO'  || #{Symptoms} == ''",
    "#{apgarscore} <0 && #{apgarcomment} == ''",
    'd2:daysBetween(A{iESIqZ0R0R0},V{event_date})',
    "d2:concatenate(#{diastolicbloodpressure},'%')",
    'd2:daysBetween(V{event_date},V{current_date})',
    'd2:yearsBetween(A{iESIqZ0R0R0},V{event_date})',
    'd2:daysBetween(V{enrollment_date},V{event_date})',
    'd2:monthsBetween(A{BiTsLcJQ95V},V{current_date})',
    'd2:yearsBetween(A{BiTsLcJQ95V}, V{current_date})',
    'd2:yearsBetween(A{BiTsLcJQ95V},V{current_date})<1',
    "d2:hasValue('TestedBy') && #{MalariaSpecies} == ''",
    "d2:hasValue('TestedBy') && #{MalariaTestResult} ==''",
    '#{ZzYYXq4fJie.FqlgKAG8HOu} + #{ZzYYXq4fJie.rxBfISxXS2U}',
    '#{ZzYYXq4fJie.GQY2lXrypjO} - #{A03MvHHogjR.UXz7xuGCEhU}',
    'd2:yearsBetween(A{BiTsLcJQ95V},V{current_date}) > 0\n\n\t\t\t',
    "d2:countIfCondition(#{edqlbukwRfQ.vANAXwtLwcT}, '< 11') > 0",
    "d2:hasValue('lmp') && d2:daysBetween(#{lmp},V{event_date}) <= 0",
    '#{edqlbukwRfQ.vANAXwtLwcT} < 11 and #{WZbXY0S00lP.vANAXwtLwcT} > 11',
    'd2:daysBetween(#{Zj7UnCAulEk.eMyVanycQSC},#{Zj7UnCAulEk.msodh3rEMJa})',
    "#{Zj7UnCAulEk.oZg33kd9taw} == 'Male' and #{Zj7UnCAulEk.qrur9Dvnyt5} <= 5",
    "d2:hasValue('HHMalariaPositive')  && #{HHMalariaPositive} > #{HHMalariaTest}",
    "#{hYyB7FUS5eR.qdjVZojEK8S} == 'RDT' and #{hYyB7FUS5eR.aY4kB8kS521} =='POSITIVE'",
    "d2:hasValue('streetAddress') && !d2:validatePattern(A{streetAddress},'[\\\\w ]+ \\\\d+')",
    'sum(#{Zj7UnCAulEk.vV9UWAZohSf} *#{Zj7UnCAulEk.GieVkTxp4HH}) + avg(#{Zj7UnCAulEk.qrur9Dvnyt5})',
    "#{CaseDetection}  ==  ''  || #{CaseDetection}  == 'PASSIVE'  || #{CaseDetection} == 'REACTIVE'",
    '(d2:yearsBetween(A{born},V{current_date}) < 12) ||  (d2:yearsBetween(A{born},V{current_date}) > 50)',
    'V{program_stage_id} == hYyB7FUS5eR && ( d2:daysBetween(V{event_date},#{wYTF0YCHMWr.AZLp9Shoab9})  <= 1 )',
    "d2:hasValue('lmp') && d2:hasValue('duedateclinical') && (d2:daysBetween(#{lmp},#{duedateclinical}) < 250) ",
    '(#{FociMixedPos} + #{FociPfPos} + #{FociPkPos} + #{FociPmPos} + #{FociPoPos} + #{FociPvPos}) > #{FociMalariaPos}',
    "d2:concatenate(d2:weeksBetween(#{lmp}, V{current_date}), '+', d2:modulus(d2:daysBetween(#{lmp}, V{current_date}), 7))",
    "#{hYyB7FUS5eR.qdjVZojEK8S} == 'MICROSCOPY' and #{hYyB7FUS5eR.aY4kB8kS521} =='POSITIVE' and #{hYyB7FUS5eR.vGxpKVMkmaW} == 'PF'",
    "d2:hasValue('travel_last_12_months')  && (#{travel_to_6weeks} ==''   &&  #{travel_to_2weeks} == ''   &&  #{travel_to_12months} =='')",
    "(#{A03MvHHogjR.bx6fsa0t90x} +  #{A03MvHHogjR.FqlgKAG8HOu} + #{A03MvHHogjR.rxBfISxXS2U}) * d2:condition('#{A03MvHHogjR.a3kGcGDCuk6} >= 2',1,2)",
]

describe('the expression language', () => {
    it('reads data elements with and without disaggregations, and the wildcard', () => {
        expect(oneLine(expression, '#{FH8ab5Rog83} + #{FH8ab5Rog83.*.lTHuSO6awqE} - #{w1G4l0cSxOi.mPBwiaWc2sk.*}')).toEqual([
            ['#{', 'variableName.special'],
            ['FH8ab5Rog83', 'variableName.special'],
            ['}', 'variableName.special'],
            ['+', 'operator'],
            ['#{', 'variableName.special'],
            ['FH8ab5Rog83', 'variableName.special'],
            ['.', 'punctuation'],
            ['*', 'atom'],
            ['.', 'punctuation'],
            ['lTHuSO6awqE', 'variableName.special'],
            ['}', 'variableName.special'],
            ['-', 'operator'],
            ['#{', 'variableName.special'],
            ['w1G4l0cSxOi', 'variableName.special'],
            ['.', 'punctuation'],
            ['mPBwiaWc2sk', 'variableName.special'],
            ['.', 'punctuation'],
            ['*', 'atom'],
            ['}', 'variableName.special'],
        ])
    })

    it('reads every kind of item, a reporting rate metric, group tags and the period counts', () => {
        expect(oneLine(expression, 'R{BfMAe6Itzgt.REPORTING_RATE} * C{bCqvfPR02Im} / OUG{oRVt7g429ZO} + [days]')).toEqual([
            ['R{', 'variableName.special'],
            ['BfMAe6Itzgt', 'variableName.special'],
            ['.', 'punctuation'],
            ['REPORTING_RATE', 'atom'],
            ['}', 'variableName.special'],
            ['*', 'operator'],
            ['C{', 'variableName.special'],
            ['bCqvfPR02Im', 'variableName.special'],
            ['}', 'variableName.special'],
            ['/', 'operator'],
            ['OUG{', 'variableName.special'],
            ['oRVt7g429ZO', 'variableName.special'],
            ['}', 'variableName.special'],
            ['+', 'operator'],
            ['[days]', 'variableName.special'],
        ])
        expect(oneLine(expression, '#{deGroup:oDkJh5Ddh7d.coGroup:OK2Nr4wdfrZ&cSLqvJ5wR2x}').map(([, tag]) => tag)).toEqual([
            'variableName.special',
            'keyword',
            'variableName.special',
            'punctuation',
            'keyword',
            'variableName.special',
            'punctuation',
            'variableName.special',
            'variableName.special',
        ])
        for (const item of ['I{luLGbE2WKGP}', 'N{Uvn6LCg7dVU}', 'D{IpHINAT79UW.bx6fsa0t90x}', 'A{IpHINAT79UW.w75KJ2mc4zz}'])
            expect(oneLine(expression, item).every(([, tag]) => tag === 'variableName.special' || tag === 'punctuation')).toBe(true)
    })

    it('reads functions, the dotted ones, and those written after a value', () => {
        expect(oneLine(expression, 'if(isNull(#{a}), 0, #{a}.periodOffset(-1)) && orgUnit.group(CXw2yu5fodb)')).toEqual([
            ['if', 'variableName.function'],
            ['(', 'bracket'],
            ['isNull', 'variableName.function'],
            ['(', 'bracket'],
            ['#{', 'variableName.special'],
            ['a', 'variableName.special'],
            ['}', 'variableName.special'],
            [')', 'bracket'],
            [',', 'punctuation'],
            ['0', 'number'],
            [',', 'punctuation'],
            ['#{', 'variableName.special'],
            ['a', 'variableName.special'],
            ['}', 'variableName.special'],
            ['.', 'punctuation'],
            ['periodOffset', 'variableName.function'],
            ['(', 'bracket'],
            ['-', 'operator'],
            ['1', 'number'],
            [')', 'bracket'],
            [')', 'bracket'],
            ['&&', 'operator'],
            ['orgUnit.group', 'variableName.function'],
            ['(', 'bracket'],
            ['CXw2yu5fodb', 'variableName'],
            [')', 'bracket'],
        ])
    })

    it('reads an aggregation type, dates, a count of distinct values and is ... in', () => {
        expect(oneLine(expression, '#{a}.aggregationType(LAST).minDate(2021-1-1) + count(distinct #{b}) + is(#{c} in 1, 2)')).toEqual([
            ['#{', 'variableName.special'],
            ['a', 'variableName.special'],
            ['}', 'variableName.special'],
            ['.', 'punctuation'],
            ['aggregationType', 'variableName.function'],
            ['(', 'bracket'],
            ['LAST', 'atom'],
            [')', 'bracket'],
            ['.', 'punctuation'],
            ['minDate', 'variableName.function'],
            ['(', 'bracket'],
            ['2021-1-1', 'number'],
            [')', 'bracket'],
            ['+', 'operator'],
            ['count', 'variableName.function'],
            ['(', 'bracket'],
            ['distinct', 'keyword'],
            ['#{', 'variableName.special'],
            ['b', 'variableName.special'],
            ['}', 'variableName.special'],
            [')', 'bracket'],
            ['+', 'operator'],
            ['is', 'variableName.function'],
            ['(', 'bracket'],
            ['#{', 'variableName.special'],
            ['c', 'variableName.special'],
            ['}', 'variableName.special'],
            ['in', 'keyword'],
            ['1', 'number'],
            [',', 'punctuation'],
            ['2', 'number'],
            [')', 'bracket'],
        ])
    })

    it('reads literals, keywords, operators and numbers with exponents', () => {
        expect(oneLine(expression, `not true or null == "a\\"b" and 'c' != 1.5e3 ^ .5 % 2`)).toEqual([
            ['not', 'keyword'],
            ['true', 'bool'],
            ['or', 'keyword'],
            ['null', 'null'],
            ['==', 'operator'],
            ['"a\\"b"', 'string'],
            ['and', 'keyword'],
            ["'c'", 'string'],
            ['!=', 'operator'],
            ['1.5e3', 'number'],
            ['^', 'operator'],
            ['.5', 'number'],
            ['%', 'operator'],
            ['2', 'number'],
        ])
        expect(oneLine(expression, "#{a} == 'open")).toEqual([
            ['#{', 'variableName.special'],
            ['a', 'variableName.special'],
            ['}', 'variableName.special'],
            ['==', 'operator'],
            ["'open", 'invalid'],
        ])
    })

    it('reads a block comment across lines', () => {
        expect(tokens(expression, '#{a} /* the first\nand the second */ + 1')).toEqual([
            [
                ['#{', 'variableName.special'],
                ['a', 'variableName.special'],
                ['}', 'variableName.special'],
                ['/* the first', 'comment'],
            ],
            [
                ['and the second */', 'comment'],
                ['+', 'operator'],
                ['1', 'number'],
            ],
        ])
    })

    it('ends a data item left open with its line', () => {
        expect(tokens(expression, '#{a\n1')).toEqual([
            [
                ['#{', 'variableName.special'],
                ['a', 'variableName.special'],
            ],
            [['1', 'number']],
        ])
    })

    it('leaves the program functions to the program language', () => {
        expect(oneLine(expression, 'd2:zing(1)')[0]).toEqual(['d2:zing', 'variableName'])
        expect(oneLine(rule, 'd2:zing(1)')[0]).toEqual(['d2:zing', 'variableName.function'])
    })

    it('reads every expression a live server holds without an invalid token', () => {
        for (const source of EXPRESSIONS)
            expect(
                tokens(expression, source)
                    .flat()
                    .filter(([, tag]) => tag === 'invalid'),
                source,
            ).toEqual([])
    })
})

describe('the program language', () => {
    it('reads program rule variables, attributes, program variables and program functions', () => {
        expect(oneLine(rule, "d2:hasValue('lmp') && d2:daysBetween(#{lmp},V{event_date}) <= 0")).toEqual([
            ['d2:hasValue', 'variableName.function'],
            ['(', 'bracket'],
            ["'lmp'", 'string'],
            [')', 'bracket'],
            ['&&', 'operator'],
            ['d2:daysBetween', 'variableName.function'],
            ['(', 'bracket'],
            ['#{', 'variableName.special'],
            ['lmp', 'variableName.special'],
            ['}', 'variableName.special'],
            [',', 'punctuation'],
            ['V{', 'variableName.special'],
            ['event_date', 'variableName.special'],
            ['}', 'variableName.special'],
            [')', 'bracket'],
            ['<=', 'operator'],
            ['0', 'number'],
        ])
    })

    it('reads a variable name with spaces and dashes, and a program stage date', () => {
        expect(oneLine(rule, '!#{blood pressure-high} || d2:daysBetween(V{enrollment_date}, PS_EVENTDATE:A03MvHHogjR) > 7')).toEqual([
            ['!', 'operator'],
            ['#{', 'variableName.special'],
            ['blood', 'variableName.special'],
            ['pressure-high', 'variableName.special'],
            ['}', 'variableName.special'],
            ['||', 'operator'],
            ['d2:daysBetween', 'variableName.function'],
            ['(', 'bracket'],
            ['V{', 'variableName.special'],
            ['enrollment_date', 'variableName.special'],
            ['}', 'variableName.special'],
            [',', 'punctuation'],
            ['PS_EVENTDATE:', 'keyword'],
            ['A03MvHHogjR', 'variableName'],
            [')', 'bracket'],
            ['>', 'operator'],
            ['7', 'number'],
        ])
    })

    it('reads a function or a variable it was not given as a plain name, never as an error', () => {
        const older = dhis2RuleParser({ functions: ['d2:hasValue'], variables: ['current_date'] })
        expect(oneLine(older, 'd2:hasValue(#{a}) && d2:inUserGroup(#{b}) && V{current_date} > V{analytics_period_end}')).toEqual([
            ['d2:hasValue', 'variableName.function'],
            ['(', 'bracket'],
            ['#{', 'variableName.special'],
            ['a', 'variableName.special'],
            ['}', 'variableName.special'],
            [')', 'bracket'],
            ['&&', 'operator'],
            ['d2:inUserGroup', 'variableName'],
            ['(', 'bracket'],
            ['#{', 'variableName.special'],
            ['b', 'variableName.special'],
            ['}', 'variableName.special'],
            [')', 'bracket'],
            ['&&', 'operator'],
            ['V{', 'variableName.special'],
            ['current_date', 'variableName.special'],
            ['}', 'variableName.special'],
            ['>', 'operator'],
            ['V{', 'variableName.special'],
            ['analytics_period_end', 'variableName'],
            ['}', 'variableName.special'],
        ])
        expect(oneLine(rule, 'd2:newerThanThis(V{newer_than_this})').map(([, tag]) => tag)).toEqual([
            'variableName',
            'bracket',
            'variableName.special',
            'variableName',
            'variableName.special',
            'bracket',
        ])
    })

    it('reads every program expression, filter and condition a live server holds without an invalid token', () => {
        for (const source of RULES)
            expect(
                tokens(rule, source)
                    .flat()
                    .filter(([, tag]) => tag === 'invalid'),
                source,
            ).toEqual([])
    })
})

describe('the names', () => {
    it('hold the latest functions and program variables, each once', () => {
        expect(new Set(DHIS2_FUNCTIONS).size).toBe(DHIS2_FUNCTIONS.length)
        expect(new Set(DHIS2_VARIABLES).size).toBe(DHIS2_VARIABLES.length)
        expect(DHIS2_FUNCTIONS).toEqual(expect.arrayContaining(['if', 'orgUnit.ancestor', 'percentileCont', '.yearToDate', 'd2:zScoreWFH']))
        expect(DHIS2_VARIABLES).toEqual(expect.arrayContaining(['current_date', 'event_date', 'enrollment_date', 'incident_date']))
    })
})

describe('the plugin', () => {
    it('gives the editor both languages by name and by media type once installed', () => {
        expect(languageForMediaType('text/x-dhis2-expression')).toBe('text')
        registerPlugins([dhis2])
        expect(pluginLanguage('dhis2-expression')?.name).toBe('dhis2-expression')
        expect(pluginLanguage('dhis2-rule')?.name).toBe('dhis2-rule')
        expect(languageForMediaType('text/x-dhis2-expression')).toBe('dhis2-expression')
        expect(languageForMediaType('Application/X-DHIS2-Expression; charset=utf-8')).toBe('dhis2-expression')
        expect(languageForMediaType('text/x-dhis2-rule')).toBe('dhis2-rule')
        expect(languageForMediaType('application/x-dhis2-rule')).toBe('dhis2-rule')
    })

    it('takes the names a server knows, and installed again replaces the languages before', () => {
        registerPlugins([dhis2Plugin({ functions: ['d2:hasValue'], variables: [] })])
        const language = pluginLanguage('dhis2-rule')!.language as StreamParser<ExpressionState>
        expect(oneLine(language, 'd2:hasValue(V{event_date})').map(([, tag]) => tag)).toEqual([
            'variableName.function',
            'bracket',
            'variableName.special',
            'variableName',
            'variableName.special',
            'bracket',
        ])
        registerPlugins([dhis2])
    })
})
