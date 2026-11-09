import { Row } from '@winterop-com/sokkel-ui/Layout'
import { PersonAvatar } from '@winterop-com/sokkel-ui/PersonAvatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'

import { PEOPLE, type Person } from '../data'

/** A choice of one of the team, each with their avatar. */
export function PersonSelect({
    id,
    value,
    onValueChange,
    people = PEOPLE,
    label,
    className,
}: {
    id?: string
    value: Person
    onValueChange: (person: Person) => void
    people?: readonly Person[]
    /** What the choice is for, for a screen reader when no field names it. */
    label?: string
    className?: string
}) {
    const items = people.map((person) => ({ value: person, label: person }))
    return (
        <Select items={items} value={value} onValueChange={(next) => onValueChange(String(next) as Person)}>
            <SelectTrigger id={id} aria-label={label} className={className}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {people.map((person) => (
                    <SelectItem key={person} value={person}>
                        <Row gap="2xs" inline>
                            <PersonAvatar name={person} size="2xs" />
                            {person}
                        </Row>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
