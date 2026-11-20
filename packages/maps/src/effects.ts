import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useReducedMotion } from '@winterop-com/sokkel-ui/hooks/use-reduced-motion'
import { labelAnchor } from './basemap'
import type { LngLat } from './geometry'
import { MAP_TONES, type MapTone } from './tone'

/** A position on the Web Mercator square, 0 to 1 from its top-left corner, as a custom layer's `projectTile` takes it. */
export function mercator([lng, lat]: LngLat): [number, number] {
    const clamped = Math.max(-85.051129, Math.min(85.051129, lat))
    const sine = Math.sin((clamped * Math.PI) / 180)
    return [(lng + 180) / 360, 0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)]
}

/** The red, green and blue of an `rgb()` or `rgba()` color, each from 0 to 1; gray for one it cannot read. */
export function rgbOf(color: string): [number, number, number] {
    const parts = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(color)
    if (parts === null) return [0.5, 0.5, 0.5]
    return [Number(parts[1]) / 255, Number(parts[2]) / 255, Number(parts[3]) / 255]
}

/** Each tone's color as red, green and blue in `MAP_TONES` order, for a shader's `u_colors`. */
export function toneTriples(resolved: Record<MapTone, string>): Float32Array {
    return new Float32Array(MAP_TONES.flatMap((tone) => rgbOf(resolved[tone])))
}

/** A tone's place in `MAP_TONES`, which a shader reads its color by. */
export const toneIndex = (tone: MapTone): number => MAP_TONES.indexOf(tone)

/** A number from 0 to 1 drawn from an id, so each thing an effect animates starts at its own point. */
export function idPhase(id: string): number {
    let hash = 2166136261
    for (let index = 0; index < id.length; index += 1) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619)
    return (hash >>> 0) / 4294967296
}

/**
 * Whether a map is to be animated: its element on the screen and the document shown. Watched only
 * while `wanted`, and true while not.
 */
export function useMapShown(map: MapLibreMap, wanted: boolean): boolean {
    const [onScreen, setOnScreen] = useState(true)
    const [documentShown, setDocumentShown] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
    useEffect(() => {
        if (!wanted || typeof IntersectionObserver === 'undefined') return
        const observer = new IntersectionObserver((seen) => {
            const last = seen.at(-1)
            if (last !== undefined) setOnScreen(last.isIntersecting)
        })
        observer.observe(map.getContainer())
        return () => observer.disconnect()
    }, [map, wanted])
    useEffect(() => {
        if (!wanted || typeof document === 'undefined') return
        const changed = () => setDocumentShown(document.visibilityState !== 'hidden')
        changed()
        document.addEventListener('visibilitychange', changed)
        return () => document.removeEventListener('visibilitychange', changed)
    }, [wanted])
    return !wanted || (onScreen && documentShown)
}

/**
 * The frames an effect is drawn in: while `wanted`, motion is not reduced and the map is shown, the
 * map is repainted every frame. Returns whether the effect is to hold still, as reduced motion asks.
 */
export function useEffectFrames(map: MapLibreMap, wanted: boolean): { still: boolean } {
    const still = useReducedMotion()
    const shown = useMapShown(map, wanted)
    const running = wanted && !still && shown
    useEffect(() => {
        if (!running) return
        let frame = requestAnimationFrame(function tick() {
            map.triggerRepaint()
            frame = requestAnimationFrame(tick)
        })
        return () => cancelAnimationFrame(frame)
    }, [map, running])
    return { still }
}

/** What a custom layer draws: its shaders' bodies, after the projection's prelude, and its attributes by name and size. */
export interface GlProgram {
    vertex: string
    fragment: string
    attributes: readonly (readonly [name: string, size: number])[]
}

/**
 * Triangles to draw: the attributes of each vertex one after another, and three vertex indices a
 * triangle. Positions on the Mercator square are stored as offsets from `origin`, so 32-bit floats
 * keep them apart at any zoom; the origin is added back in 64 bits, in the projection's matrices.
 */
export interface GlMesh {
    vertices: Float32Array
    indices: Uint32Array
    origin: readonly [number, number]
}

/**
 * A mesh from vertices given in full (64-bit) precision: the positions at `positions` (each the x of
 * an x, y pair within a vertex of `stride` values) made offsets from the middle of their extent,
 * which becomes the mesh's origin.
 */
export function relativeMesh(
    vertices: readonly number[],
    stride: number,
    positions: readonly number[],
    indices: readonly number[],
): GlMesh {
    let [west, north, east, south] = [Infinity, Infinity, -Infinity, -Infinity]
    for (let start = 0; start < vertices.length; start += stride) {
        for (const at of positions) {
            west = Math.min(west, vertices[start + at])
            east = Math.max(east, vertices[start + at])
            north = Math.min(north, vertices[start + at + 1])
            south = Math.max(south, vertices[start + at + 1])
        }
    }
    const origin: [number, number] = vertices.length === 0 ? [0, 0] : [(west + east) / 2, (north + south) / 2]
    const relative = Float32Array.from(vertices, (value, index) => {
        const within = index % stride
        if (positions.includes(within)) return value - origin[0]
        if (positions.includes(within - 1)) return value - origin[1]
        return value
    })
    return { vertices: relative, indices: Uint32Array.from(indices), origin }
}

