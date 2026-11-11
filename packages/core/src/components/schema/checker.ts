/**
 * The schema checker, `validate` with ajv behind it, fetched the first time a form or an editor
 * checks a value and shared by every one after, so a page that checks nothing fetches none of it.
 */
type Checks = typeof import('./checks')
type Validate = Checks['validate']

let checker: Promise<Validate> | undefined
let ready: Validate | undefined
let words: Checks['sayIssue'] | undefined

/** Loads the checker once and resolves with `validate`; a failed fetch is tried again on the next call. */
export function loadValidate(): Promise<Validate> {
    checker ??= import('./checks').then(
        (module) => {
            ready = module.validate
            words = module.sayIssue
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

/** The words for the checker's issues once it has loaded, else undefined. */
export function loadedSay(): Checks['sayIssue'] | undefined {
    return words
}
