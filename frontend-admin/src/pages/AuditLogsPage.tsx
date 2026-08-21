import {useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {getAuditLogs, type AuditLog, type AuditLogQuery} from '../api/auditLogs'

const formatValue = (value: unknown) => value === null || value === undefined || value === '' ? '—' : String(value)

function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [query, setQuery] = useState<AuditLogQuery>({})
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = (params = query) => {
        setLoading(true)
        setError('')
        getAuditLogs(params).then(setLogs).catch(() => setError('Không thể tải nhật ký hoạt động.')).finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const submit = (event: FormEvent) => {
        event.preventDefault()
        const next = {...query, search: search.trim() || undefined}
        setQuery(next)
        load(next)
    }

    const changeFilter = (key: keyof AuditLogQuery, value: string) => {
        const next = {...query, [key]: value || undefined}
        setQuery(next)
        load(next)
    }

    return <div className="min-h-screen bg-slate-100">
        <header className="bg-emerald-600 px-6 py-4 text-white"><h1 className="text-xl font-bold">Audit log</h1></header>
        <main className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-3xl font-bold text-slate-800">Nhật ký hoạt động</h2><Link to="/dashboard" className="text-blue-600">← Dashboard</Link></div>
            <form onSubmit={submit} className="mb-6 flex flex-wrap gap-3 rounded-xl bg-white p-4 shadow">
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm nội dung, mã đối tượng, người thực hiện" className="min-w-72 flex-1 rounded-lg border px-4 py-2" />
                <select value={query.entity_type ?? ''} onChange={(event) => changeFilter('entity_type', event.target.value)} className="rounded-lg border px-3 py-2"><option value="">Tất cả đối tượng</option><option value="product">Sản phẩm</option><option value="order">Đơn hàng</option></select>
                <select value={query.action ?? ''} onChange={(event) => changeFilter('action', event.target.value)} className="rounded-lg border px-3 py-2"><option value="">Tất cả hành động</option><option value="created">Tạo mới</option><option value="updated">Cập nhật</option><option value="deleted">Xóa</option><option value="stock_changed">Thay đổi tồn kho</option></select>
                <button className="rounded-lg bg-slate-800 px-5 py-2 text-white">Tìm kiếm</button>
            </form>
            {error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
            {loading ? <p className="text-slate-500">Đang tải nhật ký...</p> : <div className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3">Người thực hiện</th><th className="px-4 py-3">Hành động</th><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Chi tiết thay đổi</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-t align-top"><td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(log.created_at).toLocaleString('vi-VN')}</td><td className="px-4 py-3">{log.actor_name ?? 'Hệ thống / khách hàng'}</td><td className="px-4 py-3">{log.action_display}</td><td className="px-4 py-3">{log.summary}</td><td className="px-4 py-3"><div className="space-y-1">{Object.entries(log.changes).map(([field, change]) => <p key={field}><span className="font-medium">{field}</span>: {formatValue(change.before)} → {formatValue(change.after)}</p>)}</div></td></tr>)}</tbody></table>{logs.length === 0 && <p className="px-4 py-10 text-center text-slate-500">Chưa có nhật ký phù hợp.</p>}</div>}
        </main>
    </div>
}

export default AuditLogsPage