/**
 * A 4 by 4 column-major matrix moved to take positions relative to `origin`: the matrix times a
 * translation by the origin, worked in 64-bit floats so the sum keeps its precision.
 */
export function fromOrigin(matrix: ArrayLike<number>, [x, y]: readonly [number, number]): Float64Array {
    const moved = Float64Array.from(matrix)
    for (let row = 0; row < 4; row += 1) moved[12 + row] = matrix[row] * x + matrix[4 + row] * y + matrix[12 + row]
    return moved
}

/** Sets the layer's own uniforms before a draw, by name. */
export type GlUniforms = (
    gl: WebGL2RenderingContext,
    at: (name: string) => WebGLUniformLocation | null,
    input: CustomRenderMethodInput,
) => void

const PROJECTION_UNIFORMS = [
    'u_projection_matrix',
    'u_projection_tile_mercator_coords',
    'u_projection_clipping_plane',
    'u_projection_transition',
    'u_projection_fallback_matrix',
] as const

interface Compiled {
    program: WebGLProgram
    uniforms: Map<string, WebGLUniformLocation | null>
}

/**
 * A maplibre custom layer that draws one mesh of triangles with its own shaders in one draw call,
 * projected by maplibre's own `projectTile`, so it follows the flat map and the globe alike. Its
 * vertices are uploaded once, when set; a frame sets only uniforms.
 */
export class GlLayer implements CustomLayerInterface {
    readonly type = 'custom' as const
    readonly renderingMode = '2d' as const
    uniforms: GlUniforms
    private gl: WebGL2RenderingContext | null = null
    private compiled = new Map<string, Compiled | null>()
    private vao: WebGLVertexArrayObject | null = null
    private vertexBuffer: WebGLBuffer | null = null
    private indexBuffer: WebGLBuffer | null = null
    private mesh: GlMesh = { vertices: new Float32Array(0), indices: new Uint32Array(0), origin: [0, 0] }
    private uploaded = false

    constructor(
        readonly id: string,
        private readonly spec: GlProgram,
        uniforms: GlUniforms,
    ) {
        this.uniforms = uniforms
    }

    setMesh(mesh: GlMesh): void {
        this.mesh = mesh
        this.uploaded = false
    }

