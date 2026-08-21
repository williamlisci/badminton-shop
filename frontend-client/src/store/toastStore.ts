import {create} from 'zustand'

interface ToastState {
    message: string
    type: 'success' | 'error' | 'info'
    show: (message: string, type?: ToastState['type']) => void
    hide: () => void
}

export const useToastStore = create<ToastState>((set) => ({
    message: '',
    type: 'info',
    show: (message, type = 'info') => set({message, type}),
    hide: () => set({message: ''}),
}))
