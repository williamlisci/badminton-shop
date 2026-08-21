import {useCallback, useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {exportReport, getReports, type ReportsData} from '../api/reports'

const money = (value: unknown) => `${Number(value ?? 0).toLocaleString('vi-VN')}₫`

function ReportsPage() {
    const [report, setReport] = useState<ReportsData | null>(null)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [error, setError] = useState('')

    const load = useCallback(() => {
        setLoading(true)
        setError('')
        getReports({start_date: startDate || undefined, end_date: endDate || undefined})
            .then(setReport).catch(() => setError('Không thể tải báo cáo.'))
            .finally(() => setLoading(false))
    }, [endDate, startDate])

    useEffect(() => { load() }, [load])

    const submit = (event: FormEvent) => {
        event.preventDefault()
        load()
    }

    const download = async (format: 'xlsx' | 'pdf') => {
        setExporting(true)
        try {
            await exportReport(format, {start_date: startDate || undefined, end_date: endDate || undefined})
        } catch {
            setError('Không thể xuất báo cáo.')
        } finally {
            setExporting(false)
        }
    }

    return <div className="min-h-screen bg-slate-100">
        <header className="bg-emerald-600 px-6 py-4 text-white"><h1 className="text-xl font-bold">Báo cáo và xuất dữ liệu</h1></header>
        <main className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-3xl font-bold text-slate-800">Báo cáo kinh doanh</h2><Link to="/dashboard" className="text-blue-600">← Dashboard</Link></div>
            <section className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-xl bg-white p-4 shadow">
                <form onSubmit={submit} className="flex flex-wrap items-end gap-3"><label className="text-sm text-slate-600">Từ ngày<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block rounded-lg border px-3 py-2" /></label><label className="text-sm text-slate-600">Đến ngày<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block rounded-lg border px-3 py-2" /></label><button className="rounded-lg bg-slate-800 px-5 py-2 text-white">Xem báo cáo</button></form>
                <div className="flex gap-2"><button disabled={exporting} onClick={() => download('xlsx')} className="rounded-lg border px-4 py-2 disabled:opacity-50">Xuất Excel</button><button disabled={exporting} onClick={() => download('pdf')} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">Xuất PDF</button></div>
            </section>
            {error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
            {loading ? <p className="text-slate-500">Đang tải báo cáo...</p> : report && <><section className="mb-6 grid gap-4 md:grid-cols-4"><div className="rounded-xl bg-white p-5 shadow"><p className="text-slate-500">Doanh thu</p><p className="mt-2 text-2xl font-bold text-emerald-600">{money(report.summary.revenue)}</p></div><div className="rounded-xl bg-white p-5 shadow"><p className="text-slate-500">Giá vốn</p><p className="mt-2 text-2xl font-bold text-orange-600">{money(report.summary.cost)}</p></div><div className="rounded-xl bg-white p-5 shadow"><p className="text-slate-500">Lợi nhuận</p><p className="mt-2 text-2xl font-bold text-blue-600">{money(report.summary.profit)}</p></div><div className="rounded-xl bg-white p-5 shadow"><p className="text-slate-500">Số đơn hợp lệ</p><p className="mt-2 text-2xl font-bold">{report.summary.orders}</p></div></section><section className="mb-6 rounded-xl bg-white p-5 shadow"><h3 className="mb-4 text-xl font-bold">Sản phẩm bán chạy</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="px-3 py-2">Sản phẩm</th><th className="px-3 py-2">Số lượng</th><th className="px-3 py-2">Doanh thu</th><th className="px-3 py-2">Lợi nhuận</th></tr></thead><tbody>{report.best_sellers.map((item) => <tr key={item.product_id} className="border-t"><td className="px-3 py-2">{item.product_name}</td><td className="px-3 py-2">{item.quantity_sold}</td><td className="px-3 py-2">{money(item.revenue)}</td><td className="px-3 py-2">{money(item.profit)}</td></tr>)}</tbody></table></div></section><section className="rounded-xl bg-white p-5 shadow"><h3 className="mb-4 text-xl font-bold">Báo cáo tồn kho</h3><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="px-3 py-2">Sản phẩm</th><th className="px-3 py-2">Danh mục</th><th className="px-3 py-2">Tồn kho</th><th className="px-3 py-2">Giá trị vốn</th></tr></thead><tbody>{report.inventory.map((item) => <tr key={item.id} className="border-t"><td className="px-3 py-2">{item.name}</td><td className="px-3 py-2">{item.category_name}</td><td className="px-3 py-2">{item.stock_quantity}</td><td className="px-3 py-2">{money(item.stock_value)}</td></tr>)}</tbody></table></div></section></>}
        </main>
    </div>
}

export default ReportsPage
