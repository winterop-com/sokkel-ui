import { collection } from 'tidevann-shared/backend'

import { type Board, DEFAULT_PREFERENCES, type Dataset, type Preferences, type SavedChart } from './model'
import { seedBoards, seedCharts, seedDatasets } from './seed'

/** The visualizer's server: datasets, the charts saved from them, boards of charts and the preferences, kept in this browser. */
export const datasets = collection<Dataset>('dataviz-datasets', seedDatasets)
export const charts = collection<SavedChart>('dataviz-charts', seedCharts)
export const boards = collection<Board>('dataviz-boards', seedBoards)
export const preferences = collection<Preferences>('dataviz-preferences', () => [DEFAULT_PREFERENCES])
