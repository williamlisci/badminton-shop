import {useState, type FormEvent} from 'react'
import {trackOrder, type TrackedOrder} from '../api/orders'
import {useToastStore} from '../store/toastStore'

const labels: Record<string, string> = {pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn tất', cancelled: 'Đã hủy'}

function TrackOrderPage() {
    const [orderId, setOrderId] = useState('')
    const [phone, setPhone] = useState('')
    const [order, setOrder] = useState<TrackedOrder | null>(null)
    const [error, setError] = useState('')
    const showToast = useToastStore((state) => state.show)
    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError('')
        if (!orderId.trim() || !phone.trim()) {
            setError('Vui lòng nhập mã đơn và số điện thoại.')
            return
        }
        try {
            setOrder(await trackOrder(orderId.trim(), phone.trim()))
        } catch {
            const message = 'Không tìm thấy đơn hàng với thông tin đã cung cấp.'
            setError(message)
            showToast(message, 'error')
        }
    }
    return <main className="mx-auto max-w-2xl px-4 py-10"><h1 className="mb-6 text-3xl font-bold text-slate-800">Tra cứu đơn hàng</h1><form onSubmit={submit} className="space-y-4 rounded-xl bg-slate-50 p-5"><label className="block">Mã đơn<input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Ví dụ: 123" className="mt-1 w-full rounded-lg border px-4 py-3" /></label><label className="block">Số điện thoại<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" className="mt-1 w-full rounded-lg border px-4 py-3" /></label>{error && <p role="alert" className="text-red-600">{error}</p>}<button className="rounded-lg bg-emerald-600 px-5 py-3 text-white">Tra cứu</button></form>{order && <section className="mt-6 rounded-xl border p-5"><h2 className="text-xl font-bold">Đơn hàng #{order.id}</h2><p className="mt-3">Trạng thái: <strong className="text-emerald-600">{labels[order.status] ?? order.status}</strong></p><p className="mt-2">Tổng tiền: <strong>{Number(order.total_amount).toLocaleString('vi-VN')}₫</strong></p><p className="mt-2 text-slate-500">Ngày đặt: {new Date(order.created_at).toLocaleString('vi-VN')}</p></section>}</main>
}

export default TrackOrderPage
