import { collection } from 'tidevann-shared/backend'

import { type Board, DEFAULT_PREFERENCES, type Dataset, type Preferences, type SavedChart } from './model'
import { seedBoards, seedCharts, seedDatasets } from './seed'

/** The visualizer's server: datasets, the charts saved from them, boards of charts and the preferences, kept in this browser. */
export const datasets = collection<Dataset>('datasets', seedDatasets)
export const charts = collection<SavedChart>('charts', seedCharts)
export const boards = collection<Board>('boards', seedBoards)
export const preferences = collection<Preferences>('preferences', () => [DEFAULT_PREFERENCES])
