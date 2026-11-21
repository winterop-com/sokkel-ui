import { describe, expect, it } from 'vitest'

import {
    areaMiddle,
    cancelledMetAlerts,
    atLeast,
    compareSeverity,
    INCIDENT_KINDS,
    INCIDENT_PART,
    INCIDENT_SEVERITIES,
    INCIDENT_WORDS,
    incidentsAt,
    incidentZones,
    parseGdacs,
    parseMetAlerts,
    parseUsgsQuakes,
    quakeSeverity,
    SEVERITY_ORDER,
    type GdacsFeed,
    type Incident,
    type MetAlertsFeed,
    type UsgsFeed,
} from './events'

// Shaped as the USGS summary feeds answer (`/earthquakes/feed/v1.0/summary/all_hour.geojson`), with invented events.
const QUAKES: UsgsFeed = {
    type: 'FeatureCollection',
    metadata: { generated: 1_795_198_982_000, title: 'USGS All Earthquakes, Past Hour', status: 200, api: '2.8.2', count: 5 },
    features: [
        {
            type: 'Feature',
            id: 'ak2026tdv001',
            properties: {
                mag: 0.6,
                place: '74 km NW of Karluk, Alaska',
                time: 1_795_198_169_727,
                updated: 1_795_198_334_558,
                tz: null,
                url: 'https://earthquake.usgs.gov/earthquakes/eventpage/ak2026tdv001',
                detail: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/ak2026tdv001.geojson',
                felt: null,
                cdi: null,
                mmi: null,
                alert: null,
                status: 'automatic',
                tsunami: 0,
                sig: 6,
                net: 'ak',
                code: '2026tdv001',
                nst: 6,
                dmin: 0.1,
                rms: 0.5,
                gap: 226,
                magType: 'ml',
                type: 'earthquake',
                title: 'M 0.6 - 74 km NW of Karluk, Alaska',
            },
            geometry: { type: 'Point', coordinates: [-155.385, 58.02, 0.3] },
        },
        {
            type: 'Feature',
            id: 'us7000tdv2',
            properties: {
                mag: 7.3,
                place: '112 km E of Port-Vila, Vanuatu',
                time: 1_795_190_000_000,
                updated: 1_795_197_000_000,
                url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us7000tdv2',
                felt: 412,
                alert: 'orange',
                status: 'reviewed',
                tsunami: 1,
                sig: 1021,
                magType: 'mww',
                type: 'earthquake',
                title: 'M 7.3 - 112 km E of Port-Vila, Vanuatu',
            },
            geometry: { type: 'Point', coordinates: [169.37, -17.71, 35.2] },
        },
        {
            type: 'Feature',
            id: 'uw6200tdv3',
            properties: {
                mag: 1.4,
                place: '4 km S of Princeton, Canada',
                time: 1_795_196_000_000,
                type: 'explosion',
                title: 'M 1.4 Explosion - 4 km S of Princeton, Canada',
            },
            geometry: { type: 'Point', coordinates: [-120.51, 49.42, 0] },
        },
        // Without a magnitude, and with nothing to place it by.
        {
            type: 'Feature',
            id: 'nc7500tdv4',
            properties: { mag: null, time: 1_795_195_000_000 },
            geometry: { type: 'Point', coordinates: [-122.8, 38.8, 2.1] },
        },
        { type: 'Feature', id: 'nc7500tdv5', properties: { mag: 2.2, time: 1_795_194_000_000 }, geometry: null },
    ],
}

