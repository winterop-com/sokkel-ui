import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@winterop-com/sokkel-ui/primitives/select'

/** The models Tidevann's assistant answers with, from the quickest to the most careful. */
export const MODELS = [
    { value: 'fast', label: 'fast model' },
    { value: 'balanced', label: 'balanced model' },
    { value: 'deep', label: 'deep model' },
]

/** The model an answer comes from, as a quiet select showing the one in use. */
export function ModelPicker({ defaultValue = 'fast' }: { defaultValue?: string }) {
    return (
        <Select items={MODELS} defaultValue={defaultValue}>
            <SelectTrigger variant="quiet" size="sm" aria-label="Model">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                        {model.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
