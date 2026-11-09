import { ContextMenu as Parts } from '@base-ui/react/context-menu'

/**
 * The parts of Base UI's context menu the library draws with, in a module of their own so a page
 * fetches them after it is drawn rather than with it. Named one by one, so its other parts stay out.
 */
export const ContextMenu = {
    Root: Parts.Root,
    Trigger: Parts.Trigger,
    Portal: Parts.Portal,
    Positioner: Parts.Positioner,
    Popup: Parts.Popup,
    Group: Parts.Group,
    GroupLabel: Parts.GroupLabel,
    Item: Parts.Item,
    CheckboxItem: Parts.CheckboxItem,
    CheckboxItemIndicator: Parts.CheckboxItemIndicator,
    RadioGroup: Parts.RadioGroup,
    RadioItem: Parts.RadioItem,
    RadioItemIndicator: Parts.RadioItemIndicator,
    SubmenuRoot: Parts.SubmenuRoot,
    SubmenuTrigger: Parts.SubmenuTrigger,
    Separator: Parts.Separator,
}