// Shaped as GDACS answers `/gdacsapi/api/events/geteventlist/SEARCH`, with invented events.
const DISASTERS: GdacsFeed = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            bbox: [167.29, -14.835, 167.29, -14.835],
            geometry: { type: 'Point', coordinates: [167.29, -14.835] },
            properties: {
                eventtype: 'EQ',
                eventid: 1578429,
                episodeid: 1747805,
                eventname: '',
                glide: '',
                name: 'Earthquake in Vanuatu',
                description: 'Earthquake in Vanuatu',
                htmldescription: 'Green M 5.1 Earthquake in Vanuatu at: 20 Nov 2026 17:53:15.',
                icon: 'https://www.gdacs.org/images/gdacs_icons/maps/Green/EQ.png',
                url: {
                    geometry: 'https://www.gdacs.org/gdacsapi/api/polygons/getgeometry?eventtype=EQ&eventid=1578429&episodeid=1747805',
                    report: 'https://www.gdacs.org/report.aspx?eventid=1578429&episodeid=1747805&eventtype=EQ',
                    details: 'https://www.gdacs.org/gdacsapi/api/events/geteventdata?eventtype=EQ&eventid=1578429',
                },
                alertlevel: 'Green',
                alertscore: 1,
                episodealertlevel: 'Green',
                episodealertscore: 0,
                istemporary: 'true',
                iscurrent: 'true',
                country: 'Vanuatu',
                fromdate: '2026-11-20T17:53:15',
                todate: '2026-11-20T17:53:15',
                datemodified: '2026-11-20T18:13:45',
                iso3: 'VUT',
                source: 'NEIC',
                sourceid: '',
                polygonlabel: 'Centroid',
                Class: 'Point_Centroid',
                affectedcountries: [{ iso2: 'VU', iso3: 'VUT', countryname: 'Vanuatu' }],
                severitydata: { severity: 5.1, severitytext: 'Magnitude 5.1M, Depth:94.53km', severityunit: 'M' },
            },
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [128.4, 17.9] },
            properties: {
                eventtype: 'TC',
                eventid: 1001234,
                episodeid: 12,
                eventname: 'JUNIPER-26',
                name: 'Tropical Cyclone JUNIPER-26',
                url: { report: 'https://www.gdacs.org/report.aspx?eventid=1001234&episodeid=12&eventtype=TC' },
                alertlevel: 'Red',
                alertscore: 2.5,
                iscurrent: 'true',
                country: 'Philippines',
                fromdate: '2026-11-17T06:00:00',
                todate: '2026-11-21T12:00:00',
                datemodified: '2026-11-20T12:40:11',
                iso3: 'PHL',
                source: 'JTWC',
                severitydata: { severity: 213.3, severitytext: 'Tropical Cyclone (maximum wind speed of 213 km/h)', severityunit: 'km/h' },
            },
        },
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [39.5, 6.5] },
            properties: {
                eventtype: 'DR',
                eventid: 1027450,
                episodeid: 14,
                eventname: 'East Africa-2026',
                name: 'Drought in Ethiopia, Kenya',
                alertlevel: 'Orange',
                iscurrent: 'false',
                fromdate: '2026-05-21T00:00:00',
                todate: '2026-11-18T00:00:00',
                severitydata: {
                    severity: 1_435_673,
                    severitytext: 'Medium impact for agricultural drought in 1435673 km2',
                    severityunit: 'km2',
                },
            },
        },
        // The cyclone again, as its area, which a list of the map draws beside its point.
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [127, 17],
                        [129, 17],
                        [129, 19],
                        [127, 17],
                    ],
                ],
            },
            properties: { eventtype: 'TC', eventid: 1001234, name: 'Tropical Cyclone JUNIPER-26', fromdate: '2026-11-17T06:00:00' },
        },
        // A type this module does not know, and an event with no date.
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [10, 60] },
            properties: { eventtype: 'XX', eventid: 7, fromdate: '2026-11-01T00:00:00Z' },
        },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [11, 61] }, properties: { eventtype: 'FL', eventid: 8 } },
    ],
}

