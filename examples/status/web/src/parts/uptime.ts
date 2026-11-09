import type { UptimeDay } from '@winterop-com/sokkel-ui/UptimeBar'
import { useMemo } from 'react'

import { SERVICE_IDS, type ServiceId } from '../data'
import { uptimeDays } from '../history'
import { useRows } from '../rows'

export type UptimeByService = Record<ServiceId, UptimeDay[]>

/** Every service's last ninety days, drawn again when the incidents or the maintenance change. */
export function useUptime(): UptimeByService {
    const { incidents, maintenance } = useRows()
    return useMemo(() => {
        const now = Date.now()
        return Object.fromEntries(SERVICE_IDS.map((id) => [id, uptimeDays(id, incidents ?? [], maintenance ?? [], now)])) as UptimeByService
    }, [incidents, maintenance])
}
