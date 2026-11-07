/**
 * Portraits of Tidevann's people, drawn as SVG and handed out as data URIs, so an avatar shows a
 * picture with nothing fetched. Each is a fictional head and shoulders on a ground of its own, in
 * flat shapes that still read as a face at 20px, and the same on every render.
 */
function uri(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function portrait(ground: string, body: string): string {
    return uri(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 4 56 56" width="112" height="112"><rect x="4" y="4" width="56" height="56" fill="${ground}"/>${body}</svg>`,
    )
}

/** Two eyes and a small smile, centered on the face. */
function face(eyes: number, ink: string, lips: string): string {
    return `<g fill="${ink}"><circle cx="27.6" cy="${String(eyes)}" r="1.15"/><circle cx="36.4" cy="${String(eyes)}" r="1.15"/></g><path d="M29.4 ${String(eyes + 6)}q2.6 2.1 5.2 0" fill="none" stroke="${lips}" stroke-width="1.25" stroke-linecap="round"/>`
}

/** ada: a dark brown bob with a fringe, round glasses and a mustard sweater, on teal. */
export const ADA = portrait(
    '#9ccad6',
    '<path d="M16.5 31c0-12 6.8-19 15.5-19s15.5 7 15.5 19v10c0 2-1.5 3.5-3.5 3.5h-24c-2 0-3.5-1.5-3.5-3.5z" fill="#3b2a21"/>' +
        '<path d="M8 64c0-10 9.5-16 24-16s24 6 24 16z" fill="#e0a73a"/>' +
        '<path d="M27.3 40h9.4v8c0 4.2-9.4 4.2-9.4 0z" fill="#d79c78"/>' +
        '<ellipse cx="32" cy="30.5" rx="11" ry="12.6" fill="#efc19e"/>' +
        '<path d="M20.6 29c-.6-9 4.6-14.6 11.4-14.6s12 5.6 11.4 14.6c-3.4-1.8-6-4.4-7.6-7.2-3 2.8-8.6 5.8-15.2 7.2z" fill="#3b2a21"/>' +
        '<g fill="none" stroke="#2c211c" stroke-width="1.1"><circle cx="27.6" cy="31.2" r="3.4"/><circle cx="36.4" cy="31.2" r="3.4"/><path d="M31 31.2h2"/></g>' +
        face(31.2, '#2c211c', '#a85a4b'),
)

/** grace: a full cloud of dark curls, gold earrings and a teal top, on peach. */
export const GRACE = portrait(
    '#f3c8a4',
    '<g fill="#231814"><circle cx="32" cy="21.5" r="14"/><circle cx="19.5" cy="26" r="8.6"/><circle cx="44.5" cy="26" r="8.6"/><circle cx="20.5" cy="34.5" r="6"/><circle cx="43.5" cy="34.5" r="6"/><circle cx="23.5" cy="13" r="5.6"/><circle cx="32" cy="11" r="6"/><circle cx="40.5" cy="13" r="5.6"/><circle cx="15.5" cy="19.5" r="4.8"/><circle cx="48.5" cy="19.5" r="4.8"/></g>' +
        '<path d="M8 64c0-10 9.5-15.5 24-15.5s24 5.5 24 15.5z" fill="#2a8b82"/>' +
        '<path d="M27.4 40h9.2v8.5l-4.6 5-4.6-5z" fill="#6c3f27"/>' +
        '<ellipse cx="32" cy="31.5" rx="10.6" ry="12.2" fill="#8a5739"/>' +
        '<path d="M21.6 28c.8-6.2 4.8-10 10.4-10s9.6 3.8 10.4 10c-3-2.6-6.4-4-10.4-4s-7.4 1.4-10.4 4z" fill="#231814"/>' +
        '<g fill="#f0c24a"><circle cx="21.2" cy="37" r="1.7"/><circle cx="42.8" cy="37" r="1.7"/></g>' +
        face(31.8, '#1b120f', '#4f2a1d'),
)

/** linus: short copper hair and a full beard, a navy hoodie, on sage. */
export const LINUS = portrait(
    '#b6cd9d',
    '<path d="M7 64c0-10 8-16 16.5-17.6 2 3 5.2 4.6 8.5 4.6s6.5-1.6 8.5-4.6C49 48 57 54 57 64z" fill="#34425f"/>' +
        '<path d="M22.5 46.5c2 4.8 5.6 7.4 9.5 7.4s7.5-2.6 9.5-7.4" fill="none" stroke="#4b5b7e" stroke-width="3"/>' +
        '<path d="M29 54.5v5.5M35 54.5v5.5" stroke="#e8e3d7" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M27.4 40h9.2v7.5c0 3.6-9.2 3.6-9.2 0z" fill="#ddb090"/>' +
        '<g fill="#f2cdb0"><circle cx="21" cy="31" r="2.6"/><circle cx="43" cy="31" r="2.6"/></g>' +
        '<path d="M21 27c0-7.6 4.6-12 11-12s11 4.4 11 12v5c0 7.2-4.6 12-11 12s-11-4.8-11-12z" fill="#f2cdb0"/>' +
        '<path d="M20.4 28c-1-9.4 4.2-15.4 11.6-15.4S44.6 18.6 43.6 28c-1-3.6-2.6-6.2-4.6-7.4-3.4 1.6-10.6 1.6-14 0-2 1.2-3.6 3.8-4.6 7.4z" fill="#b2552b"/>' +
        '<path d="M21 31.5c0 8.2 4.6 12.7 11 12.7s11-4.5 11-12.7c-1.4 2.6-3.6 4.2-6 4.2-1.6-1.6-3-2.2-5-2.2s-3.4.6-5 2.2c-2.4 0-4.6-1.6-6-4.2z" fill="#a24c25"/>' +
        '<path d="M25.4 26.6h4.2M34.4 26.6h4.2" stroke="#a24c25" stroke-width="1.3" stroke-linecap="round"/>' +
        face(30, '#2a211d', '#f2cdb0'),
)

/** margaret: silver hair in a bun, pearl earrings and a plum cardigan over a white collar, on slate blue. */
export const MARGARET = portrait(
    '#6f8aab',
    '<circle cx="32" cy="12" r="6.6" fill="#e6e2dc"/>' +
        '<path d="M8 64c0-10 9.5-16 24-16s24 6 24 16z" fill="#8c3a4c"/>' +
        '<path d="M25.6 47.6 32 57l6.4-9.4z" fill="#f4f0e9"/>' +
        '<path d="M27.6 40h8.8v8c0 4-8.8 4-8.8 0z" fill="#b07a55"/>' +
        '<ellipse cx="32" cy="31" rx="10.5" ry="13" fill="#cb936b"/>' +
        '<path d="M20 32c-1.2-11.6 4.8-18.6 12-18.6s13.2 7 12 18.6c-1.2-5.4-3-8-5-9.6-4 1.8-10 1.8-14 0-2 1.6-3.8 4.2-5 9.6z" fill="#e6e2dc"/>' +
        '<path d="M32 15v6.4" stroke="#cbc5bc" stroke-width="1"/>' +
        '<g fill="#f6f2ec"><circle cx="21.4" cy="36" r="1.5"/><circle cx="42.6" cy="36" r="1.5"/></g>' +
        face(31.4, '#2b201b', '#93483f'),
)

/** Each portrait by its person's username. */
export const PORTRAITS: Record<string, string> = { ada: ADA, grace: GRACE, linus: LINUS, margaret: MARGARET }

/**
 * The picture a person of Tidevann's team has set, as an app would hold it: ada, grace and linus
 * have one, while margaret and the services show their initials, as a real team is mixed.
 */
export function pictureOf(name: string): string | undefined {
    return name === 'margaret' ? undefined : PORTRAITS[name]
}
