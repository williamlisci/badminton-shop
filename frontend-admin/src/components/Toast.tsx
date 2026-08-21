import {useEffect} from 'react'
import {useToastStore} from '../store/toastStore'

export default function Toast() {
    const {message, type, hide} = useToastStore()
    useEffect(() => {
        if (!message) return
        const timer = window.setTimeout(hide, 3500)
        return () => window.clearTimeout(timer)
    }, [hide, message])
    if (!message) return null
    return <div role="status" className={`fixed right-5 top-5 z-50 rounded-lg px-4 py-3 text-white shadow-lg ${type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>{message}</div>
}
