import {useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {getCustomers, updateCustomerNote, type AdminCustomer} from '../api/customers'

const statusLabels: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
}

function CustomersPage() {
    const [customers, setCustomers] = useState<AdminCustomer[]>([])
    const [selected, setSelected] = useState<AdminCustomer | null>(null)
    const [searchInput, setSearchInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const load = (search = '') => {
        setLoading(true)
        setError('')
        getCustomers(search)
            .then((data) => {
                setCustomers(data)
                setSelected((current) => current ? data.find((item) => item.id === current.id) ?? null : null)
            })
            .catch(() => setError('Không thể tải danh sách khách hàng.'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const search = (event: FormEvent) => {
        event.preventDefault()
        load(searchInput.trim())
    }

    const saveNote = async () => {
        if (!selected) return
        setSaving(true)
        try {
            const updated = await updateCustomerNote(selected.id, selected.note)
            setSelected(updated)
            setCustomers((current) => current.map((item) => item.id === updated.id ? updated : item))
        } catch {
            setError('Không thể lưu ghi chú khách hàng.')
        } finally {
            setSaving(false)
        }
    }

    return <div className="min-h-screen bg-slate-100">
        <header className="bg-emerald-600 px-6 py-4 text-white"><h1 className="text-xl font-bold">Quản lý khách hàng</h1></header>
        <main className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-3xl font-bold text-slate-800">Danh sách khách hàng</h2><Link to="/dashboard" className="text-blue-600">← Dashboard</Link></div>
            {error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
            <section className="mb-6 rounded-xl bg-white p-4 shadow"><form onSubmit={search} className="flex gap-3"><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm theo tên hoặc số điện thoại" className="flex-1 rounded-lg border px-4 py-2" /><button className="rounded-lg bg-slate-800 px-5 py-2 text-white">Tìm kiếm</button><button type="button" onClick={() => {setSearchInput(''); load()}} className="rounded-lg border px-5 py-2">Xóa lọc</button></form></section>
            {loading ? <p className="text-slate-500">Đang tải khách hàng...</p> : <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <section className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Điện thoại</th><th className="px-4 py-3">Số lần mua</th><th className="px-4 py-3">Tổng tiền</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} onClick={() => setSelected(customer)} className={`cursor-pointer border-t hover:bg-emerald-50 ${selected?.id === customer.id ? 'bg-emerald-50' : ''}`}><td className="px-4 py-3 font-medium">{customer.customer_name}</td><td className="px-4 py-3">{customer.customer_phone}</td><td className="px-4 py-3">{customer.purchase_count}</td><td className="px-4 py-3">{Number(customer.total_spent).toLocaleString('vi-VN')}₫</td></tr>)}</tbody></table>{customers.length === 0 && <p className="px-4 py-10 text-center text-slate-500">Chưa có khách hàng phù hợp.</p>}</section>
                {selected ? <section className="rounded-xl bg-white p-6 shadow"><h3 className="text-2xl font-bold text-slate-800">{selected.customer_name}</h3><p className="mt-1 text-slate-500">{selected.customer_phone}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">Số lần mua</p><strong>{selected.purchase_count}</strong></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">Tổng đã mua</p><strong>{Number(selected.total_spent).toLocaleString('vi-VN')}₫</strong></div></div><label className="mt-5 block font-medium">Ghi chú khách hàng<textarea value={selected.note} onChange={(event) => setSelected({...selected, note: event.target.value})} rows={3} className="mt-2 w-full rounded-lg border px-3 py-2" /></label><button type="button" disabled={saving} onClick={saveNote} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu ghi chú'}</button><h4 className="mt-6 mb-3 text-xl font-semibold">Lịch sử đơn hàng</h4><div className="max-h-72 space-y-3 overflow-y-auto">{selected.orders.map((order) => <div key={order.id} className="rounded-lg border p-3"><div className="flex justify-between"><strong>#{order.id}</strong><span className="text-sm text-slate-500">{new Date(order.created_at).toLocaleString('vi-VN')}</span></div><p className="mt-1">{statusLabels[order.status] ?? order.status} · {Number(order.total_amount).toLocaleString('vi-VN')}₫</p><p className="text-sm text-slate-500">{order.shipping_address}</p></div>)}</div></section> : <section className="rounded-xl bg-white p-6 text-slate-500 shadow">Chọn một khách hàng để xem chi tiết.</section>}
            </div>}
        </main>
    </div>
}

export default CustomersPage
