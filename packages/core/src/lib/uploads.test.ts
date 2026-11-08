import { describe, expect, it } from 'vitest'

import { acceptList, accepts, checkFiles, refusal, UploadStore, type UploadContext } from './uploads'

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type })

/** An uploader the test drives by hand: each call waits until it is finished or failed. */
function manual() {
    const calls: { file: File; context: UploadContext; finish: (value: string) => void; fail: (error: unknown) => void }[] = []
    const upload = (one: File, context: UploadContext) =>
        new Promise<string>((finish, fail) => {
            calls.push({ file: one, context, finish, fail })
        })
    return { calls, upload }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('accept', () => {
    it('splits a list or a comma-separated value', () => {
        expect(acceptList('image/*, .CSV')).toEqual(['image/*', '.csv'])
        expect(acceptList(['application/json'])).toEqual(['application/json'])
        expect(acceptList(undefined)).toEqual([])
    })

    it('matches by extension, MIME family or exact type', () => {
        expect(accepts({ name: 'orders.CSV', type: '' }, '.csv')).toBe(true)
        expect(accepts({ name: 'dusk.png', type: 'image/png' }, 'image/*')).toBe(true)
        expect(accepts({ name: 'export.json', type: 'application/json' }, ['application/json'])).toBe(true)
        expect(accepts({ name: 'export.json', type: 'application/json' }, 'image/*,.csv')).toBe(false)
        expect(accepts({ name: 'anything.bin', type: '' }, undefined)).toBe(true)
    })

    it('refuses by type before size', () => {
        expect(refusal({ name: 'a.exe', type: '', size: 5 }, { accept: '.csv', maxSize: 1 })).toBe('type')
        expect(refusal({ name: 'a.csv', type: '', size: 5 }, { accept: '.csv', maxSize: 1 })).toBe('size')
        expect(refusal({ name: 'a.csv', type: '', size: 1 }, { accept: '.csv', maxSize: 1 })).toBeUndefined()
    })
})

describe('checkFiles', () => {
    const limits = { accept: '.csv,image/*', maxSize: 1000, maxFiles: 3 }

    it('takes what fits and refuses the rest with why, in order', () => {
        const checked = checkFiles(
            [file('a.csv', 'text/csv'), file('setup.exe', ''), file('big.csv', 'text/csv', 2000), file('dusk.png', 'image/png')],
            limits,
        )
        expect(checked.taken.map((one) => one.name)).toEqual(['a.csv', 'dusk.png'])
        expect(checked.refused.map((one) => [one.file.name, one.reason])).toEqual([
            ['setup.exe', 'type'],
            ['big.csv', 'size'],
        ])
    })

    it('counts the files held already and refuses those past the count', () => {
        const checked = checkFiles([file('a.csv', ''), file('b.csv', ''), file('c.csv', '')], limits, 2)
        expect(checked.taken.map((one) => one.name)).toEqual(['a.csv'])
        expect(checked.refused.map((one) => [one.file.name, one.reason])).toEqual([
            ['b.csv', 'count'],
            ['c.csv', 'count'],
        ])
    })

    it('refuses a file of the wrong type by its type before the count', () => {
        expect(checkFiles([file('a.exe', '')], limits, 3).refused[0].reason).toBe('type')
    })

    it('takes everything without limits', () => {
        expect(checkFiles([file('a.bin', '', 9_000_000)], {}).taken).toHaveLength(1)
    })
})

describe('the upload store', () => {
    it('starts an upload for each file taken and refuses the rest with a reason', () => {
        const { calls, upload } = manual()
        const store = new UploadStore({ upload, accept: '.csv,.yaml', maxSize: 1000 })
        const refused = store.add([file('orders.csv', 'text/csv'), file('dusk.png', 'image/png'), file('big.csv', 'text/csv', 2000)])
        expect(refused.map((one) => one.reason)).toEqual(['type', 'size'])
        expect(refused[1].message).toBe('big.csv is larger than 1.0 KB.')
        expect(store.get().refused).toHaveLength(2)
        expect(store.get().uploads.map((one) => [one.file.name, one.state])).toEqual([['orders.csv', 'uploading']])
        expect(calls).toHaveLength(1)
        store.clearRefused()
        expect(store.get().refused).toEqual([])
    })

    it('refuses files past the count', () => {
        const { upload } = manual()
        const store = new UploadStore({ upload, maxFiles: 2 })
        const refused = store.add([file('a.csv', ''), file('b.csv', ''), file('c.csv', '')])
        expect(refused.map((one) => [one.file.name, one.reason])).toEqual([['c.csv', 'count']])
    })

    it('follows progress, and marks a file done or failed', async () => {
        const { calls, upload } = manual()
        const store = new UploadStore({ upload })
        store.add([file('a.csv', ''), file('b.csv', '')])
        const [a, b] = store.get().uploads
        calls[0].context.onProgress(0.4)
        expect(store.get().uploads[0].progress).toBe(0.4)
        calls[0].context.onProgress(3)
        expect(store.get().uploads[0].progress).toBe(1)
        calls[0].finish('stored/a.csv')
        calls[1].fail(new Error('refused'))
        await settle()
        expect(store.get().uploads.find((one) => one.id === a.id)).toMatchObject({ state: 'done', result: 'stored/a.csv' })
        expect(store.get().uploads.find((one) => one.id === b.id)?.state).toBe('failed')
    })

    it('aborts the signal on cancel and drops the file', async () => {
        const { calls, upload } = manual()
        const store = new UploadStore({ upload })
        store.add([file('a.csv', '')])
        const id = store.get().uploads[0].id
        store.cancel(id)
        expect(calls[0].context.signal.aborted).toBe(true)
        expect(store.get().uploads).toEqual([])
        // What the request says after a cancel changes nothing.
        calls[0].context.onProgress(0.9)
        calls[0].fail(new DOMException('aborted', 'AbortError'))
        await settle()
        expect(store.get().uploads).toEqual([])
    })

    it('keeps a cancelled file dropped when an uploader that ignores the signal finishes it later', async () => {
        const { calls, upload } = manual()
        const store = new UploadStore({ upload })
        store.add([file('a.csv', ''), file('b.csv', '')])
        const [a, b] = store.get().uploads
        store.remove(a.id)
        calls[0].finish('stored/a.csv')
        calls[1].finish('stored/b.csv')
        await settle()
        expect(store.get().uploads.map((one) => [one.id, one.state])).toEqual([[b.id, 'done']])
    })

    it('sends a failed file again on retry, and removes a done one', async () => {
        const { calls, upload } = manual()
        const store = new UploadStore({ upload })
        store.add([file('a.csv', '')])
        const id = store.get().uploads[0].id
        calls[0].fail(new Error('offline'))
        await settle()
        store.retry(id)
        expect(store.get().uploads[0].state).toBe('uploading')
        expect(calls).toHaveLength(2)
        calls[1].finish('ok')
        await settle()
        expect(store.get().uploads[0].state).toBe('done')
        store.remove(id)
        expect(store.get().uploads).toEqual([])
    })

    it('tells its listeners of each change', () => {
        const { upload } = manual()
        const store = new UploadStore({ upload })
        let heard = 0
        const stop = store.subscribe(() => {
            heard += 1
        })
        store.add([file('a.csv', '')])
        store.clear()
        stop()
        store.add([file('b.csv', '')])
        expect(heard).toBe(2)
    })
})
