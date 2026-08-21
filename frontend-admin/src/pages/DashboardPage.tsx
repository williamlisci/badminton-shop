import {useEffect, useState} from 'react'
import {Link} from 'react-router-dom'
import {
    getDashboardStats,
    type DashboardPeriod,
    type DashboardStats,
} from '../api/dashboard'

const formatMoney = (value: number | string) =>
    `${Number(value).toLocaleString('vi-VN')}₫`

function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [period, setPeriod] = useState<DashboardPeriod>('day')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError('')

        getDashboardStats(period)
            .then((data) => {
                if (!cancelled) setStats(data)
            })
            .catch(() => {
                if (!cancelled) setError('Không thể tải số liệu Dashboard.')
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [period])

    const handleLogout = () => {
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('refresh_token')
        window.location.href = '/'
    }

    const trendMax = stats
        ? Math.max(...stats.revenue_trend.map((point) => Number(point.revenue)), 1)
        : 1
    const comparison = Number(stats?.comparison.change_percent ?? 0)

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="flex items-center justify-between bg-emerald-600 px-6 py-4 text-white">
                <h1 className="text-xl font-bold">Badminton Shop Admin</h1>
                <nav className="flex items-center gap-6">
                    <Link to="/dashboard" className="hover:underline">Dashboard</Link>
                    <Link to="/products" className="hover:underline">Sản phẩm</Link>
                    <Link to="/catalog" className="hover:underline">Danh mục & thương hiệu</Link>
                    <Link to="/discounts" className="hover:underline">Khuyến mãi</Link>
                    <Link to="/customers" className="hover:underline">Khách hàng</Link>
                    <Link to="/admin-users" className="hover:underline">Nhân viên</Link>
                    <Link to="/audit-logs" className="hover:underline">Audit log</Link>
                    <Link to="/reports" className="hover:underline">Báo cáo</Link>
                    <Link to="/orders" className="hover:underline">Đơn hàng</Link>
                    <button type="button" onClick={handleLogout} className="hover:underline">
                        Đăng xuất
                    </button>
                </nav>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
                        <p className="mt-1 text-slate-500">
                            Theo dõi hiệu quả bán hàng và tình trạng kho.
                        </p>
                    </div>
                    <label className="flex items-center gap-3 text-sm text-slate-600">
                        Kỳ báo cáo
                        <select
                            value={period}
                            onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}
                            className="rounded-lg border bg-white px-3 py-2"
                        >
                            <option value="day">30 ngày gần nhất</option>
                            <option value="month">12 tháng gần nhất</option>
                        </select>
                    </label>
                </div>

                {loading && <p className="mt-6 text-slate-500">Đang tải số liệu...</p>}
                {error && <p className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}

                {stats && !loading && (
                    <>
                        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl bg-white p-6 shadow">
                                <p className="text-slate-500">Doanh thu kỳ này</p>
                                <p className="mt-2 text-2xl font-bold text-orange-600">
                                    {formatMoney(stats.period_revenue)}
                                </p>
                                <p className={comparison >= 0 ? 'mt-2 text-sm text-emerald-600' : 'mt-2 text-sm text-red-600'}>
                                    {comparison >= 0 ? '▲' : '▼'} {Math.abs(comparison).toFixed(2)}% so với kỳ trước
                                </p>
                            </div>
                            <div className="rounded-xl bg-white p-6 shadow">
                                <p className="text-slate-500">Đơn hàng kỳ này</p>
                                <p className="mt-2 text-2xl font-bold text-blue-600">{stats.period_orders}</p>
                                <p className="mt-2 text-sm text-slate-500">Tổng đơn hợp lệ: {stats.total_orders}</p>
                            </div>
                            <div className="rounded-xl bg-white p-6 shadow">
                                <p className="text-slate-500">Giá trị đơn trung bình</p>
                                <p className="mt-2 text-2xl font-bold text-violet-600">
                                    {formatMoney(stats.average_order_value)}
                                </p>
                            </div>
                            <div className="rounded-xl bg-white p-6 shadow">
                                <p className="text-slate-500">Sản phẩm đang bán</p>
                                <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.total_products}</p>
                                <p className="mt-2 text-sm text-slate-500">Theo dõi {stats.low_stock_products.length} sản phẩm sắp hết</p>
                            </div>
                        </section>

                        <section className="mt-6 rounded-xl bg-white p-6 shadow">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Doanh thu theo thời gian</h3>
                                    <p className="text-sm text-slate-500">Các ngày/tháng không có đơn vẫn được hiển thị.</p>
                                </div>
                                <span className="text-sm text-slate-500">Kỳ trước: {formatMoney(stats.comparison.previous_revenue)}</span>
                            </div>
                            <div className="mt-6 flex h-64 items-end gap-1 overflow-x-auto border-b border-slate-200 pb-1">
                                {stats.revenue_trend.map((point, index) => {
                                    const height = Math.max((Number(point.revenue) / trendMax) * 100, point.revenue ? 3 : 0)
                                    const showLabel = period === 'month' || index % 5 === 0 || index === stats.revenue_trend.length - 1
                                    return (
                                        <div key={point.label} className="flex h-full min-w-7 flex-1 flex-col items-center justify-end gap-2">
                                            <span className="text-[10px] text-slate-500">
                                                {Number(point.revenue) > 0 ? `${(Number(point.revenue) / 1000000).toFixed(1)}tr` : ''}
                                            </span>
                                            <div
                                                title={`${point.label}: ${formatMoney(point.revenue)} (${point.orders} đơn)`}
                                                className="w-full rounded-t bg-emerald-500 hover:bg-emerald-600"
                                                style={{height: `${height}%`}}
                                            />
                                            <span className="h-4 text-[10px] text-slate-500">
                                                {showLabel ? (period === 'month' ? point.label.slice(2) : point.label.slice(5)) : ''}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>

                        <div className="mt-6 grid gap-6 lg:grid-cols-2">
                            <section className="rounded-xl bg-white p-6 shadow">
                                <h3 className="text-xl font-bold text-slate-800">Đơn hàng theo trạng thái</h3>
                                <div className="mt-5 space-y-4">
                                    {stats.orders_by_status.map((item) => {
                                        const maxStatus = Math.max(...stats.orders_by_status.map((status) => status.count), 1)
                                        return (
                                            <div key={item.status}>
                                                <div className="mb-1 flex justify-between text-sm">
                                                    <span>{item.label}</span>
                                                    <strong>{item.count}</strong>
                                                </div>
                                                <div className="h-2 rounded-full bg-slate-100">
                                                    <div className="h-2 rounded-full bg-blue-500" style={{width: `${(item.count / maxStatus) * 100}%`}} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>

                            <section className="rounded-xl bg-white p-6 shadow">
                                <h3 className="text-xl font-bold text-slate-800">Sản phẩm bán chạy</h3>
                                {stats.top_products.length === 0 ? (
                                    <p className="mt-5 text-slate-500">Chưa có dữ liệu bán hàng trong kỳ.</p>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {stats.top_products.map((product, index) => (
                                            <div key={product.product_id} className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="font-bold text-slate-400">#{index + 1}</span>
                                                    <span className="truncate font-medium">{product.product_name}</span>
                                                </div>
                                                <div className="shrink-0 text-right text-sm">
                                                    <p className="font-semibold">{product.quantity_sold} sản phẩm</p>
                                                    <p className="text-slate-500">{formatMoney(product.revenue)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        <section className="mt-6 rounded-xl bg-white p-6 shadow">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h3 className="text-xl font-bold text-slate-800">Sản phẩm sắp hết hàng</h3>
                                <Link to="/products" className="text-sm text-emerald-600 hover:underline">Quản lý sản phẩm →</Link>
                            </div>
                            {stats.low_stock_products.length === 0 ? (
                                <p className="mt-5 text-emerald-600">Kho hiện không có sản phẩm dưới ngưỡng cảnh báo.</p>
                            ) : (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Sản phẩm</th>
                                            <th className="px-3 py-2">Danh mục</th>
                                            <th className="px-3 py-2">Tồn kho</th>
                                            <th className="px-3 py-2">Mức độ</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {stats.low_stock_products.map((product) => (
                                            <tr key={product.id} className="border-b last:border-0">
                                                <td className="px-3 py-3 font-medium">{product.name}</td>
                                                <td className="px-3 py-3 text-slate-500">{product.category_name}</td>
                                                <td className="px-3 py-3 font-bold text-orange-600">{product.stock_quantity}</td>
                                                <td className="px-3 py-3 text-orange-600">{product.stock_quantity === 0 ? 'Hết hàng' : 'Sắp hết'}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    )
}

export default DashboardPage
