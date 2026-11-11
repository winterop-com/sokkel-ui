import type { ChartLook } from './look'

/** An ECharts theme drawn from the library's tokens: the series colors, the typeface, quiet axes and grid. */
export function chartTheme(look: ChartLook): Record<string, unknown> {
    const text = { fontFamily: look.font, color: look.muted, fontSize: look.size.label }
    const axis = {
        axisLine: { show: true, lineStyle: { color: look.border } },
        axisTick: { show: false },
        axisLabel: { color: look.muted, fontFamily: look.font, fontSize: look.size.label },
        nameTextStyle: { color: look.muted, fontFamily: look.font, fontSize: look.size.small },
        splitLine: { show: true, lineStyle: { color: look.grid, width: 1 } },
        splitArea: { show: false },
    }
    const focus = {
        emphasis: { focus: 'series' },
        blur: { lineStyle: { opacity: 0.2 }, areaStyle: { opacity: 0.04 }, itemStyle: { opacity: 0.25 } },
    }
    return {
        color: look.series,
        backgroundColor: 'transparent',
        textStyle: text,
        title: {
            left: 12,
            top: 10,
            textStyle: { color: look.foreground, fontFamily: look.font, fontSize: look.size.body, fontWeight: 500 },
            subtextStyle: { color: look.muted, fontFamily: look.font, fontSize: look.size.label },
        },
        legend: {
            icon: 'roundRect',
            itemWidth: 10,
            itemHeight: 10,
            itemGap: 14,
            textStyle: { ...text, color: look.foreground },
            inactiveColor: look.faint,
            pageTextStyle: text,
        },
        tooltip: {
            backgroundColor: look.popover,
            borderColor: look.border,
            borderWidth: 1,
            padding: [6, 10],
            textStyle: { color: look.foreground, fontFamily: look.font, fontSize: look.size.body },
            extraCssText: 'box-shadow: var(--elevation-pop); border-radius: calc(var(--radius) * 0.8);',
            axisPointer: {
                lineStyle: { color: look.muted, type: 'dashed', width: 1 },
                crossStyle: { color: look.muted },
                // Translucent, as ECharts draws the shadow over the bars: the hovered one shows through.
                shadowStyle: { color: look.muted, opacity: 0.14 },
                label: { backgroundColor: look.popover, color: look.foreground, fontFamily: look.font },
            },
        },
        categoryAxis: { ...axis, splitLine: { show: false } },
        valueAxis: { ...axis, axisLine: { show: false }, axisLabel: { ...axis.axisLabel, hideOverlap: true } },
        timeAxis: { ...axis, splitLine: { show: false } },
        logAxis: { ...axis, axisLine: { show: false } },
        grid: { left: 4, right: 10, top: 10, bottom: 4, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
        line: { symbol: 'circle', symbolSize: 5, showSymbol: false, lineStyle: { width: 1.5 }, ...focus },
        bar: { barMaxWidth: 28, ...focus },
        scatter: { symbolSize: 7, itemStyle: { opacity: 0.85 }, ...focus },
        pie: {
            itemStyle: { borderColor: look.card, borderWidth: 2 },
            label: { color: look.foreground, fontFamily: look.font },
            emphasis: { scaleSize: 4 },
        },
        heatmap: { itemStyle: { borderColor: look.card, borderWidth: 1 } },
        gauge: {
            axisLine: { lineStyle: { color: [[1, look.grid]] } },
            axisLabel: { color: look.muted, fontFamily: look.font },
            detail: { color: look.foreground, fontFamily: look.font },
            title: { color: look.muted, fontFamily: look.font },
        },
        visualMap: { textStyle: text, inRange: { color: look.ramp('chart-2') } },
        markLine: { lineStyle: { color: look.muted }, label: { color: look.muted, fontFamily: look.font } },
    }
}
