import { DARK_BASEMAP, LIGHT_BASEMAP, SATELLITE_BASEMAP, type Basemap } from '@winterop-com/sokkel-ui-maps/basemap'
import { WORLD_BASEMAP } from '@winterop-com/sokkel-ui-maps/world'

/** The basemaps the watch's maps offer: light and dark following the scheme, satellite, and the world drawn with no network. */
export const FLIGHTS_BASEMAPS: Basemap[] = [LIGHT_BASEMAP, DARK_BASEMAP, SATELLITE_BASEMAP, WORLD_BASEMAP]

/** What a map draws when its tiles cannot be had: the countries, from geometry the maps package carries. */
export const FALLBACK_BASEMAP = WORLD_BASEMAP
