import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Eye, Globe, Loader2, RefreshCw, Search } from 'lucide-react'

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
} from '../../components/ui/input-group'
import { Kbd } from '../../components/ui/kbd'
import { Row, Stack } from '../../components/Layout'
import { Specimen } from '../fixtures/Specimen'

const meta: Meta = { title: 'Primitives/Inputs/InputGroup', parameters: { frame: 'column' } }
export default meta

export const Variants: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen className="w-full max-w-xs" label="icon inline-start">
                <InputGroup>
                    <InputGroupInput aria-label="Search" placeholder="Search jobs" />
                    <InputGroupAddon>
                        <Search />
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="text inline-start">
                <InputGroup>
                    <InputGroupInput aria-label="Host" defaultValue="api.example.org" />
                    <InputGroupAddon>
                        <InputGroupText>https://</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="text inline-end">
                <InputGroup>
                    <InputGroupInput aria-label="Timeout" defaultValue="30" />
                    <InputGroupAddon align="inline-end">
                        <InputGroupText>seconds</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="button inline-end">
                <InputGroup>
                    <InputGroupInput aria-label="Token" type="password" defaultValue="tok_abcdefghijklm" />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton size="icon-xs" aria-label="Show token">
                            <Eye />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="kbd inline-end">
                <InputGroup>
                    <InputGroupInput aria-label="Search" placeholder="Search" />
                    <InputGroupAddon>
                        <Search />
                    </InputGroupAddon>
                    <InputGroupAddon align="inline-end">
                        <Kbd>Ctrl K</Kbd>
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="block-end textarea">
                <InputGroup>
                    <InputGroupTextarea aria-label="Filter" defaultValue=".rows | map(select(.amount > 0))" />
                    <InputGroupAddon align="block-end">
                        <InputGroupText>jq</InputGroupText>
                        <InputGroupButton className="ml-auto" variant="default">
                            Apply
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
        </Row>
    ),
}

export const States: StoryObj = {
    render: () => (
        <Row gap="xl" align="stretch" wrap>
            <Specimen className="w-full max-w-xs" label="disabled">
                <InputGroup data-disabled="true">
                    <InputGroupInput aria-label="Host" disabled defaultValue="api.example.org" />
                    <InputGroupAddon>
                        <Globe />
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="invalid">
                <InputGroup>
                    <InputGroupInput aria-label="Timeout" aria-invalid defaultValue="thirty" />
                    <InputGroupAddon align="inline-end">
                        <InputGroupText>seconds</InputGroupText>
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
            <Specimen className="w-full max-w-xs" label="loading">
                <InputGroup>
                    <InputGroupInput aria-label="Search" defaultValue="orders" />
                    <InputGroupAddon align="inline-end">
                        <Loader2 className="animate-spin" />
                    </InputGroupAddon>
                </InputGroup>
            </Specimen>
        </Row>
    ),
}

export const WebhookUrl: StoryObj = {
    render: () => (
        <Stack gap="sm" className="max-w-lg">
            <p className="text-sm font-medium">Webhook for import-orders</p>
            <InputGroup>
                <InputGroupAddon>
                    <InputGroupText>POST</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput aria-label="Webhook URL" readOnly defaultValue="https://api.example.org/hooks/import-orders" />
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
        </Stack>
    ),
}
