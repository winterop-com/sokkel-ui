/**
 * Simulated feeds for a tracking console that has no live one at hand: an example, a story, a test
 * or a demo. Each is worked out from a seed and a simulated moment and written in the shape its real
 * feed has, so it is read through the same readers a live feed is, and the same moment is the same
 * picture whether it is reached live or played back.
 *
 * - Flights between real cities, as readsb's v2 API answers (`simulateFlights`, for `parseReadsb`).
 * - A coast of vessels, aircraft and radars, the vessels as AIS sentences (`simulateAis`, for
 *   `createAisDecoder`) and the whole picture read through the readers (`simulateCoast`).
 * - A machine's network connections, as connection records (`createNetworkSimulation`, for
 *   `createFlowTracker`).
 *
 * `createSimClock` is the clock they are read at: a moment that plays at a multiple of real time,
 * pauses and seeks.
 */
export { createSimClock, type SimClock, type SimClockOptions } from './simulate/clock'
export {
    COAST_CENTER,
    COAST_EPOCH,
    COAST_HARBORS,
    coastActivity,
    coastAffiliation,
    coastContact,
    coastContacts,
    coastEvents,
    coastLastHeard,
    coastName,
    findCoastContact,
    simulateAis,
    simulateCoast,
    type AisBatch,
    type CoastContact,
    type CoastEvent,
    type CoastJudgment,
    type CoastMotion,
    type CoastPicture,
} from './simulate/coast'
export {
    FLIGHT_CITIES,
    flightRoute,
    flightTrails,
    flightsAt,
    simulateFlights,
    type FlightCity,
    type FlightPhase,
    type FlightSimOptions,
    type FlightTrailOptions,
    type SimFlight,
} from './simulate/flights'
export {
    createNetworkSimulation,
    NETWORK_NEWCOMER,
    NETWORK_PROCESSES,
    networkHosts,
    networkPlace,
    simulateNetwork,
    type NetworkHosts,
    type NetworkPlace,
    type NetworkSimOptions,
    type NetworkSimulation,
} from './simulate/network'
export { encodeAisPosition, encodeAisStatic, type AisPositionReport, type AisStaticReport } from './simulate/nmea'
