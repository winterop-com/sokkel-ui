/**
 * The pictures the clips are made of: a scene of Tidevann's world drawn at any second, the same at
 * the same second every time, on a canvas or an offscreen one. Each video names its scene, its
 * hues and its seed, so no two look alike.
 */

export type SceneKind = 'sea' | 'lighthouse' | 'train' | 'peaks' | 'aurora' | 'rain' | 'tide' | 'islands' | 'fields'

/** What a clip draws: its scene, two hues (degrees on the color wheel), a seed, and the words on its title card. */
export interface SceneSpec {
    kind: SceneKind
    hue: number
    accent: number
    seed: number
    title: string
    channel: string
    duration: number
}

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

/** A small seeded random source, the same numbers for the same seed. */
export function seeded(seed: number): () => number {
    let state = seed >>> 0
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
        mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
    }
}

const hsl = (hue: number, saturation: number, lightness: number, alpha = 1) =>
    `hsla(${String(Math.round(hue))}, ${String(saturation)}%, ${String(lightness)}%, ${String(alpha)})`

function sky(ctx: Context, w: number, h: number, top: string, bottom: string, until = 1) {
    const ground = ctx.createLinearGradient(0, 0, 0, h * until)
    ground.addColorStop(0, top)
    ground.addColorStop(1, bottom)
    ctx.fillStyle = ground
    ctx.fillRect(0, 0, w, h * until)
}

/** A band of water or hills whose top edge is a sum of slow waves, filled down to the bottom. */
function wave(
    ctx: Context,
    w: number,
    h: number,
    base: number,
    height: number,
    length: number,
    shift: number,
    fill: string | CanvasGradient,
) {
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w + 8; x += 8) {
        const y =
            base +
            Math.sin((x / length) * Math.PI * 2 + shift) * height +
            Math.sin((x / (length * 0.37)) * Math.PI * 2 - shift * 1.7) * height * 0.3
        ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
}

function stars(ctx: Context, w: number, h: number, seed: number, t: number, count: number, until: number) {
    const random = seeded(seed)
    for (let index = 0; index < count; index += 1) {
        const x = random() * w
        const y = random() * h * until
        const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.6 + random() * 1.4) + random() * 6))
        ctx.fillStyle = `rgba(255, 255, 255, ${String(twinkle * 0.85)})`
        const size = random() < 0.1 ? 2.2 : 1.2
        ctx.fillRect(x, y, size * (w / 1280) + 0.6, size * (w / 1280) + 0.6)
    }
}

function boat(ctx: Context, x: number, y: number, scale: number, tilt: number, color: string) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tilt)
    ctx.scale(scale, scale)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-40, 0)
    ctx.lineTo(40, 0)
    ctx.lineTo(28, 14)
    ctx.lineTo(-30, 14)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(-2, -46, 4, 46)
    ctx.beginPath()
    ctx.moveTo(4, -44)
    ctx.lineTo(34, -6)
    ctx.lineTo(4, -6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
}

