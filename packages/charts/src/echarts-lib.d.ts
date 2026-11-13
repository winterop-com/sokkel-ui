// ECharts ships each chart type and component as a module that registers itself on import, without
// type declarations of its own; the engine loads them for their effect alone.
declare module 'echarts/lib/chart/*'
declare module 'echarts/lib/component/*'
declare module 'echarts/lib/renderer/installSVGRenderer' {
    import type { use } from 'echarts/core'
    export const install: Parameters<typeof use>[0]
}
