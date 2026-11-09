import type { MediaChapter } from '@winterop-com/sokkel-ui-media/ChapterList'
import type { TranscriptLine } from '@winterop-com/sokkel-ui-media/Transcript'

/** An episode of a podcast about the coast, two hosts talking for three minutes in three chapters. */
export const EPISODE = {
    show: 'Low Tide Hours',
    title: 'The harbor at low water',
    hosts: 'ada and grace',
    duration: 192,
}

export const EPISODE_CHAPTERS: MediaChapter[] = [
    { title: 'The harbor at low water', start: 0 },
    { title: 'Rock pools on the north wall', start: 72 },
    { title: 'What the boats bring in', start: 140 },
]

export const EPISODE_TRANSCRIPT: TranscriptLine[] = [
    {
        start: 4,
        speaker: 'ada',
        text: 'Welcome back to Low Tide Hours. It is just after six, and the water has gone out further than I have seen it all year.',
    },
    {
        start: 13,
        speaker: 'grace',
        text: 'You can walk all the way to the second mooring. The boats are sitting on the mud like they are waiting for something.',
    },
    { start: 22, speaker: 'ada', text: 'They are waiting for the tide, which comes back at a quarter past twelve.' },
    { start: 28, speaker: 'ada', text: 'Until then the harbor belongs to the gulls and to us.' },
    { start: 34, speaker: 'grace', text: 'And to whoever left that anchor chain out there. It has been there since spring.' },
    { start: 42, speaker: 'ada', text: 'Linus says it belongs to the old ferry. Nobody has asked the ferry.' },
    { start: 49, speaker: 'grace', text: 'Let us walk out along the wall while we still can, and see what the water left behind.' },
    { start: 58, speaker: 'ada', text: 'Bring the bucket. Margaret wants a count of the crabs for her survey.' },
    {
        start: 72,
        speaker: 'grace',
        text: 'Here we are on the north wall. The pools here stay full even when the rest of the harbor drains.',
    },
    {
        start: 81,
        speaker: 'ada',
        text: 'That one is as clear as glass. There are three crabs under the weed, and a fish that does not want to be counted.',
    },
    {
        start: 92,
        speaker: 'grace',
        text: 'The water in these pools warms up all morning. By noon it is warmer than the sea by a few degrees.',
    },
    { start: 101, speaker: 'ada', text: 'Which is why the small ones live here. It is a nursery with a wall around it.' },
    { start: 110, speaker: 'grace', text: 'Seven crabs, two shrimp, and one very patient starfish.' },
    { start: 118, speaker: 'ada', text: 'Write it down before the tide turns, or we will have to count them again next week.' },
    { start: 127, speaker: 'grace', text: 'Done. Margaret will be pleased. Last month we only found four crabs on this wall.' },
    { start: 140, speaker: 'ada', text: 'The first boat is coming in now, riding the very start of the flood.' },
    { start: 148, speaker: 'grace', text: 'That is the one from the northern coast. They go out before dawn and come back with the tide.' },
    { start: 157, speaker: 'ada', text: 'Mostly mackerel this time of year, and a few crates of crab for the market.' },
    { start: 165, speaker: 'grace', text: 'And in an hour all of this will be under water again, as if we were never here.' },
    {
        start: 174,
        speaker: 'ada',
        text: 'That is it for this week. Next time we go up the river to see where the fresh water meets the salt.',
    },
    { start: 184, speaker: 'grace', text: 'Thanks for walking with us. Watch your step on the wall.' },
]
