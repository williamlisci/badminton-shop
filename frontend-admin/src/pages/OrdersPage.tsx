import {useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {exportOrders, exportRevenue, getOrders, updateOrderStatus, type AdminOrder, type OrderQuery} from '../api/orders'

const statuses = [
    {value: '', label: 'Tất cả trạng thái'},
    {value: 'pending', label: 'Chờ xác nhận'},
    {value: 'confirmed', label: 'Đã xác nhận'},
    {value: 'shipping', label: 'Đang giao'},
    {value: 'completed', label: 'Hoàn tất'},
    {value: 'cancelled', label: 'Đã hủy'},
]

const statusLabels = Object.fromEntries(statuses.filter((item) => item.value).map((item) => [item.value, item.label]))

function OrdersPage() {
    const [orders, setOrders] = useState<AdminOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [filters, setFilters] = useState<OrderQuery>({})
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [exporting, setExporting] = useState(false)

    const loadOrders = (params: OrderQuery = filters) => {
        setLoading(true)
        setError('')
        getOrders(params)
            .then(setOrders)
            .catch(() => setError('Không thể tải danh sách đơn hàng.'))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        loadOrders()
    }, [])

    const handleSearch = (event: FormEvent) => {
        event.preventDefault()
        const nextFilters = {...filters, search: searchInput.trim() || undefined}
        setFilters(nextFilters)
        loadOrders(nextFilters)
    }

    const updateFilter = (key: keyof OrderQuery, value: string) => {
        const nextFilters = {...filters, [key]: value || undefined}
        setFilters(nextFilters)
        loadOrders(nextFilters)
    }

    const clearFilters = () => {
        setSearchInput('')
        setStartDate('')
        setEndDate('')
        setFilters({})
        loadOrders({})
    }

    const handleStatusChange = async (order: AdminOrder, status: string) => {
        let reason = ''
        if (status === 'cancelled') {
            reason = window.prompt('Nhập lý do hủy đơn:')?.trim() ?? ''
            if (!reason) return
        }

        try {
            const updatedOrder = await updateOrderStatus(order.id, status, reason)
            setOrders((currentOrders) => currentOrders.map((item) => item.id === order.id ? updatedOrder : item))
        } catch {
            setError('Không thể cập nhật trạng thái đơn hàng.')
        }
    }

    const handleExport = async (exporter: () => Promise<void>) => {
        setExporting(true)
        setError('')
        try {
            await exporter()
        } catch {
            setError('Không thể xuất dữ liệu đơn hàng.')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="flex items-center justify-between bg-emerald-600 px-6 py-4 text-white">
                <h1 className="text-xl font-bold">Quản lý đơn hàng</h1>
                <nav className="flex items-center gap-6">
                    <Link to="/dashboard" className="hover:underline">Dashboard</Link>
                    <Link to="/products" className="hover:underline">Sản phẩm</Link>
                    <Link to="/catalog" className="hover:underline">Danh mục & thương hiệu</Link>
                </nav>
            </header>
            <main className="mx-auto max-w-7xl px-6 py-8">
                <h2 className="mb-6 text-3xl font-bold text-slate-800">Danh sách đơn hàng</h2>
                {error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
                <section className="mb-6 rounded-xl bg-white p-4 shadow">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="font-semibold text-slate-800">Export đơn hàng và doanh thu</h3>
                            <p className="text-sm text-slate-500">Báo cáo doanh thu không bao gồm đơn đã hủy.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={exporting} onClick={() => handleExport(exportOrders)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Xuất đơn hàng CSV</button>
                            <button type="button" disabled={exporting} onClick={() => handleExport(() => exportRevenue({start_date: startDate || undefined, end_date: endDate || undefined}))} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50">Xuất doanh thu CSV</button>
                        </div>
                    </div>
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Mã đơn, tên khách, số điện thoại" className="min-w-64 flex-1 rounded-lg border px-4 py-2" />
                        <select value={filters.status ?? ''} onChange={(event) => updateFilter('status', event.target.value)} className="rounded-lg border px-3 py-2">
                            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                        <input type="date" value={startDate} onChange={(event) => {setStartDate(event.target.value); updateFilter('start_date', event.target.value)}} className="rounded-lg border px-3 py-2" />
                        <input type="date" value={endDate} onChange={(event) => {setEndDate(event.target.value); updateFilter('end_date', event.target.value)}} className="rounded-lg border px-3 py-2" />
                        <button type="submit" className="rounded-lg bg-slate-800 px-5 py-2 text-white">Tìm kiếm</button>
                        <button type="button" onClick={clearFilters} className="rounded-lg border px-5 py-2">Xóa lọc</button>
                    </form>
                </section>
                {loading ? <p className="text-slate-500">Đang tải đơn hàng...</p> : <div className="overflow-x-auto rounded-xl bg-white shadow">
                    <table className="w-full text-left">
                        <thead className="bg-slate-100"><tr><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Điện thoại</th><th className="px-4 py-3">Tổng tiền</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Ngày tạo</th><th className="px-4 py-3">Chi tiết</th></tr></thead>
                        <tbody>
                        {orders.map((order) => <tr key={order.id} className="border-t hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">#{order.id}</td>
                            <td className="px-4 py-3">{order.customer_name}</td>
                            <td className="px-4 py-3">{order.customer_phone}</td>
                            <td className="px-4 py-3">{Number(order.total_amount).toLocaleString('vi-VN')}₫</td>
                            <td className="px-4 py-3"><select value={order.status} onChange={(event) => handleStatusChange(order, event.target.value)} className="rounded-lg border px-3 py-2"><option value={order.status}>{statusLabels[order.status] ?? order.status}</option>{statuses.filter((item) => item.value && item.value !== order.status).map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td>
                            <td className="px-4 py-3 text-sm text-slate-500">{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                            <td className="px-4 py-3"><Link to={`/orders/${order.id}`} className="text-blue-600 hover:underline">Xem</Link></td>
                        </tr>)}
                        </tbody>
                    </table>
                    {orders.length === 0 && <p className="px-4 py-10 text-center text-slate-500">Không tìm thấy đơn hàng phù hợp.</p>}
                </div>}
            </main>
        </div>
    )
}

export default OrdersPage