function sea(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    const progress = t / spec.duration
    sky(ctx, w, h, hsl(spec.hue, 55, 22 + progress * 20), hsl(spec.accent, 75, 62 + progress * 8), 0.62)
    const sunY = h * (0.62 - progress * 0.32)
    const sun = ctx.createRadialGradient(w * 0.68, sunY, 0, w * 0.68, sunY, h * 0.22)
    sun.addColorStop(0, hsl(spec.accent + 20, 95, 88))
    sun.addColorStop(0.25, hsl(spec.accent + 10, 90, 70, 0.9))
    sun.addColorStop(1, hsl(spec.accent, 90, 60, 0))
    ctx.fillStyle = sun
    ctx.fillRect(w * 0.68 - h * 0.22, sunY - h * 0.22, h * 0.44, h * 0.44)
    const water = ctx.createLinearGradient(0, h * 0.6, 0, h)
    water.addColorStop(0, hsl(spec.hue, 50, 38))
    water.addColorStop(1, hsl(spec.hue, 60, 14))
    ctx.fillStyle = water
    ctx.fillRect(0, h * 0.6, w, h * 0.4)
    // The sun's path on the water.
    for (let index = 0; index < 14; index += 1) {
        const y = h * 0.63 + index * h * 0.025
        const width = (w * 0.05 + index * w * 0.01) * (0.6 + 0.4 * Math.sin(t * 2 + index))
        ctx.fillStyle = hsl(spec.accent + 15, 90, 80, 0.35 - index * 0.02)
        ctx.fillRect(w * 0.68 - width / 2, y, width, h * 0.006)
    }
    wave(ctx, w, h, h * 0.7, h * 0.012, w * 0.5, t * 0.8, hsl(spec.hue, 45, 30, 0.7))
    const bob = Math.sin(t * 1.6) * h * 0.008
    boat(ctx, w * (0.1 + progress * 0.5), h * 0.72 + bob, w / 1280, Math.sin(t * 1.6 + 1) * 0.05, hsl(spec.hue, 40, 10))
    wave(ctx, w, h, h * 0.78, h * 0.018, w * 0.42, t * 1.2 + 2, hsl(spec.hue, 50, 24, 0.85))
    wave(ctx, w, h, h * 0.88, h * 0.024, w * 0.33, t * 1.6 + 4, hsl(spec.hue, 55, 17, 0.95))
}

function lighthouse(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    sky(ctx, w, h, hsl(spec.hue, 60, 6), hsl(spec.hue, 50, 24), 0.75)
    stars(ctx, w, h, spec.seed, t, 140, 0.7)
    ctx.fillStyle = hsl(spec.accent, 30, 92, 0.9)
    ctx.beginPath()
    ctx.arc(w * 0.18, h * 0.2, h * 0.05, 0, Math.PI * 2)
    ctx.fill()
    // The headland and the tower.
    ctx.fillStyle = hsl(spec.hue, 40, 8)
    ctx.beginPath()
    ctx.moveTo(w * 0.55, h)
    ctx.quadraticCurveTo(w * 0.62, h * 0.66, w * 0.78, h * 0.64)
    ctx.lineTo(w, h * 0.62)
    ctx.lineTo(w, h)
    ctx.fill()
    const towerX = w * 0.76
    ctx.fillStyle = hsl(0, 0, 88)
    ctx.beginPath()
    ctx.moveTo(towerX - w * 0.022, h * 0.65)
    ctx.lineTo(towerX + w * 0.022, h * 0.65)
    ctx.lineTo(towerX + w * 0.013, h * 0.36)
    ctx.lineTo(towerX - w * 0.013, h * 0.36)
    ctx.fill()
    ctx.fillStyle = hsl(spec.accent, 70, 45)
    for (let band = 0; band < 3; band += 1) ctx.fillRect(towerX - w * 0.02, h * (0.42 + band * 0.08), w * 0.04, h * 0.025)
    // The beam turning.
    const angle = t * 1.1
    const lamp = { x: towerX, y: h * 0.34 }
    const reach = w * 0.9
    const spread = 0.12
    const facing = Math.cos(angle)
    const beam = ctx.createLinearGradient(lamp.x, lamp.y, lamp.x + reach * facing, lamp.y)
    beam.addColorStop(0, hsl(spec.accent + 20, 100, 85, 0.75))
    beam.addColorStop(1, hsl(spec.accent + 20, 100, 85, 0))
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(lamp.x, lamp.y)
    ctx.lineTo(lamp.x + reach * facing, lamp.y - reach * spread * Math.abs(Math.sin(angle) + 0.2))
    ctx.lineTo(lamp.x + reach * facing, lamp.y + reach * spread * Math.abs(Math.sin(angle) + 0.2))
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = hsl(spec.accent + 20, 100, 85)
    ctx.beginPath()
    ctx.arc(lamp.x, lamp.y, h * 0.018, 0, Math.PI * 2)
    ctx.fill()
    wave(ctx, w, h, h * 0.82, h * 0.016, w * 0.4, t * 1.3, hsl(spec.hue, 50, 12, 0.95))
    wave(ctx, w, h, h * 0.9, h * 0.02, w * 0.3, t * 1.8 + 3, hsl(spec.hue, 55, 7))
}

