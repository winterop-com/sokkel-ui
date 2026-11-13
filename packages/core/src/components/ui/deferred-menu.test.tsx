import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu'
import { Menu as BaseMenu } from '@base-ui/react/menu'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FINGER_HIT } from '../../lib/finger'
import { cn } from '../../lib/utils'
import { ContextMenu, ContextMenuTrigger } from './context-menu'
import { DropdownMenu, DropdownMenuTrigger } from './dropdown-menu'

/** An element's tag and attributes, in order, without the id Base UI makes up. */
function shape(element: ReactElement): string {
    const html = renderToStaticMarkup(element)
    const open = /^<([a-z]+)([^>]*)>/.exec(html)
    if (open === null) throw new Error(`no element in ${html}`)
    const attributes = [...open[2].matchAll(/([a-z-]+)(?:="([^"]*)")?/g)]
        .filter(([, name]) => name !== 'id')
        .map(([, name, value = '']) => `${name}=${value}`)
        .sort()
    return `<${open[1]} ${attributes.join(' ')}>${html.slice(open[0].length)}`
}

describe('a menu before Base UI’s menu has loaded', () => {
    it('draws its trigger as Base UI draws it closed', () => {
        expect(
            shape(
                <DropdownMenu>
                    <DropdownMenuTrigger className="tool" aria-label="Job actions">
                        Actions
                    </DropdownMenuTrigger>
                </DropdownMenu>,
            ),
        ).toBe(
            shape(
                <BaseMenu.Root>
                    <BaseMenu.Trigger data-slot="dropdown-menu-trigger" className={cn(FINGER_HIT, 'tool')} aria-label="Job actions">
                        Actions
                    </BaseMenu.Trigger>
                </BaseMenu.Root>,
            ),
        )
    })

    it('draws a disabled trigger and one rendered as another element as Base UI does', () => {
        expect(
            shape(
                <DropdownMenu>
                    <DropdownMenuTrigger disabled>Actions</DropdownMenuTrigger>
                </DropdownMenu>,
            ),
        ).toBe(
            shape(
                <BaseMenu.Root>
                    <BaseMenu.Trigger data-slot="dropdown-menu-trigger" className={FINGER_HIT} disabled>
                        Actions
                    </BaseMenu.Trigger>
                </BaseMenu.Root>,
            ),
        )
        expect(
            shape(
                <DropdownMenu disabled>
                    <DropdownMenuTrigger nativeButton={false} render={<span className="chip" />}>
                        Actions
                    </DropdownMenuTrigger>
                </DropdownMenu>,
            ),
        ).toBe(
            shape(
                <BaseMenu.Root disabled>
                    <BaseMenu.Trigger
                        data-slot="dropdown-menu-trigger"
                        className={FINGER_HIT}
                        nativeButton={false}
                        render={<span className="chip" />}
                    >
                        Actions
                    </BaseMenu.Trigger>
                </BaseMenu.Root>,
            ),
        )
    })

    it('draws a context menu’s area as Base UI draws it closed', () => {
        expect(
            shape(
                <ContextMenu>
                    <ContextMenuTrigger render={<div role="row" />}>validate</ContextMenuTrigger>
                </ContextMenu>,
            ),
        ).toBe(
            shape(
                <BaseContextMenu.Root>
                    <BaseContextMenu.Trigger data-slot="context-menu-trigger" className="select-none" render={<div role="row" />}>
                        validate
                    </BaseContextMenu.Trigger>
                </BaseContextMenu.Root>,
            ),
        )
    })
})
