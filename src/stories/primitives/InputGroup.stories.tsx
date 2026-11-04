import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Eye, Globe, Loader2, RefreshCw, Search } from 'lucide-react'
import type { ReactNode } from 'react'

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
} from '../../components/ui/input-group'
import { Kbd } from '../../components/ui/kbd'

function Ground({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-svh bg-background p-6 text-foreground">
            <div className="mx-auto flex max-w-[1100px] flex-col gap-8">{children}</div>
        </div>
    )
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex w-full max-w-xs flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            {children}
        </div>
    )
}

const meta: Meta = { title: 'Primitives/Inputs/InputGroup' }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="icon inline-start">
                    <InputGroup>
                        <InputGroupInput aria-label="Search" placeholder="Search pipelines" />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
                <Labeled label="text inline-start">
                    <InputGroup>
                        <InputGroupInput aria-label="Host" defaultValue="play.dhis2.org" />
                        <InputGroupAddon>
                            <InputGroupText>https://</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
                <Labeled label="text inline-end">
                    <InputGroup>
                        <InputGroupInput aria-label="Timeout" defaultValue="30" />
                        <InputGroupAddon align="inline-end">
                            <InputGroupText>seconds</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
                <Labeled label="button inline-end">
                    <InputGroup>
                        <InputGroupInput aria-label="Token" type="password" defaultValue="d2pat_abcdefghijkl" />
                        <InputGroupAddon align="inline-end">
                            <InputGroupButton size="icon-xs" aria-label="Show token">
                                <Eye />
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
                <Labeled label="kbd inline-end">
                    <InputGroup>
                        <InputGroupInput aria-label="Search" placeholder="Search" />
                        <InputGroupAddon>
                            <Search />
                        </InputGroupAddon>
                        <InputGroupAddon align="inline-end">
                            <Kbd>Ctrl K</Kbd>
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
                <Labeled label="block-end textarea">
                    <InputGroup>
                        <InputGroupTextarea aria-label="Filter" defaultValue=".rows | map(select(.value > 0))" />
                        <InputGroupAddon align="block-end">
                            <InputGroupText>jq</InputGroupText>
                            <InputGroupButton className="ml-auto" variant="default">
                                Apply
                            </InputGroupButton>
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex flex-wrap gap-6">
                <Labeled label="disabled">
                    <InputGroup data-disabled="true">
                        <InputGroupInput aria-label="Host" disabled defaultValue="play.dhis2.org" />
                        <InputGroupAddon>
                            <Globe />
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
                <Labeled label="invalid">
                    <InputGroup>
                        <InputGroupInput aria-label="Timeout" aria-invalid defaultValue="thirty" />
                        <InputGroupAddon align="inline-end">
                            <InputGroupText>seconds</InputGroupText>
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
                <Labeled label="loading">
                    <InputGroup>
                        <InputGroupInput aria-label="Search" defaultValue="dhis2" />
                        <InputGroupAddon align="inline-end">
                            <Loader2 className="animate-spin" />
                        </InputGroupAddon>
                    </InputGroup>
                </Labeled>
            </div>
        </Ground>
    ),
}

export const WebhookUrl: StoryObj = {
    render: () => (
        <Ground>
            <div className="flex max-w-lg flex-col gap-2">
                <p className="text-sm font-medium">Webhook for trigger on-upload</p>
                <InputGroup>
                    <InputGroupAddon>
                        <InputGroupText>POST</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput aria-label="Webhook URL" readOnly defaultValue="https://dirigent.example.org/hooks/weather-gate" />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton size="icon-xs" aria-label="Copy URL">
                            <Copy />
                        </InputGroupButton>
                        <InputGroupButton size="icon-xs" aria-label="Rotate URL">
                            <RefreshCw />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                <p className="text-xs text-muted-foreground">Last called 2026-11-04 14:02, answered in 1.2s.</p>
            </div>
        </Ground>
    ),
}
