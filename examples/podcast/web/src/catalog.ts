/**
 * The shows and their episodes, as a directory of podcasts would list them. Every show and host is
 * made up; the episodes are about Tidevann's world, the sea and plain geography. What a listener
 * does with them (subscribing, playing, starring, downloading) is kept by the backend.
 */

import type { ArtworkCover } from '@winterop-com/sokkel-ui-media/Artwork'

export const HOSTS = ['ada', 'grace', 'linus', 'margaret'] as const
export type Host = (typeof HOSTS)[number]

export const CATEGORIES = [
    { id: 'sea', label: 'Sea and coast' },
    { id: 'geography', label: 'Geography' },
    { id: 'nature', label: 'Nature' },
    { id: 'weather', label: 'Weather' },
    { id: 'work', label: 'Work' },
    { id: 'history', label: 'History' },
] as const
export type Category = (typeof CATEGORIES)[number]['id']

/** Which words a show's hosts reach for when they talk. */
export type Talk = 'coast' | 'weather' | 'ops'

export interface Show {
    id: string
    title: string
    hosts: readonly Host[]
    category: Category
    /** One line, for a card or a search result. */
    blurb: string
    /** A paragraph, for the show's page. */
    about: string
    cover: ArtworkCover
    /** The steps of the show's jingle, in semitones above its key. */
    jingle: readonly number[]
    talk: Talk
}

export interface Episode {
    id: string
    show: string
    number: number
    title: string
    summary: string
    /** Where it was recorded, which the hosts mention. */
    place: string
    chapters: readonly string[]
    /** How many days ago it came out; absent for one still to come, which Check for new brings. */
    age?: number
}

export const SHOWS: readonly Show[] = [
    {
        id: 'low-tide-hours',
        title: 'Low Tide Hours',
        hosts: ['ada', 'grace'],
        category: 'sea',
        blurb: 'A slow walk along the shore at low water, and what the tide leaves behind.',
        about: 'Ada and grace walk a different stretch of shore at every low tide: rock pools, sand bars, wrecks and harbors that empty twice a day. No hurry, and always back before the water.',
        cover: { motif: 'wave', from: 'blue', to: 'teal' },
        jingle: [0, 4, 7, 12],
        talk: 'coast',
    },
    {
        id: 'harbor-log',
        title: 'The Harbor Log',
        hosts: ['grace', 'linus'],
        category: 'work',
        blurb: 'Boats in, boats out: the week at the harbor, told by the people who work it.',
        about: 'A week at the harbor in a few minutes: who came in, what they brought, what broke and who fixed it. Grace keeps the log, linus asks the questions.',
        cover: { motif: 'bands', from: 'teal', to: 'jade' },
        jingle: [0, 2, 4, 9],
        talk: 'coast',
    },
    {
        id: 'field-notes-larkspur',
        title: 'Field Notes from Larkspur',
        hosts: ['margaret'],
        category: 'nature',
        blurb: 'Walks across the larkspur hills, a notebook in one hand.',
        about: 'Margaret walks the hills above larkspur in every season and reads from her notebook on the way: birds, plants, weather and the paths between the villages.',
        cover: { motif: 'peaks', from: 'green', to: 'jade' },
        jingle: [0, 3, 7, 10],
        talk: 'coast',
    },
    {
        id: 'juniper-weather',
        title: 'Juniper Weather',
        hosts: ['linus'],
        category: 'weather',
        blurb: 'The week ahead, explained slowly, from the station on juniper ridge.',
        about: "Linus reads the instruments at the juniper ridge station and explains the week's weather without a single chart: where the wind comes from, why the fog sits in the valley, and when to bring a coat.",
        cover: { motif: 'sun', from: 'amber', to: 'coral' },
        jingle: [0, 5, 7, 12],
        talk: 'weather',
    },
    {
        id: 'tidevann-weekly',
        title: 'Tidevann Weekly',
        hosts: ['ada', 'linus'],
        category: 'work',
        blurb: 'What changed in Tidevann this week: jobs, runs and the people who keep them going.',
        about: 'Ada and linus go through the week in Tidevann: which jobs ran, which failed and why, what changed in the harbor, juniper and larkspur projects, and what is coming next.',
        cover: { motif: 'rings', from: 'violet', to: 'pink' },
        jingle: [0, 7, 4, 12],
        talk: 'ops',
    },
    {
        id: 'islands-one-by-one',
        title: 'Islands, One by One',
        hosts: ['margaret', 'grace'],
        category: 'geography',
        blurb: 'One island an episode: how it was made, who lives there, and how to get there.',
        about: 'Every episode is one island: how it was made, how many people live there and what they do, and the ferry, the bridge or the boat it takes to get there.',
        cover: { motif: 'dots', from: 'blue', to: 'jade' },
        jingle: [0, 2, 7, 9],
        talk: 'coast',
    },
    {
        id: 'rivers-and-deltas',
        title: 'Rivers and Deltas',
        hosts: ['linus', 'margaret'],
        category: 'geography',
        blurb: 'Following the water from the mountains down to the sea.',
        about: 'Linus and margaret follow one river an episode, from the snow where it starts to the delta where it ends: the valleys it cut, the towns on its banks and the floods they remember.',
        cover: { motif: 'wave', from: 'jade', to: 'blue' },
        jingle: [0, 4, 9, 7],
        talk: 'coast',
    },
    {
        id: 'lighthouse-stories',
        title: 'Lighthouse Stories',
        hosts: ['grace'],
        category: 'history',
        blurb: 'The keepers, the lamps and the long nights on the coast.',
        about: 'Grace visits a lighthouse an episode and tells its story: who built it, who kept it, the storms it saw and what it does now that nobody lives there.',
        cover: { motif: 'sun', from: 'violet', to: 'blue' },
        jingle: [0, 3, 5, 10],
        talk: 'coast',
    },
    {
        id: 'salt-and-stone',
        title: 'Salt and Stone',
        hosts: ['ada'],
        category: 'nature',
        blurb: 'Coastal rock, sand and the slow work of the sea on the land.',
        about: 'Ada looks closely at the coast itself: the cliffs, the beaches, the dunes and the slow work the sea does on all of them, a grain of sand at a time.',
        cover: { motif: 'bands', from: 'amber', to: 'coral' },
        jingle: [0, 5, 3, 8],
        talk: 'coast',
    },
    {
        id: 'the-night-shift',
        title: 'The Night Shift',
        hosts: ['linus', 'grace'],
        category: 'work',
        blurb: 'What runs while everyone sleeps: the nightly jobs and the people on call.',
        about: 'The jobs that run at night and the people who answer when they fail: nightly-export, rebuild-index, the scheduler and the worker, told from the on-call rota.',
        cover: { motif: 'peaks', from: 'violet', to: 'pink' },
        jingle: [0, 7, 10, 5],
        talk: 'ops',
    },
]

