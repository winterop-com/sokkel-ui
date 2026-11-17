/** What the fake server keeps: the projects with their edits, and the person's settings. */

import { collection } from 'tidevann-shared/backend'

import { DEFAULT_PREFS, type Prefs, type Project } from './model'
import { seedProjects } from './seed'

export const projects = collection<Project>('projects', () => seedProjects())

export const prefs = collection<Prefs>('prefs', () => [{ id: 'prefs', ...DEFAULT_PREFS }])