// Shaped as MetAlerts answers `/weatherapi/metalerts/2.0/current.json?lang=en`, with invented warnings and areas.
const WARNINGS: MetAlertsFeed = {
    type: 'FeatureCollection',
    lang: 'en',
    lastChange: '2026-11-20T18:24:00+00:00',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [4, 62],
                        [6, 62],
                        [6, 63],
                        [4, 63],
                        [4, 62],
                    ],
                ],
            },
            properties: {
                altitude_above_sea_level: 0,
                area: 'North coast',
                awarenessResponse: 'Be aware',
                awarenessSeriousness: 'Challenging situation',
                awareness_level: '2; yellow; Moderate',
                awareness_type: '1; Wind',
                ceiling_above_sea_level: 2743,
                certainty: 'Likely',
                consequences: 'Rough sea: white foam from breaking wave crests.',
                contact: 'https://www.met.no/en/contact-us',
                county: [],
                description: 'Northerly near gale force 7. Decreasing late Saturday evening.',
                event: 'gale',
                eventAwarenessName: 'Gale',
                eventEndingTime: '2026-11-21T23:00:00+00:00',
                geographicDomain: 'marine',
                id: '2.49.0.1.578.0.20261120180429.083',
                instruction: 'Consider leaving the boat in port.',
                resources: [
                    {
                        description: 'CAP file',
                        mimeType: 'application/xml',
                        uri: 'https://api.met.no/weatherapi/metalerts/2.0/current?cap=2.49.0.1.578.0.20261120180429.083',
                    },
                ],
                riskMatrixColor: 'Yellow',
                severity: 'Moderate',
                status: 'Actual',
                title: 'Gale, yellow level, North coast, 2026-11-21T14:00:00+00:00, 2026-11-21T23:00:00+00:00',
                triggerLevel: '13.9m/s',
                type: 'Alert',
                web: 'https://www.met.no/en/weather-and-climate/Extreme-weather-warnings-and-other-warnings-of-severe-weather',
            },
            when: { interval: ['2026-11-21T14:00:00+00:00', '2026-11-21T23:00:00+00:00'] },
        },
        {
            type: 'Feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [10, 59],
                            [11, 59],
                            [11, 60],
                            [10, 60],
                            [10, 59],
                        ],
                    ],
                    [
                        [
                            [12, 59],
                            [16, 59],
                            [16, 61],
                            [12, 61],
                            [12, 59],
                        ],
                        [
                            [13, 59.5],
                            [14, 59.5],
                            [14, 60],
                            [13, 59.5],
                        ],
                    ],
                ],
            },
            properties: {
                area: 'Inland east',
                awareness_level: '4; red; Extreme',
                awareness_type: '10; Rain',
                certainty: 'Observed',
                event: 'rain',
                eventAwarenessName: 'Extreme rain',
                geographicDomain: 'land',
                id: '2.49.0.1.578.0.20261120120000.014',
                riskMatrixColor: 'Red',
                status: 'Actual',
                title: 'Extreme rain, red level, Inland east',
                type: 'Update',
            },
            when: { interval: ['2026-11-20T12:00:00+00:00', '2026-11-22T06:00:00+00:00'] },
        },
        // A test of the service, a warning without its hours, and one without an area.
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [5, 60],
                        [6, 60],
                        [6, 61],
                        [5, 60],
                    ],
                ],
            },
            properties: { id: 'test-1', severity: 'Severe', status: 'Test', area: 'West coast', eventAwarenessName: 'Snow' },
            when: { interval: ['2026-11-20T00:00:00+00:00', '2026-11-20T06:00:00+00:00'] },
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [5, 60],
                        [6, 60],
                        [6, 61],
                        [5, 60],
                    ],
                ],
            },
            properties: { id: 'no-hours', severity: 'Severe', status: 'Actual' },
        },
        {
            type: 'Feature',
            geometry: null,
            properties: { id: 'no-area', status: 'Actual' },
            when: { interval: ['2026-11-20T00:00:00+00:00'] },
        },
    ],
}

describe('the words', () => {
    it('name every kind and every severity', () => {
        expect(Object.keys(INCIDENT_WORDS.kinds).sort()).toEqual([...INCIDENT_KINDS].sort())
        expect(Object.keys(INCIDENT_WORDS.severities).sort()).toEqual([...INCIDENT_SEVERITIES].sort())
        expect(INCIDENT_PART).toEqual({ id: 'incident', words: INCIDENT_WORDS })
    })

    it('order severities, the graver first, with what is not known last', () => {
        expect([...SEVERITY_ORDER].sort()).toEqual([...INCIDENT_SEVERITIES].sort())
        expect((['minor', 'unknown', 'extreme', 'moderate', 'severe'] as const).toSorted(compareSeverity)).toEqual(SEVERITY_ORDER)
        expect(atLeast('severe', 'moderate')).toBe(true)
        expect(atLeast('moderate', 'moderate')).toBe(true)
        expect(atLeast('minor', 'moderate')).toBe(false)
        expect(atLeast('unknown', 'minor')).toBe(false)
    })
})

