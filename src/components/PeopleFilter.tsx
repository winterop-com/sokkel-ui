import { cn } from '../lib/cn'
import type { KindColor } from '../lib/kind'
import { PersonAvatar } from './PersonAvatar'

export interface PeopleFilterWords {
    label: string
    show: (name: string) => string
    stop: (name: string) => string
}

const WORDS: PeopleFilterWords = {
    label: 'People',
    show: (name) => `Show ${name}'s items`,
    stop: (name) => `Stop showing only ${name}'s items`,
}

/**
 * People as overlapping avatars that filter a board or a list: pressing one shows only that
 * person's items, more than one can be on, and once any is on the others fade until hovered.
 */
export function PeopleFilter({
    people,
    chosen,
    onChange,
    className,
    words: given,
}: {
    people: readonly { name: string; color?: KindColor }[]
    chosen: readonly string[]
    onChange: (chosen: string[]) => void
    className?: string
    words?: Partial<PeopleFilterWords>
}) {
    const words = { ...WORDS, ...given }
    return (
        <div role="group" aria-label={words.label} className={cn('flex items-center -space-x-1', className)}>
            {people.map((person) => {
                const on = chosen.includes(person.name)
                return (
                    <button
                        key={person.name}
                        type="button"
                        aria-pressed={on}
                        title={on ? words.stop(person.name) : words.show(person.name)}
                        className={cn(
                            'relative rounded-full ring-2 ring-background transition-[opacity,box-shadow] outline-none hover:z-10 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid',
                            on && 'z-10 ring-primary',
                            chosen.length > 0 && !on && 'opacity-50 hover:opacity-100',
                        )}
                        onClick={() => onChange(on ? chosen.filter((other) => other !== person.name) : [...chosen, person.name])}
                    >
                        <PersonAvatar name={person.name} color={person.color} size="md" />
                    </button>
                )
            })}
        </div>
    )
}
