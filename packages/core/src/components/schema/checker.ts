/**
 * The schema checker, `validate` with ajv behind it, fetched the first time a form or an editor
 * checks a value and shared by every one after, so a page that checks nothing fetches none of it.
 */
type Validate = (typeof import('./validate'))['validate']

let checker: Promise<Validate> | undefined
let ready: Validate | undefined

/** Loads the checker once and resolves with `validate`; a failed fetch is tried again on the next call. */
export function loadValidate(): Promise<Validate> {
    checker ??= import('./validate').then(
        (module) => {
            ready = module.validate
            return module.validate
        },
        (error: unknown) => {
            checker = undefined
            throw error
        },
    )
    return checker
}

/** `validate` once the checker has loaded, else undefined. */
export function loadedValidate(): Validate | undefined {
    return ready
}