function ridge(ctx: Context, w: number, h: number, seed: number, base: number, height: number, fill: string, offset: number) {
    const random = seeded(seed)
    const points = Array.from({ length: 14 }, () => random())
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = -w; x <= w * 2; x += w / 12) {
        const index = Math.floor((((x + offset) / (w / 12)) % 14) + 14) % 14
        ctx.lineTo(x, base - (points[index] ?? 0) * height)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
}

function train(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    sky(ctx, w, h, hsl(spec.hue, 55, 40), hsl(spec.accent, 80, 72), 0.7)
    ctx.fillStyle = hsl(spec.accent + 10, 90, 85, 0.9)
    ctx.beginPath()
    ctx.arc(w * 0.3, h * 0.38, h * 0.08, 0, Math.PI * 2)
    ctx.fill()
    ridge(ctx, w, h, spec.seed, h * 0.55, h * 0.18, hsl(spec.hue, 25, 50), (t * w) / 60)
    ridge(ctx, w, h, spec.seed + 1, h * 0.64, h * 0.12, hsl(spec.accent, 35, 42), (t * w) / 25)
    ctx.fillStyle = hsl(spec.accent, 40, 30)
    ctx.fillRect(0, h * 0.7, w, h * 0.3)
    // The line and the train going by.
    ctx.fillStyle = hsl(spec.hue, 20, 18)
    ctx.fillRect(0, h * 0.715, w, h * 0.008)
    const length = w * 0.75
    const lap = 14
    const x = ((t % lap) / lap) * (w + length * 1.4) - length * 1.2
    for (let car = 0; car < 6; car += 1) {
        const left = x + car * (length / 6)
        ctx.fillStyle = car === 5 ? hsl(spec.hue, 50, 30) : hsl(spec.hue + 180, 25, 82)
        ctx.fillRect(left, h * 0.655, length / 6 - w * 0.006, h * 0.058)
        ctx.fillStyle = hsl(spec.accent + 20, 90, 70, 0.9)
        for (let pane = 0; pane < 4; pane += 1) ctx.fillRect(left + (pane + 0.5) * (length / 26), h * 0.668, length / 40, h * 0.014)
    }
    // Poles rushing by in front.
    ctx.fillStyle = hsl(spec.hue, 30, 14)
    const spacing = w * 0.3
    const shift = (t * w * 0.45) % spacing
    for (let pole = -1; pole < 5; pole += 1) {
        const left = pole * spacing - shift
        ctx.fillRect(left, h * 0.42, w * 0.008, h * 0.58)
        ctx.fillRect(left - w * 0.02, h * 0.45, w * 0.048, h * 0.008)
    }
    ctx.strokeStyle = hsl(spec.hue, 30, 14, 0.7)
    ctx.lineWidth = Math.max(1, h / 400)
    ctx.beginPath()
    for (let pole = -1; pole < 5; pole += 1) {
        const left = pole * spacing - shift
        ctx.moveTo(left, h * 0.455)
        ctx.quadraticCurveTo(left + spacing / 2, h * 0.5, left + spacing, h * 0.455)
    }
    ctx.stroke()
}

function peaks(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    const progress = t / spec.duration
    sky(ctx, w, h, hsl(spec.hue + progress * 40, 50, 30 + progress * 10), hsl(spec.accent, 60, 75), 0.8)
    ridge(ctx, w, h, spec.seed, h * 0.5, h * 0.3, hsl(spec.hue, 20, 70), t * 4)
    ridge(ctx, w, h, spec.seed + 7, h * 0.66, h * 0.25, hsl(spec.hue, 25, 45), t * 9)
    ridge(ctx, w, h, spec.seed + 13, h * 0.84, h * 0.2, hsl(spec.hue, 30, 22), t * 18)
    // Snow falling.
    const random = seeded(spec.seed + 99)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    for (let flake = 0; flake < 160; flake += 1) {
        const speed = 0.04 + random() * 0.08
        const startX = random()
        const startY = random()
        const size = (1 + random() * 2.5) * (w / 1280)
        const y = ((startY + t * speed) % 1) * h
        const x = ((startX + Math.sin(t * 0.8 + flake) * 0.01 + t * 0.006) % 1) * w
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
    }
}

