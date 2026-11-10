import { DocumentTabs, type DocumentTab } from '@winterop-com/sokkel-ui/DocumentTabs'
import { IconButton } from '@winterop-com/sokkel-ui/IconButton'
import { Stack } from '@winterop-com/sokkel-ui/Layout'
import { useCommands } from '@winterop-com/sokkel-ui/hooks/use-commands'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@winterop-com/sokkel-ui/primitives/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'
import { Ellipsis, FilePlus, Save, Sheet, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'

import { go } from 'tidevann-shared/router'
import { PipelineEditor } from '../editors/PipelineEditor'
import { QueryEditor } from '../editors/QueryEditor'
import { SchemaEditor } from '../editors/SchemaEditor'
import { TableView } from '../editors/TableView'
import { kindOf } from '../model'
import { useStudio } from '../state'
import { tablesWith } from '../tables'

/** The open files and tables as tabs over the one shown: a pipeline, a schema or a query in its editor, or a table's rows. */
export function WorkArea({ tab }: { tab: string }) {
    const { byId, prefs, dirty, show, close, closeNow, open, save, saveAll, runs, ask, loading } = useStudio()
    const tables = useMemo(() => tablesWith(runs), [runs])
    const file = byId.get(tab)
    const table = tab.startsWith('table:') ? tables.find((one) => `table:${one.name}` === tab) : undefined
    const exists = file !== undefined || table !== undefined

    useEffect(() => {
        if (exists) show(tab)
    }, [tab, exists, show])

    useCommands(
        [
            {
                title: 'Tabs',
                commands: [
                    ...(file === undefined
                        ? []
                        : [
                              {
                                  id: 'tab-save',
                                  label: `Save ${file.name}`,
                                  icon: Save,
                                  disabled: dirty.has(file.id) ? false : 'No changes to save.',
                                  onSelect: () => void save(file.id),
                              },
                          ]),
                    {
                        id: 'tab-save-all',
                        label: 'Save all',
                        icon: Save,
                        disabled: dirty.size === 0 ? 'No changes to save.' : false,
                        onSelect: () => void saveAll(),
                    },
                    { id: 'tab-close', label: 'Close the tab', icon: X, onSelect: () => close([tab]) },
                    {
                        id: 'tab-close-others',
                        label: 'Close the other tabs',
                        icon: X,
                        disabled: prefs.tabs.length < 2 ? 'No other tab is open.' : false,
                        onSelect: () => close(prefs.tabs.filter((one) => one !== tab)),
                    },
                ],
            },
        ],
        [tab, file?.name, dirty, prefs.tabs],
    )

    const tabs = prefs.tabs.flatMap((id): DocumentTab[] => {
        if (id.startsWith('table:')) {
            const name = id.slice('table:'.length)
            return tables.some((one) => one.name === name) ? [{ id, label: name, icon: Sheet, title: `The ${name} table` }] : []
        }
        const one = byId.get(id)
        if (one === undefined) return []
        return [{ id, label: one.name, icon: kindOf(one.kind).icon, dirty: dirty.has(id), title: `${one.project} / ${one.name}` }]
    })

    let content
    if (file?.kind === 'pipeline') content = <PipelineEditor key={file.id} file={file} />
    else if (file?.kind === 'schema') content = <SchemaEditor key={file.id} file={file} />
    else if (file?.kind === 'query') content = <QueryEditor key={file.id} file={file} />
    else if (table !== undefined) content = <TableView key={table.name} table={table} />
    else
        content = loading ? null : (
            <Empty>
                <EmptyHeader>
                    <EmptyTitle>Nothing here</EmptyTitle>
                    <EmptyDescription>The file was deleted, or the address is wrong.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" variant="outline" onClick={() => go('/')}>
                    Back to the workspace
                </Button>
            </Empty>
        )

    return (
        <Stack gap="none" className="h-full min-h-0">
            <DocumentTabs
                tabs={tabs}
                active={exists ? tab : null}
                onActiveChange={open}
                onClose={(id) => close([id])}
                words={{ label: 'Open files' }}
                end={
                    <>
                        <IconButton
                            label="New file"
                            size="icon-xs"
                            onClick={() => ask({ kind: 'new', project: file?.project ?? 'harbor', fileKind: file?.kind ?? 'pipeline' })}
                        >
                            <FilePlus />
                        </IconButton>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Tabs" title="Tabs" />}>
                                <Ellipsis />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Tabs</DropdownMenuLabel>
                                    <DropdownMenuItem disabled={dirty.size === 0} onClick={() => void saveAll()}>
                                        <Save />
                                        Save all
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        disabled={prefs.tabs.length < 2}
                                        onClick={() => close(prefs.tabs.filter((one) => one !== tab))}
                                    >
                                        <X />
                                        Close the others
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        disabled={prefs.tabs.every((one) => dirty.has(one))}
                                        onClick={() => closeNow(prefs.tabs.filter((one) => !dirty.has(one)))}
                                    >
                                        <X />
                                        Close the saved ones
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled={prefs.tabs.length === 0} onClick={() => close(prefs.tabs)}>
                                        <X />
                                        Close all
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>
                }
            />
            <div className="min-h-0 flex-1">{content}</div>
        </Stack>
    )
}