describe('USGS earthquakes', () => {
    const incidents = parseUsgsQuakes(QUAKES)

    it('reads an event as an incident, with its depth in meters', () => {
        expect(incidents[0]).toEqual({
            id: 'ak2026tdv001',
            lon: -155.385,
            lat: 58.02,
            at: 1_795_198_169_727,
            kind: 'earthquake',
            severity: 'minor',
            magnitude: 0.6,
            label: 'M 0.6 - 74 km NW of Karluk, Alaska',
            url: 'https://earthquake.usgs.gov/earthquakes/eventpage/ak2026tdv001',
            updatedAt: 1_795_198_334_558,
            source: 'usgs',
            properties: {
                place: '74 km NW of Karluk, Alaska',
                type: 'earthquake',
                depth: 300,
                magnitudeType: 'ml',
                status: 'automatic',
                tsunami: false,
                significance: 6,
            },
        })
    })

    it('takes the alert level the USGS gave over the magnitude', () => {
        expect(incidents[1]).toMatchObject({ id: 'us7000tdv2', severity: 'severe', magnitude: 7.3 })
        expect(incidents[1].properties).toMatchObject({ alert: 'orange', tsunami: true, felt: 412, depth: 35_200 })
    })

    it('judges an earthquake by its magnitude where no alert level is given', () => {
        expect([undefined, 3.9, 5, 5.9, 6, 6.9, 7, 9.1].map(quakeSeverity)).toEqual([
            'unknown',
            'minor',
            'moderate',
            'moderate',
            'severe',
            'severe',
            'extreme',
            'extreme',
        ])
    })

    it('marks what is not an earthquake as other', () => {
        expect(incidents[2]).toMatchObject({ id: 'uw6200tdv3', kind: 'other', properties: { type: 'explosion' } })
    })

    it('keeps an event without a magnitude, and skips one without a position', () => {
        expect(incidents.map((incident) => incident.id)).toEqual(['ak2026tdv001', 'us7000tdv2', 'uw6200tdv3', 'nc7500tdv4'])
        expect(incidents[3]).toMatchObject({ severity: 'unknown', label: 'nc7500tdv4' })
        expect(incidents[3].magnitude).toBeUndefined()
    })

    it('names the feed it was given, and reads nothing from what is not a feed', () => {
        expect(parseUsgsQuakes(QUAKES, { source: 'quakes' })[0].source).toBe('quakes')
        expect(parseUsgsQuakes({} as UsgsFeed)).toEqual([])
        expect(parseUsgsQuakes({ features: [null, 7, { id: 'x' }] } as unknown as UsgsFeed)).toEqual([])
    })

    it('judges by the magnitude when the alert level is a word it does not know', () => {
        const feed: UsgsFeed = {
            features: ['purple', 'constructor'].map((alert, index) => ({
                id: `us${String(index)}`,
                properties: { mag: 6.2, time: 1_795_190_000_000, alert },
                geometry: { type: 'Point', coordinates: [10, 60, 12] },
            })),
        }
        expect(parseUsgsQuakes(feed).map((incident) => incident.severity)).toEqual(['severe', 'severe'])
    })
})

