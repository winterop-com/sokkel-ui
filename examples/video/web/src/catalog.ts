/**
 * What the site holds: Tidevann's channels and their videos. Each video names the scene its clip
 * is drawn from, so every video plays a picture and a sound of its own, made in the browser.
 */

import type { KindColor } from '@winterop-com/sokkel-ui/lib/kind'

import type { SceneKind } from './clips/scenes'

export type Person = 'ada' | 'grace' | 'linus' | 'margaret'

/** Who watches: the account in the rail's foot. */
export const VIEWER: Person = 'ada'

export const PEOPLE_COLORS: Record<Person, KindColor> = { ada: 'blue', grace: 'violet', linus: 'green', margaret: 'pink' }

export interface Channel {
    id: string
    name: string
    handle: string
    /** Who runs it, marked as the creator in its comments. */
    owner: Person
    color: KindColor
    /** How many followed it before the viewer did anything. */
    followers: number
    about: string
    /** Where it films, by plain geography. */
    region: string
    /** Days before the demo began that it was started. */
    started: number
}

export const CHANNELS: readonly Channel[] = [
    {
        id: 'harbor',
        name: 'Harbor Workshop',
        handle: '@harborworkshop',
        owner: 'grace',
        color: 'teal',
        followers: 48_200,
        about: 'Boats, quays and the people who keep them working, filmed in the harbor towns of the northern coast. A new video most weeks, usually at first light.',
        region: 'The northern coast',
        started: 2210,
    },
    {
        id: 'juniper',
        name: 'Juniper Field Notes',
        handle: '@juniperfieldnotes',
        owner: 'linus',
        color: 'green',
        followers: 9_600,
        about: 'Walks through forests, fields and mountain valleys, with notes on what grows there and how the weather shapes it. Filmed on foot, with the sound of the place.',
        region: 'Mountain valleys of the north',
        started: 1340,
    },
    {
        id: 'larkspur',
        name: 'Larkspur Rail',
        handle: '@larkspurrail',
        owner: 'margaret',
        color: 'violet',
        followers: 127_000,
        about: 'Train journeys across continents, filmed from the window seat: night trains, valley lines and the long crossings of high deserts.',
        region: 'Across three continents',
        started: 3105,
    },
    {
        id: 'tides',
        name: 'Tidevann Tides',
        handle: '@tidevann',
        owner: 'margaret',
        color: 'blue',
        followers: 312_000,
        about: 'How the sea rises and falls: tide tables read hour by hour, spring tides at the harbor wall and the reasons behind them, from the people who make Tidevann.',
        region: 'Coasts everywhere',
        started: 2890,
    },
    {
        id: 'atlas',
        name: 'Coastline Atlas',
        handle: '@coastlineatlas',
        owner: 'linus',
        color: 'pink',
        followers: 21_400,
        about: 'Coasts, islands and the cities on them, one place at a time: where they are, how people reach them and what the water does there.',
        region: 'Islands and coasts of the southern sea',
        started: 980,
    },
    {
        id: 'night',
        name: 'Night Watch',
        handle: '@nightwatchsky',
        owner: 'grace',
        color: 'jade',
        followers: 64_800,
        about: 'The sky after dark from the far north: northern lights, lighthouses and the stars over still water. Long nights, cut short.',
        region: 'The far north',
        started: 1720,
    },
]

export type Topic = 'coasts' | 'harbors' | 'rail' | 'mountains' | 'night' | 'tides' | 'islands' | 'weather' | 'countryside'

export const TOPICS: Record<Topic, string> = {
    coasts: 'Coasts',
    harbors: 'Harbors',
    rail: 'Rail',
    mountains: 'Mountains',
    night: 'Night sky',
    tides: 'Tides',
    islands: 'Islands',
    weather: 'Weather',
    countryside: 'Countryside',
}

export interface Video {
    id: string
    title: string
    channel: string
    topic: Topic
    scene: SceneKind
    /** The clip's two hues, in degrees. */
    hue: number
    accent: number
    /** Its length, in seconds. */
    duration: number
    /** Days before the demo began that it was published. */
    days: number
    views: number
    likes: number
    description: string
    /** What is said over the picture, spread evenly over its length. */
    captions: readonly string[]
}

