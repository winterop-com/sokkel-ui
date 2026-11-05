/**
 * Pictures for the stories' image files, drawn as SVG and handed out as data URIs, so an image
 * file has a thumbnail and a preview with nothing fetched. Each is a fixed scene, the same on every
 * render.
 */
function uri(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function scene(sky: [string, string], body: string): string {
    return uri(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="800" height="600"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="400" height="300" fill="url(#s)"/>${body}</svg>`,
    )
}

/** A harbor at dusk: a low sun, a breakwater, and two boats on the water. */
export const HARBOR_DUSK = scene(
    ['#f7b267', '#f4845f'],
    '<circle cx="290" cy="150" r="38" fill="#fde4a6"/><rect y="168" width="400" height="132" fill="#355070"/><path d="M0 168h400v6H0z" fill="#6d597a" opacity=".6"/><path d="M0 196h170l18-10h40v10H0z" fill="#2a3d55"/><path d="M60 230l60 0-8 12h-44z" fill="#1d2b3d"/><path d="M88 230V196l22 30z" fill="#e8e1d5"/><path d="M250 250h70l-10 12h-50z" fill="#1d2b3d"/><path d="M282 250v-30l18 26z" fill="#e8e1d5"/><path d="M180 205h220M120 222h120M240 270h150" stroke="#fde4a6" stroke-width="2" opacity=".45"/>',
)

/** A coastline by day: cliffs, a lighthouse, and a calm sea. */
export const LIGHTHOUSE = scene(
    ['#8ecae6', '#d6eef7'],
    '<path d="M0 180h400v120H0z" fill="#219ebc"/><path d="M0 150l60-20 50 10 40-30 50 40v150H0z" fill="#5b7553"/><path d="M0 190l70-10 60 14 70-4v110H0z" fill="#3d5a40"/><rect x="118" y="70" width="18" height="60" fill="#f1f1f1"/><path d="M118 85h18v10h-18zM118 105h18v10h-18z" fill="#d1495b"/><path d="M114 70h26l-13-14z" fill="#d1495b"/><circle cx="127" cy="62" r="4" fill="#ffd166"/><path d="M220 230h160M250 250h120M230 270h150" stroke="#e0f4fb" stroke-width="2" opacity=".6"/><circle cx="330" cy="60" r="20" fill="#fff8e1"/>',
)

/** A forest under fog: rows of pines fading into the distance. */
export const PINES = scene(
    ['#cfd8dc', '#eceff1'],
    '<path d="M0 170l20-40 20 40 15-50 20 50 20-35 20 35 18-45 20 45 20-38 20 38 16-48 20 48 20-36 20 36 18-44 20 44 20-40 20 40 18-46 20 46 15-38 20 38v130H0z" fill="#90a4ae"/><path d="M0 220l25-60 25 60 20-70 25 70 25-55 25 55 22-65 25 65 25-58 25 58 20-68 25 68 25-55 25 55 22-62 25 62v80H0z" fill="#546e7a"/><path d="M0 270l30-75 30 75 25-85 30 85 30-70 30 70 26-80 30 80 30-72 30 72 26-84 30 84v30H0z" fill="#263238"/>',
)

/** A field at noon: rolling hills in two greens and a bright sun. */
export const FIELD = scene(
    ['#4cc9f0', '#bde0fe'],
    '<circle cx="80" cy="70" r="30" fill="#fff3b0"/><path d="M0 190c80-40 160-40 240-10s120 10 160-10v130H0z" fill="#80b918"/><path d="M0 230c90-30 180-20 260 10s110 0 140-10v70H0z" fill="#55a630"/><path d="M0 270c120-20 240-20 400 0v30H0z" fill="#2b9348"/>',
)

const GRID = [60, 110, 160, 210].map((y) => `<path d="M40 ${y}h340"/>`).join('')

/** A plotted series as a saved chart: axes, gridlines and a rising line. */
export const CHART = uri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="800" height="600"><rect width="400" height="300" fill="#f8fafc"/><g stroke="#e2e8f0">${GRID}</g><path d="M40 260h340M40 40v220" stroke="#94a3b8"/><path d="M40 230l40-20 40 8 40-40 40 10 40-50 40 6 40-60 40-20" fill="none" stroke="#3b82f6" stroke-width="4" stroke-linejoin="round"/><path d="M40 245l40-6 40 4 40-18 40 2 40-22 40 6 40-28 40-6" fill="none" stroke="#f97316" stroke-width="3" stroke-linejoin="round" stroke-dasharray="6 5"/></svg>`,
)