const E = (
    show: string,
    number: number,
    title: string,
    summary: string,
    place: string,
    chapters: readonly string[],
    age?: number,
): Episode => ({ id: `${show}-${String(number)}`, show, number, title, summary, place, chapters, ...(age === undefined ? {} : { age }) })

export const EPISODES: readonly Episode[] = [
    E(
        'low-tide-hours',
        1,
        'The harbor at low water',
        'Ada and grace walk out across the empty harbor and count what the tide left behind.',
        'the harbor',
        ['The harbor at low water', 'Rock pools on the north wall', 'What the boats bring in'],
        40,
    ),
    E(
        'low-tide-hours',
        2,
        'Sand bars of the long bay',
        'The long bay drains further than anywhere on the coast. We walk out to the farthest sand bar and back before the flood.',
        'the long bay',
        ['Out across the flats', 'The farthest bar', 'Racing the flood'],
        26,
    ),
    E(
        'low-tide-hours',
        3,
        'A wreck at the river mouth',
        'Twice a year the lowest tides uncover an old wreck at the river mouth. Grace has waited three years to see it.',
        'the river mouth',
        ['Waiting for the lowest tide', 'What is left of her', 'Who she was', 'Back to the dunes'],
        12,
    ),
    E(
        'low-tide-hours',
        4,
        'The causeway to the island',
        'For two hours at low water you can walk to the island. Ada times it, grace brings the tide table.',
        'the causeway',
        ['Two hours each way', 'Halfway across', 'On the island'],
        3,
    ),
    E(
        'low-tide-hours',
        5,
        'Mussels on the breakwater',
        'The breakwater is covered in mussels at low water. We count them, badly, and ask why they grow there.',
        'the breakwater',
        ['On the breakwater', 'Counting, badly', 'Why there'],
        undefined,
    ),

    E(
        'harbor-log',
        1,
        'A new crane on the quay',
        'The old crane came down this week and the new one went up. Linus asks who gets to drive it.',
        'the quay',
        ['Down comes the old crane', 'Up goes the new one', 'Who drives it'],
        33,
    ),
    E(
        'harbor-log',
        2,
        'The ferry that came in late',
        'The morning ferry came in three hours late. Grace finds out why, and who waited.',
        'the ferry dock',
        ['Three hours late', 'Fog off the point', 'Who waited'],
        19,
    ),
    E(
        'harbor-log',
        3,
        'Nets, ropes and the chandlery',
        'Inside the chandlery, where the boats get everything from rope to coffee.',
        'the chandlery',
        ['Inside the chandlery', 'Rope by the meter', 'Coffee for the crews'],
        5,
    ),
    E(
        'harbor-log',
        4,
        'Winter berths',
        'Which boats stay in for the winter, which leave, and how they all fit.',
        'the inner harbor',
        ['Who stays', 'Who leaves', 'How they all fit'],
        undefined,
    ),

    E(
        'field-notes-larkspur',
        1,
        'The first frost on the hills',
        'The first frost of the year, the last of the late flowers, and a very cold notebook.',
        'the larkspur hills',
        ['Before sunrise', 'The last flowers', 'A cold notebook'],
        30,
    ),
    E(
        'field-notes-larkspur',
        2,
        'The path between two villages',
        'An old path between two villages on the ridge, walked end to end in an afternoon.',
        'the ridge path',
        ['The first village', 'Along the ridge', 'The second village'],
        16,
    ),
    E(
        'field-notes-larkspur',
        3,
        'Birds of the upper meadow',
        'Margaret sits still in the upper meadow for an hour and writes down every bird she hears.',
        'the upper meadow',
        ['Sitting still', 'Every bird, one by one', 'What the meadow needs'],
        6,
    ),
    E(
        'field-notes-larkspur',
        4,
        'The spring under the old oak',
        'There is a spring under the old oak that never runs dry. Margaret asks around about it.',
        'the old oak',
        ['The spring', 'Asking around', 'Never dry'],
        undefined,
    ),

    E(
        'juniper-weather',
        1,
        'Why the fog sits in the valley',
        'The fog in the valley this week, and why it stays put on a still morning.',
        'juniper ridge',
        ['Still mornings', 'Cold air runs downhill', 'When it lifts'],
        21,
    ),
    E(
        'juniper-weather',
        2,
        'A week of westerly wind',
        'The wind has come from the west all week. Linus explains where it started and when it will turn.',
        'juniper ridge',
        ['Where it started', 'Across the sea', 'When it turns'],
        14,
    ),
    E(
        'juniper-weather',
        3,
        'The first snow on the ridge',
        'Snow on the ridge but rain in the town: one storm, two kinds of weather.',
        'juniper ridge',
        ['Snow up high', 'Rain down low', 'The week ahead'],
        2,
    ),
    E(
        'juniper-weather',
        4,
        'Reading the clouds',
        'Three kinds of cloud you can see from any window, and what each one says about tomorrow.',
        'juniper ridge',
        ['High and thin', 'Low and gray', 'Tall and bright'],
        undefined,
    ),

    E(
        'tidevann-weekly',
        1,
        'Why sync-inventory failed on Tuesday',
        'Sync-inventory failed at the validate step on Tuesday night. Ada walks through the run, linus through the fix.',
        'the office',
        ['The failed run', 'The validate step', 'The fix'],
        24,
    ),
    E(
        'tidevann-weekly',
        2,
        'Faster nightly exports',
        'The nightly-export job got twice as fast this week. Linus explains what changed in the transform step.',
        'the office',
        ['Twice as fast', 'The transform step', 'What is next'],
        10,
    ),
    E(
        'tidevann-weekly',
        3,
        'A new scheduler for larkspur',
        'The larkspur project moved to the new scheduler. What moved, what broke, and what got better.',
        'the office',
        ['Moving over', 'What broke', 'What got better', 'Questions from the team'],
        1,
    ),
    E(
        'tidevann-weekly',
        4,
        'The send-digest rewrite',
        'Send-digest gets a new notify step. Ada and linus argue about the wording of the email.',
        'the office',
        ['A new notify step', 'The wording', 'When it ships'],
        undefined,
    ),

    E(
        'islands-one-by-one',
        1,
        'The island with one road',
        'One road, one shop, one ferry a day, and a hundred and forty people who would not live anywhere else.',
        'the northern island',
        ['One road', 'One ferry a day', 'Why they stay'],
        28,
    ),
    E(
        'islands-one-by-one',
        2,
        'An island made by a volcano',
        'Black sand, warm springs and a mountain that last woke up two hundred years ago.',
        'the volcanic island',
        ['Black sand', 'Warm springs', 'The sleeping mountain'],
        11,
    ),
    E(
        'islands-one-by-one',
        3,
        'The island you can walk to',
        'A tidal island joined to the land twice a day, and the people who plan their lives around it.',
        'the tidal island',
        ['Twice a day', 'Planning around the tide', 'Stuck on the wrong side'],
        4,
    ),
    E(
        'islands-one-by-one',
        4,
        'The smallest island with a school',
        'Six pupils, one teacher, and a classroom with a view of the sea.',
        'the smallest island',
        ['Six pupils', 'One teacher', 'A view of the sea'],
        undefined,
    ),

    E(
        'rivers-and-deltas',
        1,
        'Where the river starts',
        'Up in the snowfields, where the river is a trickle you can step across.',
        'the snowfields',
        ['A trickle in the snow', 'The first lake', 'Down the valley'],
        35,
    ),
    E(
        'rivers-and-deltas',
        2,
        'The towns on the banks',
        'Three towns on the same river, each built where the water let them.',
        'the river valley',
        ['The bridge town', 'The mill town', 'The port town'],
        18,
    ),
    E(
        'rivers-and-deltas',
        3,
        'The delta and the sea',
        'Where the river slows down, splits into a hundred channels and finally meets the salt.',
        'the delta',
        ['A hundred channels', 'Fresh water meets salt', 'The birds of the delta'],
        7,
    ),
    E(
        'rivers-and-deltas',
        4,
        'The flood of the spring thaw',
        'Every spring the river rises. Margaret talks to the people who remember the biggest flood.',
        'the river valley',
        ['The thaw', 'The biggest flood', 'What changed after'],
        undefined,
    ),

    E(
        'lighthouse-stories',
        1,
        'The keeper who stayed forty years',
        'One keeper, one lamp and forty years of nights on the point.',
        'the point',
        ['Forty years', 'The lamp', 'The last night'],
        38,
    ),
    E(
        'lighthouse-stories',
        2,
        'The light on the rock',
        'A lighthouse built on a bare rock out at sea, and how they got the stones there.',
        'the rock',
        ['A bare rock', 'Getting the stones there', 'The first light'],
        15,
    ),
    E(
        'lighthouse-stories',
        3,
        'When the lights went automatic',
        'The year the last keepers left, and what the lighthouses do without them.',
        'the coast',
        ['The last keepers', 'A lamp on a timer', 'Who looks after them now'],
        8,
    ),
    E(
        'lighthouse-stories',
        4,
        'Fog signals',
        'Before radios there were horns, bells and guns. Grace tries to find one that still works.',
        'the headland',
        ['Horns and bells', 'One that still works', 'A very loud morning'],
        undefined,
    ),

    E(
        'salt-and-stone',
        1,
        'How a beach moves',
        'A beach is never still. Ada follows one grain of sand along the coast for a year.',
        'the south beach',
        ['Never still', 'One grain of sand', 'A year later'],
        27,
    ),
    E(
        'salt-and-stone',
        2,
        'The cliffs that fall',
        'The cliffs lose a little every winter. Ada visits the edge and the people who live near it.',
        'the cliffs',
        ['A little every winter', 'At the edge', 'Living near it'],
        13,
    ),
    E(
        'salt-and-stone',
        3,
        'Dunes that hold the sea back',
        'The dunes behind the beach, the grass that holds them together, and the storm that tested them.',
        'the dunes',
        ['The grass', 'The storm', 'Still standing'],
        3,
    ),
    E(
        'salt-and-stone',
        4,
        'Pebbles',
        'Why some beaches are sand and some are stones, and what the stones can tell you.',
        'the pebble beach',
        ['Sand or stones', 'Reading a pebble', 'The beach after a storm'],
        undefined,
    ),

    E(
        'the-night-shift',
        1,
        'Paged at three in the morning',
        'Grace was paged at three in the morning when rebuild-index failed. What she did, step by step.',
        'the on-call desk',
        ['The page', 'Step by step', 'Back to sleep'],
        20,
    ),
    E(
        'the-night-shift',
        2,
        'The queue that never empties',
        'The worker queue grew all night and nobody knew why. Linus finds the import-orders job behind it.',
        'the on-call desk',
        ['A growing queue', 'Finding import-orders', 'Emptying it'],
        9,
    ),
    E(
        'the-night-shift',
        3,
        'A quiet night',
        'Nothing failed. Grace and linus talk about what a good night on call looks like.',
        'the on-call desk',
        ['Nothing failed', 'What good looks like', 'Handing over'],
        2,
    ),
    E(
        'the-night-shift',
        4,
        'Retries and backoff',
        'When a job fails at the upload step, how long should it wait before it tries again?',
        'the on-call desk',
        ['A failed upload', 'Waiting', 'Trying again'],
        undefined,
    ),
]

export const showById = new Map(SHOWS.map((show) => [show.id, show]))
export const episodeById = new Map(EPISODES.map((episode) => [episode.id, episode]))

/** A show's episodes, newest first. */
export function episodesOf(show: string): Episode[] {
    return EPISODES.filter((episode) => episode.show === show).sort((a, b) => b.number - a.number)
}

export function categoryLabel(category: Category): string {
    return CATEGORIES.find((one) => one.id === category)?.label ?? category
}

/** The hosts of a show written out: "ada", "ada and grace". */
export function hostsOf(show: Show): string {
    return show.hosts.length === 1 ? show.hosts[0] : `${show.hosts.slice(0, -1).join(', ')} and ${show.hosts[show.hosts.length - 1]}`
}
