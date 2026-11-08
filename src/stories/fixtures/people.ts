/** Tidevann's people as a composer mentions them: each with a handle, a picture where they have one, and their role. */

import type { MentionPerson, MentionSearch } from '@winterop-com/sokkel-ui/Composer'
import { matchPeople } from '@winterop-com/sokkel-ui/lib/mentions'
import { pictureOf } from './portraits'

export const PEOPLE: readonly MentionPerson[] = [
    { id: 'user-ada', handle: 'ada', name: 'Ada Berg', image: pictureOf('ada'), detail: 'Owner' },
    { id: 'user-grace', handle: 'grace', name: 'Grace Holm', image: pictureOf('grace'), detail: 'Admin' },
    { id: 'user-linus', handle: 'linus', name: 'Linus Dahl', image: pictureOf('linus'), detail: 'Editor' },
    { id: 'user-margaret', handle: 'margaret', name: 'Margaret Lund', detail: 'Viewer' },
]

/** A search over the people that answers as a server would, though at once, so a story renders the same every time. */
export const searchPeople: MentionSearch = (query) => Promise.resolve(matchPeople(PEOPLE, query))