export const VIDEOS: readonly Video[] = [
    {
        id: 'first-light',
        title: 'First light over the northern coast',
        channel: 'atlas',
        topic: 'coasts',
        scene: 'sea',
        hue: 222,
        accent: 28,
        duration: 44,
        days: 3,
        views: 52_400,
        likes: 4_100,
        description:
            'Four mornings on one headland of the northern coast, cut into one: the first light on the water, the sun lifting off the horizon and a single boat crossing the bay. Filmed from the same spot each day, with nothing added but the sound of the place. The next part follows the boats back in, and the one after that the harbor as it wakes.',
        captions: [
            'The sea before sunrise, still and dark.',
            'Light reaches the horizon first.',
            'A boat leaves the bay, heading east.',
            'The sun clears the water.',
            'The path of light reaches the shore.',
            'By now the harbor behind us is awake.',
        ],
    },
    {
        id: 'harbor-wakes',
        title: 'How a harbor wakes up',
        channel: 'harbor',
        topic: 'harbors',
        scene: 'sea',
        hue: 198,
        accent: 12,
        duration: 38,
        days: 9,
        views: 31_200,
        likes: 2_380,
        description:
            'From the first engine to the last boat out: an hour on the quay of a small harbor town, shortened to under a minute. The boats leave in the same order every morning, and nobody writes it down.',
        captions: [
            'The quay at half past five.',
            'The first engine starts across the water.',
            'Boats leave in the order they came in.',
            'The light turns the water gold.',
            'The last boat clears the breakwater.',
        ],
    },
    {
        id: 'western-cape',
        title: 'Lighthouses of the western cape',
        channel: 'night',
        topic: 'coasts',
        scene: 'lighthouse',
        hue: 228,
        accent: 45,
        duration: 40,
        days: 21,
        views: 19_000,
        likes: 1_640,
        description:
            'The western cape has four lighthouses within sight of each other, and each turns at its own pace so a ship can tell them apart. This is the oldest, filmed through one clear night.',
        captions: [
            'The lamp is lit an hour after sunset.',
            'One turn every six seconds.',
            'Ships read the timing, not the color.',
            'The moon rises over the headland.',
            'The beam reaches twenty nautical miles.',
            'At dawn the lamp is put out by hand.',
        ],
    },
    {
        id: 'night-train',
        title: 'Crossing the high desert by night train',
        channel: 'larkspur',
        topic: 'rail',
        scene: 'train',
        hue: 262,
        accent: 22,
        duration: 46,
        days: 2,
        views: 8_100,
        likes: 912,
        description:
            'The overnight train crosses the high desert in eleven hours. We filmed the last hour before dark from the dining car, as the hills turned violet and the poles went by.',
        captions: [
            'The dining car, an hour before dark.',
            'The hills go violet first.',
            'Every pole is fifty meters from the last.',
            'The train leans into the long curve.',
            'Somewhere ahead is the border.',
            'The lights come on in the carriages.',
        ],
    },
    {
        id: 'valley-line',
        title: 'The valley line in autumn',
        channel: 'larkspur',
        topic: 'rail',
        scene: 'train',
        hue: 28,
        accent: 12,
        duration: 34,
        days: 30,
        views: 44_900,
        likes: 3_020,
        description:
            'A branch line that follows the river up the valley, one train an hour. In autumn the whole valley turns copper and the train runs slower, to give the passengers time to look.',
        captions: [
            'The valley line leaves the coast at noon.',
            'The river runs beside the track the whole way.',
            'Copper hills, and one train an hour.',
            'The last stop is a village of forty houses.',
        ],
    },
    {
        id: 'snow-pass',
        title: 'A mountain pass before the snow closes it',
        channel: 'juniper',
        topic: 'mountains',
        scene: 'peaks',
        hue: 214,
        accent: 330,
        duration: 42,
        days: 240,
        views: 88_000,
        likes: 6_700,
        description:
            'The pass closes on the first heavy snow and opens again in late spring. We crossed it on the last open day, as the first flakes fell over the ridges.',
        captions: [
            'The road up the pass, the last open day.',
            'The first snow, at two thousand meters.',
            'Three ridges, one behind another.',
            'The light goes pink in the late afternoon.',
            'Tomorrow the gate at the bottom is shut.',
        ],
    },
    {
        id: 'aurora-fjord',
        title: 'Northern lights over a still fjord',
        channel: 'night',
        topic: 'night',
        scene: 'aurora',
        hue: 226,
        accent: 140,
        duration: 48,
        days: 5,
        views: 140_000,
        likes: 12_400,
        description:
            'A windless night at the head of a fjord, the water still enough to hold the whole sky. The lights came at eleven and stayed until two; this is the best twenty minutes, sped up.',
        captions: [
            'Eleven at night, no wind at all.',
            'The first green band, low in the north.',
            'It reaches across the fjord.',
            'The water holds every star.',
            'A second curtain, higher and fainter.',
            'By two in the morning it is gone.',
        ],
    },
    {
        id: 'aurora-night',
        title: 'A whole night of northern lights in under a minute',
        channel: 'night',
        topic: 'night',
        scene: 'aurora',
        hue: 248,
        accent: 290,
        duration: 52,
        days: 60,
        views: 506_000,
        likes: 31_200,
        description:
            'Eight hours of sky from one camera on the shore, from dusk to the first light. The violet at the top of the curtains only shows on the strongest nights.',
        captions: [
            'Dusk, and the camera starts.',
            'Violet at the top of the curtains.',
            'The strongest hour, just after midnight.',
            'The lights fade as the moon rises.',
            'First light, eight hours later.',
        ],
    },
    {
        id: 'city-rain',
        title: 'Rain on a harbor city at night',
        channel: 'atlas',
        topic: 'weather',
        scene: 'rain',
        hue: 222,
        accent: 38,
        duration: 36,
        days: 14,
        views: 27_300,
        likes: 2_150,
        description:
            'The harbor city gets two hundred days of rain a year, most of it at night. One evening of it from a window above the old quay, the windows across the water going on and off.',
        captions: [
            'Rain from the west, as usual.',
            'The office lights go out one floor at a time.',
            'Puddles hold the street lamps.',
            'It rains here two hundred days a year.',
        ],
    },
    {
        id: 'tide-table',
        title: 'Reading a tide table in one day',
        channel: 'tides',
        topic: 'tides',
        scene: 'tide',
        hue: 214,
        accent: 192,
        duration: 40,
        days: 1,
        views: 3_900,
        likes: 410,
        description:
            'A whole day of water at one harbor, drawn as it happens: two high waters, two low waters and the hours between. By the end you can read any tide table at a glance.',
        captions: [
            'Midnight, and the water is falling.',
            'Low water, just after three.',
            'The flood runs fastest in the middle hours.',
            'High water, a little after nine.',
            'Twelve hours and twenty-five minutes later, again.',
            'That is why the times move every day.',
        ],
    },
    {
        id: 'spring-tide',
        title: 'Spring tide at the harbor wall',
        channel: 'tides',
        topic: 'tides',
        scene: 'tide',
        hue: 200,
        accent: 160,
        duration: 32,
        days: 45,
        views: 61_000,
        likes: 4_870,
        description:
            'Twice a month the sun and the moon pull together, and the water climbs higher up the harbor wall than on any other day. This one reached four meters.',
        captions: [
            'A new moon, and a spring tide.',
            'The water climbs the wall fast.',
            'Four meters at the top.',
            'The steps at the end of the quay disappear.',
        ],
    },
    {
        id: 'island-ferry',
        title: 'Island hopping by ferry in the southern sea',
        channel: 'atlas',
        topic: 'islands',
        scene: 'islands',
        hue: 196,
        accent: 48,
        duration: 44,
        days: 75,
        views: 1_200_000,
        likes: 58_000,
        description:
            'Six islands, one ferry and a day to see them all. The route goes round in a loop, and the ferry waits twenty minutes at each quay, long enough for a coffee and not much else.',
        captions: [
            'The first island, at seven.',
            'Twenty minutes at each quay.',
            'The longest crossing takes forty minutes.',
            'The smallest island has eleven people.',
            'Back where we started, after dark.',
        ],
    },
    {
        id: 'archipelago',
        title: 'The archipelago from above',
        channel: 'atlas',
        topic: 'islands',
        scene: 'islands',
        hue: 176,
        accent: 90,
        duration: 30,
        days: 160,
        views: 72_500,
        likes: 5_300,
        description: 'The archipelago drawn as a map, with the ferry route between the islands and the shallows around them.',
        captions: ['Six islands, seen from above.', 'The pale water is shallow.', 'The ferry route makes a loop.'],
    },
    {
        id: 'wind-plain',
        title: 'Wind across the coastal plain',
        channel: 'juniper',
        topic: 'countryside',
        scene: 'fields',
        hue: 205,
        accent: 98,
        duration: 34,
        days: 12,
        views: 6_400,
        likes: 520,
        description:
            'The plain behind the coast is the windiest place in the region, which is why the turbines are here. A spring afternoon of clouds, grass and slow blades.',
        captions: [
            'The plain behind the coast.',
            'Four turbines, each turning at its own pace.',
            'The wind comes off the sea.',
            'Clouds cross in about an hour.',
        ],
    },
    {
        id: 'green-hills',
        title: 'A long walk over the green hills',
        channel: 'juniper',
        topic: 'countryside',
        scene: 'fields',
        hue: 196,
        accent: 120,
        duration: 46,
        days: 90,
        views: 15_800,
        likes: 1_190,
        description:
            'Twenty kilometers over the hills between two villages, on a path older than either of them. Most of it is grass, sky and the turbines on the far ridge.',
        captions: [
            'The path leaves the first village at nine.',
            'Grass, sky and nothing else for an hour.',
            'The turbines on the far ridge.',
            'Halfway, and the wind picks up.',
            'The second village, by late afternoon.',
        ],
    },
    {
        id: 'boat-afloat',
        title: 'Keeping a small boat afloat',
        channel: 'harbor',
        topic: 'harbors',
        scene: 'sea',
        hue: 18,
        accent: 340,
        duration: 40,
        days: 120,
        views: 23_700,
        likes: 1_980,
        description:
            'What a small wooden boat needs each season to keep going: a look at the hull, new rope and a slow trip round the bay at sunset to see that it all holds.',
        captions: [
            'The boat is fifty years old.',
            'New rope every spring.',
            'A slow trip round the bay at sunset.',
            'Everything holds.',
            'Back to the mooring before dark.',
        ],
    },
    {
        id: 'storm-watch',
        title: 'Watching a storm come in from the sea',
        channel: 'harbor',
        topic: 'weather',
        scene: 'lighthouse',
        hue: 205,
        accent: 200,
        duration: 38,
        days: 33,
        views: 41_000,
        likes: 3_210,
        description:
            'The storm was forecast for midnight and came at ten. From the harbor master’s window you can see the lighthouse on the point and every wave that reaches it.',
        captions: [
            'The forecast said midnight.',
            'It came at ten.',
            'The light on the point keeps turning.',
            'Waves reach the top of the breakwater.',
        ],
    },
    {
        id: 'high-water',
        title: 'Why high water comes twice a day',
        channel: 'tides',
        topic: 'tides',
        scene: 'tide',
        hue: 230,
        accent: 32,
        duration: 46,
        days: 400,
        views: 230_000,
        likes: 17_400,
        description:
            'The moon pulls the sea toward it, and the earth turns under that pull, so most coasts see two high waters a day. This video draws one day of it and explains the rest as it goes.',
        captions: [
            'The moon pulls the sea toward it.',
            'The earth turns under that pull.',
            'So the water rises twice a day.',
            'Each high water is about fifty minutes later than yesterday.',
            'The shape of the coast does the rest.',
            'Some harbors see only one tide a day.',
        ],
    },
    {
        id: 'salt-flats',
        title: 'Salt flats at dawn, from the train',
        channel: 'larkspur',
        topic: 'rail',
        scene: 'train',
        hue: 200,
        accent: 40,
        duration: 30,
        days: 6,
        views: 4_400,
        likes: 388,
        description:
            'The line crosses a salt flat for an hour just after dawn, and from the window it looks like the train is running over water.',
        captions: ['Dawn over the salt flat.', 'It looks like water from here.', 'An hour of white, then the hills again.'],
    },
    {
        id: 'glacier',
        title: 'Under the glacier in midsummer',
        channel: 'juniper',
        topic: 'mountains',
        scene: 'peaks',
        hue: 190,
        accent: 200,
        duration: 36,
        days: 210,
        views: 37_600,
        likes: 2_910,
        description: 'Even in midsummer it snows under the glacier. A day at the foot of the ice, with the ridges stacked behind it.',
        captions: [
            'Midsummer, and still snowing.',
            'The ice is moving, slowly.',
            'Three ridges behind the glacier.',
            'The valley below is green.',
        ],
    },
]

export const channelOf = (video: Video): Channel => CHANNELS.find((one) => one.id === video.channel) ?? (CHANNELS[0] as Channel)
export const videoById = (id: string | undefined): Video | undefined => VIDEOS.find((one) => one.id === id)
export const channelById = (id: string | undefined): Channel | undefined => CHANNELS.find((one) => one.id === id)
export const videosOf = (channel: Channel): Video[] => VIDEOS.filter((video) => video.channel === channel.id)

/** A stable number from a video's id, the seed its clip is drawn from. */
export function seedOf(id: string): number {
    let hash = 2166136261
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
    return hash >>> 0
}
