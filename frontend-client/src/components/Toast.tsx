import {useEffect} from 'react'
import {useToastStore} from '../store/toastStore'

function Toast() {
    const {message, type, hide} = useToastStore()
    useEffect(() => {
        if (!message) return
        const timer = window.setTimeout(hide, 4000)
        return () => window.clearTimeout(timer)
    }, [hide, message])
    if (!message) return null
    const color = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-emerald-600' : 'bg-slate-800'
    return <div role="status" aria-live="polite" className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-lg px-4 py-3 text-white shadow-lg ${color}`}><span>{message}</span><button type="button" onClick={hide} aria-label="Đóng thông báo" className="ml-4 font-bold">×</button></div>
}

export default Toast