describe('GDACS disasters', () => {
    const incidents = parseGdacs(DISASTERS)

    it('reads an earthquake with its magnitude, its dates as UTC', () => {
        expect(incidents[0]).toEqual({
            id: 'EQ1578429',
            lon: 167.29,
            lat: -14.835,
            at: Date.UTC(2026, 10, 20, 17, 53, 15),
            kind: 'earthquake',
            severity: 'minor',
            magnitude: 5.1,
            label: 'Earthquake in Vanuatu',
            url: 'https://www.gdacs.org/report.aspx?eventid=1578429&episodeid=1747805&eventtype=EQ',
            updatedAt: Date.UTC(2026, 10, 20, 18, 13, 45),
            source: 'gdacs',
            properties: {
                eventType: 'EQ',
                eventId: 1578429,
                episodeId: 1747805,
                alertLevel: 'Green',
                alertScore: 1,
                country: 'Vanuatu',
                iso3: 'VUT',
                reportedBy: 'NEIC',
                current: true,
                measure: 5.1,
                unit: 'M',
                measureText: 'Magnitude 5.1M, Depth:94.53km',
            },
        })
    })

    it('reads each type as its kind and each alert level as its severity', () => {
        expect(incidents.map(({ id, kind, severity }) => [id, kind, severity])).toEqual([
            ['EQ1578429', 'earthquake', 'minor'],
            ['TC1001234', 'cyclone', 'extreme'],
            ['DR1027450', 'drought', 'severe'],
            ['XX7', 'other', 'unknown'],
        ])
    })

    it('keeps an event that lasts until its end, and its own measure beside the magnitude', () => {
        const cyclone = incidents[1]
        expect(cyclone.until).toBe(Date.UTC(2026, 10, 21, 12))
        expect(cyclone.magnitude).toBeUndefined()
        expect(cyclone.properties).toMatchObject({ eventName: 'JUNIPER-26', measure: 213.3, unit: 'km/h', current: true })
        expect(incidents[0].until).toBeUndefined()
        expect(incidents[2].properties).toMatchObject({ current: false, unit: 'km2' })
    })

    it('gives an event once, by its point, and skips one without a date', () => {
        expect(incidents.filter((incident) => incident.id === 'TC1001234')).toHaveLength(1)
        expect(incidents.some((incident) => incident.id === 'FL8')).toBe(false)
        expect(incidents.every((incident) => incident.area === undefined)).toBe(true)
    })
})

describe('MetAlerts warnings', () => {
    const incidents = parseMetAlerts(WARNINGS)

    it('reads a warning as a weather incident over its area, for the hours it holds', () => {
        const [gale] = incidents
        expect(gale).toMatchObject({
            id: '2.49.0.1.578.0.20261120180429.083',
            at: Date.UTC(2026, 10, 21, 14),
            until: Date.UTC(2026, 10, 21, 23),
            kind: 'weather',
            severity: 'moderate',
            label: 'Gale, North coast',
            url: 'https://www.met.no/en/weather-and-climate/Extreme-weather-warnings-and-other-warnings-of-severe-weather',
            source: 'metalerts',
            area: {
                type: 'Polygon',
                coordinates: [
                    [
                        [4, 62],
                        [6, 62],
                        [6, 63],
                        [4, 63],
                        [4, 62],
                    ],
                ],
            },
        })
        expect(gale.lon).toBeCloseTo(5, 9)
        expect(gale.lat).toBeCloseTo(62.5, 9)
        expect(gale.properties).toMatchObject({
            event: 'gale',
            eventName: 'Gale',
            area: 'North coast',
            awarenessLevel: 2,
            color: 'yellow',
            awarenessType: '1; Wind',
            certainty: 'Likely',
            domain: 'marine',
            type: 'Alert',
        })
    })

    it('reads the severity from the awareness level where CAP gives none, and stands at the largest part', () => {
        const rain = incidents[1]
        expect(rain).toMatchObject({ severity: 'extreme', label: 'Extreme rain, Inland east' })
        expect(rain.area?.type).toBe('MultiPolygon')
        expect(rain.lon).toBeCloseTo(14, 9)
        expect(rain.lat).toBeCloseTo(60, 9)
        expect(rain.properties).toMatchObject({ awarenessLevel: 4, color: 'red' })
    })

    it('leaves out a test, a warning without its hours and one without an area', () => {
        expect(incidents.map((incident) => incident.id)).toEqual(['2.49.0.1.578.0.20261120180429.083', '2.49.0.1.578.0.20261120120000.014'])
    })

    it('leaves out a cancellation, and the warning it cancels', () => {
        const [gale, rain] = WARNINGS.features
        const cancel = {
            ...gale,
            properties: {
                ...gale.properties,
                id: '2.49.0.1.578.0.20261120200000.090',
                type: 'Cancel',
                references: `noreply@met.no,${String(rain.properties.id)},2026-11-20T12:00:00+00:00`,
            },
        }
        const feed: MetAlertsFeed = { ...WARNINGS, features: [gale, rain, cancel] }
        expect(parseMetAlerts(feed).map((incident) => incident.id)).toEqual([gale.properties.id])
        expect(cancelledMetAlerts(feed)).toEqual([rain.properties.id])
        expect(cancelledMetAlerts(WARNINGS)).toEqual([])
        // A cancellation that names nothing still is no warning.
        const bare = { ...cancel, properties: { ...cancel.properties, references: undefined } }
        expect(parseMetAlerts({ ...WARNINGS, features: [bare] })).toEqual([])
    })

    it('gives the warned areas as zones for a map', () => {
        expect(incidentZones([...incidents, ...parseUsgsQuakes(QUAKES)])).toEqual([
            {
                id: '2.49.0.1.578.0.20261120180429.083',
                area: incidents[0].area,
                label: 'Gale, North coast',
                kind: 'weather',
                severity: 'moderate',
            },
            {
                id: '2.49.0.1.578.0.20261120120000.014',
                area: incidents[1].area,
                label: 'Extreme rain, Inland east',
                kind: 'weather',
                severity: 'extreme',
            },
        ])
    })
})

