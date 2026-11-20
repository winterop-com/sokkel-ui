/**
 * The simulated waters of Tidevann's harbor watch: the tracking add-on's simulated coast, under the
 * names the watch's pages read it by. Three harbors, harbor, juniper and larkspur, the watch's own
 * vessels and aircraft going round their routes, and an endless run of contacts that come and go,
 * all a function of the simulated time and the seed.
 */
export {
    COAST_CENTER as WATCH_CENTER,
    COAST_EPOCH as EPOCH,
    COAST_HARBORS as HARBORS,
    coastActivity as activityBetween,
    coastEvents as eventsBetween,
    coastName as nameAt,
    findCoastContact as findContact,
    type CoastContact as Contact,
    type CoastEvent as WatchEvent,
} from '@winterop-com/sokkel-ui-tracking/simulate'

export const SECOND = 1000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