function aurora(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    sky(ctx, w, h, hsl(spec.hue, 60, 5), hsl(spec.hue, 45, 16), 0.7)
    stars(ctx, w, h, spec.seed, t, 180, 0.65)
    // Curtains swaying.
    const step = Math.max(4, Math.round(w / 200))
    for (let curtain = 0; curtain < 3; curtain += 1) {
        const hue = spec.accent + curtain * 25
        // One gradient a curtain, moved to each strip, its strength the strip's alpha.
        const band = ctx.createLinearGradient(0, 0, 0, h * 0.32)
        band.addColorStop(0, hsl(hue, 90, 60, 0))
        band.addColorStop(0.7, hsl(hue, 90, 60, 1))
        band.addColorStop(1, hsl(hue, 90, 60, 0))
        ctx.fillStyle = band
        for (let x = 0; x < w; x += step) {
            const sway = Math.sin(x / (w * 0.18) + t * (0.3 + curtain * 0.1) + curtain) * h * 0.06
            const top = h * (0.12 + curtain * 0.06) + sway
            const bright = 0.18 + 0.14 * Math.sin(x / (w * 0.05) + t * 1.4 + curtain * 2)
            if (bright <= 0) continue
            ctx.globalAlpha = bright
            ctx.setTransform(1, 0, 0, 1, x, top)
            ctx.fillRect(0, 0, step, h * 0.32)
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = 1
    }
    // The fjord's walls and their mirror in still water.
    ctx.fillStyle = hsl(spec.hue, 40, 6)
    ctx.beginPath()
    ctx.moveTo(0, h * 0.68)
    ctx.lineTo(w * 0.15, h * 0.48)
    ctx.lineTo(w * 0.32, h * 0.62)
    ctx.lineTo(w * 0.42, h * 0.68)
    ctx.lineTo(w * 0.62, h * 0.68)
    ctx.lineTo(w * 0.8, h * 0.5)
    ctx.lineTo(w, h * 0.58)
    ctx.lineTo(w, h * 0.68)
    ctx.closePath()
    ctx.fill()
    const water = ctx.createLinearGradient(0, h * 0.68, 0, h)
    water.addColorStop(0, hsl(spec.accent, 45, 18))
    water.addColorStop(1, hsl(spec.hue, 50, 4))
    ctx.fillStyle = water
    ctx.fillRect(0, h * 0.68, w, h * 0.32)
    for (let line = 0; line < 9; line += 1) {
        ctx.fillStyle = hsl(spec.accent, 80, 60, 0.08)
        ctx.fillRect(w * 0.1 + Math.sin(t + line) * w * 0.02, h * (0.72 + line * 0.03), w * 0.8, h * 0.004)
    }
}

function rain(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    sky(ctx, w, h, hsl(spec.hue, 35, 8), hsl(spec.hue, 30, 22), 1)
    const random = seeded(spec.seed)
    // The skyline, its windows going on and off.
    let x = 0
    while (x < w) {
        const width = w * (0.05 + random() * 0.07)
        const height = h * (0.25 + random() * 0.4)
        ctx.fillStyle = hsl(spec.hue, 20, 10 + random() * 6)
        ctx.fillRect(x, h * 0.8 - height, width, height)
        for (let row = 0; row < height / (h * 0.04) - 1; row += 1) {
            for (let column = 0; column < width / (w * 0.016) - 1; column += 1) {
                const lit = Math.sin(row * 12.9 + column * 78.2 + x + Math.floor(t / 3) * 0.7) > 0.35
                if (!lit) continue
                ctx.fillStyle = hsl(spec.accent, 80, 70, 0.8)
                ctx.fillRect(x + w * 0.006 + column * w * 0.016, h * 0.8 - height + h * 0.015 + row * h * 0.04, w * 0.007, h * 0.018)
            }
        }
        x += width + w * 0.008
    }
    const street = ctx.createLinearGradient(0, h * 0.8, 0, h)
    street.addColorStop(0, hsl(spec.hue, 25, 14))
    street.addColorStop(1, hsl(spec.hue, 30, 6))
    ctx.fillStyle = street
    ctx.fillRect(0, h * 0.8, w, h * 0.2)
    for (let glow = 0; glow < 8; glow += 1) {
        ctx.fillStyle = hsl(spec.accent, 80, 65, 0.06 + 0.03 * Math.sin(t * 2 + glow))
        ctx.fillRect(glow * w * 0.13, h * 0.82, w * 0.05, h * 0.18)
    }
    // Rain.
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.35)'
    ctx.lineWidth = Math.max(1, w / 1280)
    ctx.beginPath()
    for (let drop = 0; drop < 220; drop += 1) {
        const speed = 0.9 + random() * 0.6
        const dropX = random() * w
        const dropY = ((random() + t * speed) % 1) * h
        ctx.moveTo(dropX, dropY)
        ctx.lineTo(dropX - w * 0.004, dropY + h * 0.035)
    }
    ctx.stroke()
}

