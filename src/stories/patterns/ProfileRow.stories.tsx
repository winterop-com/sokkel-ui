import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bookmark, Share2 } from 'lucide-react'

import { ProfileRow } from '@winterop-com/sokkel-ui/ProfileRow'
import { Button } from '@winterop-com/sokkel-ui/primitives/button'
import { pictureOf } from '../fixtures/portraits'

const meta: Meta = { title: 'Patterns/Profile row', parameters: { frame: 'column' } }
export default meta

/** A person with a fact under their name and an action beside them, on one center line. */
export const Person: StoryObj = {
    render: () => <ProfileRow name="grace" detail="312k followers" image={pictureOf('grace')} action={<Button size="sm">Follow</Button>} />,
}

/** With the page's own actions at the row's end; they wrap under the person on a narrow row. */
export const WithActions: StoryObj = {
    name: 'With actions',
    render: () => (
        <ProfileRow
            name="ada"
            detail="Owner of harbor"
            color="blue"
            action={
                <Button size="sm" variant="secondary">
                    Following
                </Button>
            }
            actions={
                <>
                    <Button variant="outline" size="sm">
                        <Share2 aria-hidden />
                        Share
                    </Button>
                    <Button variant="outline" size="sm">
                        <Bookmark aria-hidden />
                        Save
                    </Button>
                </>
            }
        />
    ),
}
