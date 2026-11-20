/**
 * This machine's connections, read with `lsof` (macOS and Linux) or, where there is none, with
 * `netstat`. Each runs as a fixed command with fixed arguments through `execFile`, never through a
 * shell, so nothing read or asked can reach a command line. Neither counts bytes: the records carry
 * the sockets and their states only.
 */

import { execFile } from 'node:child_process'

/** One connection as the tracking package's `ConnectionRecord` has it, without its time. */
export interface MachineRecord {
    process?: string
    pid?: number
    protocol: string
    localAddress: string
    localPort: number
    remoteAddress: string
    remotePort: number
    state?: string
}

export type Tool = 'lsof' | 'netstat'

/** The commands, fixed: `-F` asks lsof for one field a line, which reads the same on every system. */
const COMMANDS: Record<Tool, { file: string; args: readonly string[] }> = {
    lsof: { file: 'lsof', args: ['-i', '-n', '-P', '+c', '0', '-F', 'pcPnT'] },
    netstat: { file: 'netstat', args: process.platform === 'win32' ? ['-ano'] : ['-an'] },
}

/** How long a reading may take, and the most it may print. */
const TIMEOUT = 8000
const MOST_OUTPUT = 16 * 1024 * 1024

/** An endpoint as lsof and Linux's netstat write it: `203.0.113.5:443`, `[2001:db8::5]:443`, `*:22`. */
function splitColon(text: string): { address: string; port: number } | undefined {
    const bracketed = /^\[([^\]]+)\]:(\d+|\*)$/.exec(text)
    if (bracketed !== null) return { address: bracketed[1], port: bracketed[2] === '*' ? 0 : Number(bracketed[2]) }
    const at = text.lastIndexOf(':')
    if (at <= 0) return undefined
    const port = text.slice(at + 1)
    if (!/^(\d+|\*)$/.test(port)) return undefined
    return { address: text.slice(0, at), port: port === '*' ? 0 : Number(port) }
}

/** An endpoint as macOS's netstat writes it, the port after the last dot: `203.0.113.5.443`, `2001:db8::5.443`. */
function splitDot(text: string): { address: string; port: number } | undefined {
    const at = text.lastIndexOf('.')
    if (at <= 0) return undefined
    const port = text.slice(at + 1)
    if (!/^(\d+|\*)$/.test(port)) return undefined
    return { address: text.slice(0, at), port: port === '*' ? 0 : Number(port) }
}

/**
 * Reads `lsof -i -n -P -F pcPnT`: a `p` line starts each process, `c` names it, and for each of its
 * sockets `P` gives the protocol, `n` the endpoints (`local->remote`) and `TST=` the TCP state. A
 * socket with no remote end (listening, or unconnected UDP) is left out.
 */
export function parseLsof(output: string): MachineRecord[] {
    const records: MachineRecord[] = []
    let pid: number | undefined
    let command: string | undefined
    let protocol: string | undefined
    let current: MachineRecord | undefined
    const finish = () => {
        if (current !== undefined) records.push(current)
        current = undefined
    }
    for (const line of output.split('\n')) {
        if (line.length < 1) continue
        const field = line[0]
        const value = line.slice(1)
        if (field === 'p') {
            finish()
            pid = Number(value)
            command = undefined
        } else if (field === 'c') command = value
        else if (field === 'f') {
            finish()
            protocol = undefined
        } else if (field === 'P') protocol = value.toLowerCase()
        else if (field === 'n') {
            finish()
            const [local, remote] = value.split('->')
            if (remote === undefined || protocol === undefined) continue
            const from = splitColon(local)
            const to = splitColon(remote)
            if (from === undefined || to === undefined) continue
            const six = from.address.includes(':') || to.address.includes(':')
            current = {
                process: command,
                pid: Number.isFinite(pid) ? pid : undefined,
                protocol: `${protocol}${six ? '6' : ''}`,
                localAddress: from.address,
                localPort: from.port,
                remoteAddress: to.address,
                remotePort: to.port,
            }
        } else if (field === 'T' && value.startsWith('ST=') && current !== undefined) current.state = value.slice(3)
    }
    finish()
    return records
}

/**
 * Reads `netstat -an` (macOS, Linux) or `netstat -ano` (Windows): a line per socket with its
 * protocol, both ends and its state, and on Windows the process id last. macOS writes the port after
 * a dot, the others after a colon. netstat names no process here.
 */
export function parseNetstat(output: string, platform: string = process.platform): MachineRecord[] {
    const records: MachineRecord[] = []
    const split = platform === 'darwin' ? splitDot : splitColon
    for (const line of output.split('\n')) {
        const parts = line.trim().split(/\s+/)
        const name = parts[0]?.toLowerCase() ?? ''
        if (!/^(tcp|udp)(4|6|46)?$/.test(name)) continue
        // Windows: Proto Local Foreign State PID (no state for UDP); others: Proto Recv-Q Send-Q Local Foreign (State).
        const windows = platform === 'win32'
        const local = split(windows ? parts[1] : parts[3])
        const remote = split(windows ? parts[2] : parts[4])
        if (local === undefined || remote === undefined || remote.port === 0) continue
        const tcp = name.startsWith('tcp')
        const state = tcp ? (windows ? parts[3] : parts[5]) : undefined
        if (tcp && (state === undefined || state === 'LISTEN' || state === 'LISTENING')) continue
        const pid = windows ? Number(parts[tcp ? 4 : 3]) : undefined
        const six = local.address.includes(':') || name.endsWith('6')
        const record: MachineRecord = {
            protocol: `${tcp ? 'tcp' : 'udp'}${six ? '6' : ''}`,
            localAddress: local.address,
            localPort: local.port,
            remoteAddress: remote.address,
            remotePort: remote.port,
        }
        if (state !== undefined) record.state = state === 'ESTAB' ? 'ESTABLISHED' : state
        if (pid !== undefined && Number.isFinite(pid)) record.pid = pid
        records.push(record)
    }
    return records
}

function run(tool: Tool): Promise<string> {
    const { file, args } = COMMANDS[tool]
    return new Promise((resolve, reject) => {
        execFile(file, args, { timeout: TIMEOUT, maxBuffer: MOST_OUTPUT, windowsHide: true, encoding: 'utf8' }, (error, stdout) => {
            // lsof exits 1 when one of its sources gave nothing, yet prints what it read.
            if (error !== null && !(tool === 'lsof' && stdout.length > 0)) reject(error)
            else resolve(stdout)
        })
    })
}

/** The tool that worked last, tried first next time. */
let found: Tool | undefined

/** Reads this machine's connections once: with lsof, or with netstat where lsof is missing or fails. */
export async function readConnections(): Promise<{ tool: Tool; records: MachineRecord[] }> {
    const order: Tool[] = found === 'netstat' ? ['netstat'] : process.platform === 'win32' ? ['netstat'] : ['lsof', 'netstat']
    let last: unknown
    for (const tool of order) {
        try {
            const output = await run(tool)
            found = tool
            return { tool, records: tool === 'lsof' ? parseLsof(output) : parseNetstat(output) }
        } catch (error) {
            last = error
        }
    }
    throw last instanceof Error ? last : new Error('Neither lsof nor netstat could be run.')
}