/** The water level at a second of the day the clip shows, from 0 (low water) to 1 (high water). */
const levelAt = (hours: number) => 0.5 + 0.42 * Math.sin((hours / 12.42) * Math.PI * 2) + 0.06 * Math.sin((hours / 6.2) * Math.PI * 2)

function tide(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    sky(ctx, w, h, hsl(spec.hue, 35, 14), hsl(spec.hue, 40, 8), 1)
    const left = w * 0.08
    const right = w * 0.92
    const top = h * 0.16
    const bottom = h * 0.78
    ctx.strokeStyle = hsl(spec.hue, 25, 40, 0.5)
    ctx.lineWidth = Math.max(1, w / 1280)
    ctx.font = `${String(Math.round(h * 0.03))}px ui-monospace, monospace`
    ctx.fillStyle = hsl(spec.hue, 20, 70, 0.8)
    for (let hour = 0; hour <= 24; hour += 3) {
        const x = left + ((right - left) * hour) / 24
        ctx.beginPath()
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
        ctx.stroke()
        ctx.fillText(`${String(hour).padStart(2, '0')}:00`, x - w * 0.02, bottom + h * 0.05)
    }
    const now = (t / spec.duration) * 24
    const curve = (hours: number) => bottom - levelAt(hours) * (bottom - top)
    const fill = ctx.createLinearGradient(0, top, 0, bottom)
    fill.addColorStop(0, hsl(spec.accent, 70, 55, 0.55))
    fill.addColorStop(1, hsl(spec.accent, 70, 35, 0.1))
    ctx.beginPath()
    ctx.moveTo(left, bottom)
    for (let hours = 0; hours <= now; hours += 0.1) ctx.lineTo(left + ((right - left) * hours) / 24, curve(hours))
    ctx.lineTo(left + ((right - left) * now) / 24, bottom)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = hsl(spec.accent, 80, 70)
    ctx.lineWidth = Math.max(2, w / 500)
    ctx.beginPath()
    for (let hours = 0; hours <= now; hours += 0.1) {
        const x = left + ((right - left) * hours) / 24
        if (hours === 0) ctx.moveTo(x, curve(hours))
        else ctx.lineTo(x, curve(hours))
    }
    ctx.stroke()
    const nowX = left + ((right - left) * now) / 24
    ctx.fillStyle = hsl(spec.accent, 90, 80)
    ctx.beginPath()
    ctx.arc(nowX, curve(now), h * 0.014, 0, Math.PI * 2)
    ctx.fill()
    const level = levelAt(now)
    ctx.font = `600 ${String(Math.round(h * 0.045))}px system-ui, sans-serif`
    ctx.fillText(`${(level * 4.2).toFixed(2)} m`, left, top - h * 0.04)
    // The harbor wall with the water against it.
    wave(ctx, w, h, h * (0.98 - level * 0.08), h * 0.008, w * 0.3, t * 1.4, hsl(spec.hue, 50, 30, 0.9))
}