describe('areas and times', () => {
    it('finds the middle of an area that lies across the antimeridian', () => {
        const across = areaMiddle({
            type: 'Polygon',
            coordinates: [
                [
                    [179, 10],
                    [-179, 10],
                    [-179, 12],
                    [179, 12],
                    [179, 10],
                ],
            ],
        })
        expect(Math.abs(across?.[0] ?? 0)).toBeCloseTo(180, 9)
        expect(across?.[1]).toBeCloseTo(11, 9)
        const east = areaMiddle({
            type: 'Polygon',
            coordinates: [
                [
                    [178, 0],
                    [-179, 0],
                    [-179, 2],
                    [178, 2],
                ],
            ],
        })
        expect(east?.[0]).toBeCloseTo(179.5, 9)
        const west = areaMiddle({
            type: 'Polygon',
            coordinates: [
                [
                    [-178, 0],
                    [179, 0],
                    [179, 2],
                    [-178, 2],
                ],
            ],
        })
        expect(west?.[0]).toBeCloseTo(-179.5, 9)
    })

    it('finds the middle of an area, whichever way its outline runs', () => {
        expect(
            areaMiddle({
                type: 'Polygon',
                coordinates: [
                    [
                        [0, 0],
                        [0, 2],
                        [4, 2],
                        [4, 0],
                    ],
                ],
            }),
        ).toEqual([2, 1])
        expect(
            areaMiddle({
                type: 'Polygon',
                coordinates: [
                    [
                        [0, 0],
                        [4, 0],
                        [4, 2],
                        [0, 2],
                        [0, 0],
                    ],
                ],
            }),
        ).toEqual([2, 1])
        expect(
            areaMiddle({
                type: 'Polygon',
                coordinates: [
                    [
                        [1, 1],
                        [1, 1],
                        [1, 1],
                    ],
                ],
            }),
        ).toEqual([1, 1])
        expect(areaMiddle({ type: 'Polygon', coordinates: [] })).toBeUndefined()
    })

    it('keeps the incidents that hold at a time', () => {
        const at = (id: string, from: number, until?: number): Incident => ({
            id,
            lon: 0,
            lat: 0,
            at: from,
            kind: 'weather',
            severity: 'minor',
            label: id,
            ...(until === undefined ? {} : { until }),
        })
        const all = [at('past', 0, 10), at('now', 5, 30), at('later', 25, 40), at('quake', 12), at('old', 1)]
        expect(incidentsAt(all, 20).map((incident) => incident.id)).toEqual(['now', 'quake', 'old'])
        expect(incidentsAt(all, 20, 10).map((incident) => incident.id)).toEqual(['now', 'quake'])
        expect(incidentsAt(parseMetAlerts(WARNINGS), Date.UTC(2026, 10, 21, 0)).map((incident) => incident.label)).toEqual([
            'Extreme rain, Inland east',
        ])
    })
})
