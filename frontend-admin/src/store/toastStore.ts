import {useSyncExternalStore} from 'react'

type ToastType = 'success' | 'error'
interface ToastSnapshot { message: string; type: ToastType }

let snapshot: ToastSnapshot = {message: '', type: 'success'}
const listeners = new Set<() => void>()

const toastStore = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
    },
    show: (message: string, type: ToastType = 'success') => {
        snapshot = {message, type}
        listeners.forEach((listener) => listener())
    },
    hide: () => {
        snapshot = {...snapshot, message: ''}
        listeners.forEach((listener) => listener())
    },
}

export const useToastStore = () => {
    const current = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot)
    return {...current, show: toastStore.show, hide: toastStore.hide}
}