function islands(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    const water = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.7)
    water.addColorStop(0, hsl(spec.hue, 55, 42))
    water.addColorStop(1, hsl(spec.hue, 60, 22))
    ctx.fillStyle = water
    ctx.fillRect(0, 0, w, h)
    const random = seeded(spec.seed)
    const places: { x: number; y: number }[] = []
    for (let island = 0; island < 6; island += 1) {
        const cx = w * (0.12 + random() * 0.76)
        const cy = h * (0.15 + random() * 0.7)
        const radius = h * (0.05 + random() * 0.08)
        places.push({ x: cx, y: cy })
        const bumps = Array.from({ length: 10 }, () => 0.7 + random() * 0.5)
        for (const [ring, color] of [
            [1.25, hsl(spec.hue - 10, 50, 62, 0.5)],
            [1, hsl(spec.accent, 35, 58)],
            [0.6, hsl(spec.accent + 20, 40, 42)],
        ] as const) {
            ctx.beginPath()
            for (let step = 0; step <= 10; step += 1) {
                const angle = (step / 10) * Math.PI * 2
                const reach = radius * ring * (bumps[step % 10] ?? 1)
                const x = cx + Math.cos(angle) * reach
                const y = cy + Math.sin(angle) * reach * 0.8
                if (step === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            }
            ctx.closePath()
            ctx.fillStyle = color
            ctx.fill()
        }
    }
    // The ferry going round the islands, its wake behind it.
    const lap = spec.duration / 2
    const along = ((t % lap) / lap) * places.length
    const from = places[Math.floor(along) % places.length] ?? { x: 0, y: 0 }
    const to = places[(Math.floor(along) + 1) % places.length] ?? { x: 0, y: 0 }
    const part = along % 1
    ctx.setLineDash([w * 0.008, w * 0.008])
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = Math.max(1, w / 900)
    ctx.beginPath()
    places.forEach((place, index) => (index === 0 ? ctx.moveTo(place.x, place.y) : ctx.lineTo(place.x, place.y)))
    ctx.closePath()
    ctx.stroke()
    ctx.setLineDash([])
    const ferryX = from.x + (to.x - from.x) * part
    const ferryY = from.y + (to.y - from.y) * part
    ctx.fillStyle = hsl(spec.accent + 30, 90, 85)
    ctx.beginPath()
    ctx.arc(ferryX, ferryY, h * 0.014, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = hsl(0, 0, 100, 0.25)
    for (let ring = 1; ring <= 3; ring += 1) {
        ctx.beginPath()
        ctx.arc(ferryX, ferryY, h * 0.014 + ((t * 20 + ring * 12) % 36) * (h / 720), 0, Math.PI * 2)
        ctx.stroke()
    }
}

function turbine(ctx: Context, x: number, y: number, size: number, angle: number, color: string) {
    ctx.fillStyle = color
    ctx.fillRect(x - size * 0.03, y, size * 0.06, size * 1.4)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    for (let blade = 0; blade < 3; blade += 1) {
        ctx.rotate((Math.PI * 2) / 3)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(size * 0.05, -size * 0.1)
        ctx.lineTo(0, -size * 0.75)
        ctx.lineTo(-size * 0.04, -size * 0.1)
        ctx.closePath()
        ctx.fill()
    }
    ctx.restore()
}

function fields(ctx: Context, w: number, h: number, spec: SceneSpec, t: number) {
    sky(ctx, w, h, hsl(spec.hue, 60, 55), hsl(spec.hue, 50, 82), 0.7)
    const random = seeded(spec.seed)
    for (let cloud = 0; cloud < 5; cloud += 1) {
        const x = ((random() + t * 0.01 * (1 + cloud * 0.2)) % 1.3) * w - w * 0.15
        const y = h * (0.1 + random() * 0.25)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
        for (let puff = 0; puff < 4; puff += 1) {
            ctx.beginPath()
            ctx.arc(x + puff * w * 0.03, y + Math.sin(puff) * h * 0.01, h * (0.03 + (puff % 2) * 0.015), 0, Math.PI * 2)
            ctx.fill()
        }
    }
    wave(ctx, w, h, h * 0.6, h * 0.04, w * 0.9, 0.5, hsl(spec.accent, 35, 50))
    for (let index = 0; index < 4; index += 1) {
        turbine(ctx, w * (0.2 + index * 0.2), h * (0.42 + (index % 2) * 0.05), h * 0.16, t * (1.2 + index * 0.15) + index, hsl(0, 0, 96))
    }
    wave(ctx, w, h, h * 0.72, h * 0.05, w * 0.7, 2, hsl(spec.accent, 45, 38))
    wave(ctx, w, h, h * 0.86, h * 0.04, w * 0.5, 4, hsl(spec.accent + 10, 50, 26))
    // Grass moving in the wind along the near hill.
    ctx.strokeStyle = hsl(spec.accent + 15, 55, 20)
    ctx.lineWidth = Math.max(1, w / 1000)
    ctx.beginPath()
    for (let blade = 0; blade < 140; blade += 1) {
        const x = (blade / 140) * w
        const y = h * 0.9 + Math.sin(blade) * h * 0.02
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.sin(t * 2 + blade * 0.3) * w * 0.006, y - h * 0.04)
    }
    ctx.stroke()
}

