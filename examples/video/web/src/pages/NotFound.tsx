import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@winterop-com/sokkel-ui/primitives/empty'

import { go } from 'tidevann-shared/router'

/** An address that leads nowhere: a page, a channel or a playlist that is not there. */
export function NotFound({ what = 'page' }: { what?: 'page' | 'channel' | 'playlist' }) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyTitle>No such {what}</EmptyTitle>
                <EmptyDescription>
                    There is no {what} at #/{window.location.hash.replace(/^#\/?/, '')}. It may have been removed.
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button variant="outline" size="sm" onClick={() => go('/')}>
                    Go home
                </Button>
            </EmptyContent>
        </Empty>
    )
}
