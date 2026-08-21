import {useEffect, useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {cancelOrder, confirmOrder, getOrder, updateOrderNote, updateOrderStatus, type AdminOrder} from '../api/orders'

const statusLabels: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
}

const formatMoney = (value: number | string) => `${Number(value).toLocaleString('vi-VN')}₫`

function OrderDetailPage() {
    const {id} = useParams<{id: string}>()
    const [order, setOrder] = useState<AdminOrder | null>(null)
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!id) return
        getOrder(Number(id))
            .then((data) => {setOrder(data); setNote(data.internal_note ?? '')})
            .catch(() => setError('Không thể tải chi tiết đơn hàng.'))
            .finally(() => setLoading(false))
    }, [id])

    const handleStatusChange = async (status: string) => {
        if (!order || status === order.status) return
        let reason = ''
        if (status === 'cancelled') {
            reason = window.prompt('Nhập lý do hủy đơn:')?.trim() ?? ''
            if (!reason) return
        }
        try {
            setSaving(true)
            setOrder(await updateOrderStatus(order.id, status, reason))
        } catch {
            setError('Không thể cập nhật trạng thái đơn hàng.')
        } finally {
            setSaving(false)
        }
    }

    const handleConfirm = async () => {
        if (!order) return
        try {
            setSaving(true)
            setOrder(await confirmOrder(order.id))
        } catch {
            setError('Không thể xác nhận đơn hàng.')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = async () => {
        if (!order) return
        const reason = window.prompt('Nhập lý do hủy đơn:')?.trim() ?? ''
        if (!reason) return
        try {
            setSaving(true)
            setOrder(await cancelOrder(order.id, reason))
        } catch {
            setError('Không thể hủy đơn hàng.')
        } finally {
            setSaving(false)
        }
    }

    const saveNote = async () => {
        if (!order) return
        try {
            setSaving(true)
            setOrder(await updateOrderNote(order.id, note.trim()))
        } catch {
            setError('Không thể lưu ghi chú nội bộ.')
        } finally {
            setSaving(false)
        }
    }

    const printInvoice = () => window.print()

    if (loading) return <div className="p-8 text-slate-500">Đang tải đơn hàng...</div>
    if (error && !order) return <div className="p-8 text-red-600">{error}</div>
    if (!order) return <div className="p-8 text-red-600">Không tìm thấy đơn hàng.</div>

    return <div className="min-h-screen bg-slate-100">
        <header className="bg-emerald-600 px-6 py-4 text-white print:hidden"><h1 className="text-xl font-bold">Chi tiết đơn hàng #{order.id}</h1></header>
        <main className="mx-auto max-w-5xl px-6 py-8">
            <div className="mb-6 flex items-center justify-between print:hidden"><Link to="/orders" className="text-emerald-600 hover:underline">← Quay lại danh sách</Link><button type="button" onClick={printInvoice} className="rounded-lg border bg-white px-4 py-2">In hóa đơn</button></div>
            {error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
            <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-xl bg-white p-6 shadow">
                    <h2 className="mb-4 text-xl font-bold">Thông tin khách hàng</h2>
                    <p><strong>Họ tên:</strong> {order.customer_name}</p>
                    <p className="mt-2"><strong>Số điện thoại:</strong> {order.customer_phone}</p>
                    <p className="mt-2"><strong>Địa chỉ:</strong> {order.shipping_address}</p>
                    <p className="mt-2"><strong>Thanh toán:</strong> {order.payment_method.toUpperCase()}</p>
                    <label htmlFor="status" className="mt-4 block font-medium">Trạng thái</label>
                    <select id="status" disabled={saving} value={order.status} onChange={(event) => handleStatusChange(event.target.value)} className="mt-2 rounded-lg border px-3 py-2">
                        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <div className="mt-4 flex gap-3 print:hidden">
                        {order.status === 'pending' && <button type="button" disabled={saving} onClick={handleConfirm} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">Xác nhận đơn</button>}
                        {!['cancelled', 'completed'].includes(order.status) && <button type="button" disabled={saving} onClick={handleCancel} className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50">Hủy đơn</button>}
                    </div>
                    {order.cancellation_reason && <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700"><strong>Lý do hủy:</strong> {order.cancellation_reason}</p>}
                </section>
                <section className="rounded-xl bg-white p-6 shadow">
                    <h2 className="mb-4 text-xl font-bold">Sản phẩm trong đơn</h2>
                    <div className="space-y-4">{order.items.map((item) => <div key={item.id} className="border-b pb-3"><p className="font-medium">{item.product_name}</p><p className="text-sm text-slate-500">{item.quantity} × {formatMoney(item.price)}</p><p className="mt-1 font-bold">{formatMoney(item.subtotal)}</p></div>)}</div>
                    <div className="mt-4 flex justify-between border-t pt-4"><span className="font-bold">Tổng cộng</span><span className="text-xl font-bold text-emerald-600">{formatMoney(order.total_amount)}</span></div>
                </section>
            </div>
            <section className="mt-6 rounded-xl bg-white p-6 shadow print:hidden">
                <h2 className="mb-3 text-xl font-bold">Ghi chú nội bộ</h2>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Ghi chú chỉ dành cho nhân viên..." className="w-full rounded-lg border px-3 py-2" />
                <button type="button" disabled={saving} onClick={saveNote} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-white disabled:opacity-50">Lưu ghi chú</button>
            </section>
            <section className="mt-6 rounded-xl bg-white p-6 shadow print:hidden">
                <h2 className="mb-4 text-xl font-bold">Lịch sử trạng thái</h2>
                {order.status_history.length === 0 ? <p className="text-slate-500">Chưa có lịch sử thay đổi.</p> : <div className="space-y-3">{order.status_history.map((entry) => <div key={entry.id} className="border-l-2 border-emerald-500 pl-4"><p className="font-medium">{statusLabels[entry.from_status] ?? 'Mới tạo'} → {statusLabels[entry.to_status] ?? entry.to_status}</p><p className="text-sm text-slate-500">{new Date(entry.created_at).toLocaleString('vi-VN')} · {entry.changed_by ?? 'Hệ thống'}</p>{entry.reason && <p className="text-sm">Lý do: {entry.reason}</p>}</div>)}</div>}
            </section>
        </main>
    </div>
}

export default OrderDetailPage
