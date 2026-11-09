import { BarList } from '@winterop-com/sokkel-ui/BarList'
import { Columns, Stack } from '@winterop-com/sokkel-ui/Layout'
import { PageHeader } from '@winterop-com/sokkel-ui/PageHeader'
import { Section } from '@winterop-com/sokkel-ui/Section'
import { Stat } from '@winterop-com/sokkel-ui/Stat'
import { ChartNoAxesColumn } from 'lucide-react'

import { day, DAY } from '../backend'
import { showById } from '../catalog'
import { Nothing, spoken } from '../parts'
import { usePodcasts } from '../state'

/** Stats: the time listened, this week and in all, the episodes finished, the time speed saved, and the shows heard most. */
export function Stats() {
    const { listens } = usePodcasts()
    const week = new Set(Array.from({ length: 7 }, (_, offset) => day(-offset)))
    const total = listens.reduce((sum, row) => sum + row.seconds, 0)
    const thisWeek = listens.filter((row) => week.has(row.day)).reduce((sum, row) => sum + row.seconds, 0)
    const finished = listens.reduce((sum, row) => sum + row.finished, 0)
    const saved = listens.reduce((sum, row) => sum + Math.max(0, row.content - row.seconds), 0)

    const byShow = new Map<string, number>()
    for (const row of listens) byShow.set(row.show, (byShow.get(row.show) ?? 0) + row.seconds)
    const top = [...byShow.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    const most = top[0]?.[1] ?? 1

    const days = Array.from({ length: 7 }, (_, index) => {
        const offset = index - 6
        const key = day(offset)
        const seconds = listens.filter((row) => row.day === key).reduce((sum, row) => sum + row.seconds, 0)
        const label = offset === 0 ? 'Today' : new Date(Date.now() + offset * DAY).toLocaleDateString('en', { weekday: 'long' })
        return { key, label, seconds }
    })
    const busiest = Math.max(1, ...days.map((one) => one.seconds))

    return (
        <Stack gap="section">
            <PageHeader title="Stats" description="Time listened, counted as you play, kept with your settings." />
            {total === 0 ? (
                <Nothing icon={<ChartNoAxesColumn aria-hidden />} title="Nothing listened yet">
                    Play an episode, and the time you listen is counted here.
                </Nothing>
            ) : (
                <>
                    <Columns count={4} min="xs">
                        <Stat variant="tile" label="Listened" value={spoken(total)} note="in all" />
                        <Stat variant="tile" label="This week" value={spoken(thisWeek)} note="the last seven days" />
                        <Stat variant="tile" label="Finished" value={finished} note={finished === 1 ? 'episode' : 'episodes'} />
                        <Stat variant="tile" label="Saved by speed" value={spoken(saved)} note="playing faster than 1x" />
                    </Columns>
                    <Columns count={2} min="md" align="start">
                        <Section title="Top shows">
                            <BarList
                                label="Time listened by show"
                                items={top.map(([show, seconds], index) => ({
                                    id: show,
                                    label: showById.get(show)?.title ?? show,
                                    value: seconds / most,
                                    chosen: index === 0,
                                }))}
                                format={(share) => spoken(share * most)}
                            />
                        </Section>
                        <Section title="The last seven days">
                            <BarList
                                label="Time listened by day"
                                items={days.map((one) => ({
                                    id: one.key,
                                    label: one.label,
                                    value: one.seconds / busiest,
                                    chosen: one.key === day(),
                                }))}
                                format={(share) => spoken(share * busiest)}
                            />
                        </Section>
                    </Columns>
                </>
            )}
        </Stack>
    )
}