    onAdd(_: MapLibreMap, context: WebGLRenderingContext | WebGL2RenderingContext): void {
        // A style rebuilt in full drops the layer without `onRemove`, and the same layer is added again.
        this.dispose()
        if (!('createVertexArray' in context)) return
        const gl = context
        this.gl = gl
        this.vao = gl.createVertexArray()
        this.vertexBuffer = gl.createBuffer()
        this.indexBuffer = gl.createBuffer()
        gl.bindVertexArray(this.vao)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
        const stride = this.spec.attributes.reduce((sum, [, size]) => sum + size, 0) * 4
        let offset = 0
        this.spec.attributes.forEach(([, size], location) => {
            gl.enableVertexAttribArray(location)
            gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset)
            offset += size * 4
        })
        gl.bindVertexArray(null)
        this.uploaded = false
    }

    onRemove(): void {
        this.dispose()
    }

    /** Deletes what the layer holds on the GPU, if anything; safe to call again. */
    private dispose(): void {
        const gl = this.gl
        if (gl !== null) {
            for (const each of this.compiled.values()) if (each !== null) gl.deleteProgram(each.program)
            if (this.vao !== null) gl.deleteVertexArray(this.vao)
            if (this.vertexBuffer !== null) gl.deleteBuffer(this.vertexBuffer)
            if (this.indexBuffer !== null) gl.deleteBuffer(this.indexBuffer)
        }
        this.compiled.clear()
        this.vao = null
        this.vertexBuffer = null
        this.indexBuffer = null
        this.gl = null
        this.uploaded = false
    }

    private program(shaderData: CustomRenderMethodInput['shaderData']): Compiled | null {
        const gl = this.gl
        if (gl === null) return null
        const held = this.compiled.get(shaderData.variantName)
        if (held !== undefined) return held
        const shader = (type: number, source: string) => {
            const made = gl.createShader(type)
            if (made === null) return null
            gl.shaderSource(made, source)
            gl.compileShader(made)
            if (gl.getShaderParameter(made, gl.COMPILE_STATUS) !== true) {
                console.error(`The ${this.id} layer's shader did not compile.`, gl.getShaderInfoLog(made))
                gl.deleteShader(made)
                return null
            }
            return made
        }
        const vertex = shader(
            gl.VERTEX_SHADER,
            `#version 300 es\nprecision highp float;\n${shaderData.vertexShaderPrelude}\n${shaderData.define}\n${this.spec.vertex}`,
        )
        const fragment = shader(gl.FRAGMENT_SHADER, `#version 300 es\nprecision highp float;\nout vec4 fragColor;\n${this.spec.fragment}`)
        let compiled: Compiled | null = null
        if (vertex !== null && fragment !== null) {
            const program = gl.createProgram()
            gl.attachShader(program, vertex)
            gl.attachShader(program, fragment)
            this.spec.attributes.forEach(([name], location) => gl.bindAttribLocation(program, location, name))
            gl.linkProgram(program)
            if (gl.getProgramParameter(program, gl.LINK_STATUS) === true) compiled = { program, uniforms: new Map() }
            else {
                console.error(`The ${this.id} layer's shaders did not link.`, gl.getProgramInfoLog(program))
                gl.deleteProgram(program)
            }
        }
        if (vertex !== null) gl.deleteShader(vertex)
        if (fragment !== null) gl.deleteShader(fragment)
        this.compiled.set(shaderData.variantName, compiled)
        return compiled
    }

    render(_: WebGLRenderingContext | WebGL2RenderingContext, input: CustomRenderMethodInput): void {
        const gl = this.gl
        if (gl === null || this.mesh.indices.length === 0) return
        const compiled = this.program(input.shaderData)
        if (compiled === null) return
        gl.useProgram(compiled.program)
        gl.bindVertexArray(this.vao)
        if (!this.uploaded) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, this.mesh.vertices, gl.STATIC_DRAW)
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indices, gl.STATIC_DRAW)
            this.uploaded = true
        }
        const at = (name: string) => {
            if (!compiled.uniforms.has(name)) compiled.uniforms.set(name, gl.getUniformLocation(compiled.program, name))
            return compiled.uniforms.get(name) ?? null
        }
        // Positions are offsets from the mesh's origin. A flat matrix takes the origin in; the globe adds it
        // to the offset through the tile's corner on the Mercator square, as it does a tile's own corner.
        const projection = input.defaultProjectionData
        const { origin } = this.mesh
        const globe = input.shaderData.define.includes('GLOBE')
        const [x, y, width, height] = projection.tileMercatorCoords
        gl.uniformMatrix4fv(at(PROJECTION_UNIFORMS[0]), false, globe ? projection.mainMatrix : fromOrigin(projection.mainMatrix, origin))
        gl.uniform4f(at(PROJECTION_UNIFORMS[1]), x + origin[0] * width, y + origin[1] * height, width, height)
        gl.uniform4f(at(PROJECTION_UNIFORMS[2]), ...projection.clippingPlane)
        gl.uniform1f(at(PROJECTION_UNIFORMS[3]), projection.projectionTransition)
        gl.uniformMatrix4fv(at(PROJECTION_UNIFORMS[4]), false, fromOrigin(projection.fallbackMatrix, origin))
        gl.uniform2f(at('u_viewport'), gl.drawingBufferWidth, gl.drawingBufferHeight)
        this.uniforms(gl, at, input)
        gl.drawElements(gl.TRIANGLES, this.mesh.indices.length, gl.UNSIGNED_INT, 0)
        gl.bindVertexArray(null)
    }
}

/**
 * A custom layer drawing `mesh` with `program` while `id` is given (null takes it down), its uniforms
 * set each frame by the latest `uniforms`, and its mesh uploaded again only when a new one is given.
 */
export function useGlEffect(map: MapLibreMap, id: string | null, program: GlProgram, mesh: GlMesh | null, uniforms: GlUniforms): void {
    const latest = useRef(uniforms)
    useEffect(() => {
        latest.current = uniforms
    })
    const layer = useMemo(
        () => (id === null ? null : new GlLayer(id, program, (gl, at, input) => latest.current(gl, at, input))),
        [id, program],
    )
    useEffect(() => {
        if (layer === null || mesh === null) return
        layer.setMesh(mesh)
        map.triggerRepaint()
    }, [map, layer, mesh])
    useCustomLayer(map, layer)
}

/**
 * Keeps a custom layer on the map while it is given, under the basemap's place names and over the
 * layers added before it, and puts it back when a new basemap's style drops it.
 */
export function useCustomLayer(map: MapLibreMap, layer: GlLayer | null): void {
    useEffect(() => {
        if (layer === null) return
        const add = () => {
            if (map.getLayer(layer.id) !== undefined) return
            try {
                map.addLayer(layer, labelAnchor(map))
            } catch {
                // The style is still loading; its `styledata` comes again once it has.
            }
        }
        add()
        map.on('styledata', add)
        return () => {
            map.off('styledata', add)
            if (map.getLayer(layer.id) !== undefined) map.removeLayer(layer.id)
        }
    }, [map, layer])
}