const SCENES: Record<SceneKind, (ctx: Context, w: number, h: number, spec: SceneSpec, t: number) => void> = {
    sea,
    lighthouse,
    train,
    peaks,
    aurora,
    rain,
    tide,
    islands,
    fields,
}

/** Wraps `text` into lines no wider than `width`. */
function wrap(ctx: Context, text: string, width: number): string[] {
    const lines: string[] = []
    let line = ''
    for (const word of text.split(' ')) {
        const next = line === '' ? word : `${line} ${word}`
        if (ctx.measureText(next).width > width && line !== '') {
            lines.push(line)
            line = word
        } else line = next
    }
    if (line !== '') lines.push(line)
    return lines
}

/** How long the title card stands at the start, in seconds, fading over its last second. */
const CARD = 3

/** One frame of a clip: its scene at second `t`, the title card over the first seconds, and the channel's mark and the time in its corners. */
export function drawFrame(ctx: Context, spec: SceneSpec, t: number, w: number, h: number, card = true): void {
    ctx.save()
    SCENES[spec.kind](ctx, w, h, spec, t)
    ctx.restore()
    const small = Math.round(h * 0.03)
    ctx.textBaseline = 'alphabetic'
    ctx.font = `600 ${String(small)}px system-ui, sans-serif`
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.fillText(spec.channel, w - ctx.measureText(spec.channel).width - w * 0.03, h - h * 0.045)
    ctx.font = `500 ${String(small)}px ui-monospace, monospace`
    const clock = `${String(Math.floor(t / 60))}:${String(Math.floor(t % 60)).padStart(2, '0')}`
    ctx.fillText(clock, w - ctx.measureText(clock).width - w * 0.03, h * 0.07)
    if (!card || t >= CARD) return
    const alpha = Math.min(1, CARD - t)
    ctx.fillStyle = `rgba(0, 0, 0, ${String(0.45 * alpha)})`
    ctx.fillRect(0, h * 0.34, w, h * 0.32)
    ctx.fillStyle = `rgba(255, 255, 255, ${String(alpha)})`
    ctx.font = `700 ${String(Math.round(h * 0.06))}px system-ui, sans-serif`
    const lines = wrap(ctx, spec.title, w * 0.84).slice(0, 2)
    lines.forEach((line, index) => {
        ctx.fillText(line, w * 0.08, h * 0.45 + index * h * 0.08)
    })
    ctx.font = `500 ${String(Math.round(h * 0.035))}px system-ui, sans-serif`
    ctx.fillStyle = `rgba(255, 255, 255, ${String(0.8 * alpha)})`
    ctx.fillText(spec.channel, w * 0.08, h * 0.45 + lines.length * h * 0.08 + h * 0.01)
}
