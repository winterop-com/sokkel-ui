import type { ChartLook } from '../../components/chart/look'

/** A gauge from 0 to 100, its arc colored by thresholds, built from the look so it follows the theme. */
export function gauge(name: string, value: number, steps: readonly [number, string][]) {
    return (look: ChartLook) => {
        const color = steps.reduce((current, [from, token]) => (value >= from ? look.token(token) : current), look.token(steps[0][1]))
        return {
            series: [
                {
                    name,
                    type: 'gauge',
                    startAngle: 210,
                    endAngle: -30,
                    min: 0,
                    max: 100,
                    radius: '92%',
                    center: ['50%', '58%'],
                    progress: { show: true, width: 12, roundCap: false, itemStyle: { color } },
                    axisLine: { lineStyle: { width: 12, color: [[1, look.grid]] } },
                    pointer: { show: false },
                    axisTick: { show: false },
                    splitLine: { show: false },
                    axisLabel: { show: false },
                    anchor: { show: false },
                    title: { show: true, offsetCenter: [0, '42%'], fontSize: look.size.label, color: look.muted },
                    detail: {
                        valueAnimation: false,
                        offsetCenter: [0, '0%'],
                        fontSize: look.size.stat,
                        fontWeight: 600,
                        color,
                        formatter: '{value}%',
                    },
                    data: [{ value, name }],
                },
            ],
        }
    }
}
