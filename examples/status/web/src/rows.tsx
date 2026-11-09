import { createContext, useContext, type ReactNode } from 'react'

import { useCollection } from 'tidevann-shared/backend'
import {
    type Deploy,
    deploys,
    type Handover,
    handovers,
    type Incident,
    incidents,
    type Maintenance,
    maintenance,
    type OnCall,
    onCall,
    type Shift,
    shifts,
    type Subscriber,
    subscribers,
} from './data'

/** Every collection the board reads, each undefined until its first answer. */
export interface Rows {
    incidents: Incident[] | undefined
    maintenance: Maintenance[] | undefined
    deploys: Deploy[] | undefined
    shifts: Shift[] | undefined
    onCall: OnCall | undefined
    handovers: Handover[] | undefined
    subscribers: Subscriber[] | undefined
    /** The first read that failed, said for a person. */
    error: string | undefined
}

const RowsContext = createContext<Rows>({
    incidents: undefined,
    maintenance: undefined,
    deploys: undefined,
    shifts: undefined,
    onCall: undefined,
    handovers: undefined,
    subscribers: undefined,
    error: undefined,
})

/** Reads every collection once for the whole app, so a page opens on rows already there. */
export function RowsProvider({ children }: { children: ReactNode }) {
    const read = [
        useCollection(incidents),
        useCollection(maintenance),
        useCollection(deploys),
        useCollection(shifts),
        useCollection(onCall),
        useCollection(handovers),
        useCollection(subscribers),
    ] as const
    const [incidentRows, maintenanceRows, deployRows, shiftRows, onCallRows, handoverRows, subscriberRows] = read
    const value: Rows = {
        incidents: incidentRows.rows,
        maintenance: maintenanceRows.rows,
        deploys: deployRows.rows,
        shifts: shiftRows.rows,
        onCall: onCallRows.rows?.[0],
        handovers: handoverRows.rows,
        subscribers: subscriberRows.rows,
        error: read.find((one) => one.error !== undefined)?.error,
    }
    return <RowsContext.Provider value={value}>{children}</RowsContext.Provider>
}

/** The collections' rows, read once for the app. */
export function useRows(): Rows {
    return useContext(RowsContext)
}
