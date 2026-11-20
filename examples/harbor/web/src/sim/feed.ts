/**
 * The picture the watch sees at a moment: the tracking add-on's simulated coast, read as an app
 * reads its feeds, the vessels decoded from AIS sentences, the aircraft read from a readsb-shaped
 * answer, and the radars where they stand. A picture is read afresh from the reports of the minutes
 * before the moment, so a moment played back reads the same as it did live.
 */
export {
    coastAffiliation as affiliationAt,
    simulateCoast as pictureAt,
    type CoastJudgment as Judgment,
    type CoastPicture as Picture,
} from '@winterop-com/sokkel-ui-tracking/simulate'
