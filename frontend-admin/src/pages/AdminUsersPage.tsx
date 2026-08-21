import {useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {createAdminUser, getAdminUsers, setAdminUserActive, updateAdminUser, type AdminUser, type AdminUserPayload, type StaffRole} from '../api/adminUsers'

const roles: Array<{value: StaffRole; label: string; description: string}> = [
    {value: 'owner', label: 'Chủ shop', description: 'Toàn quyền quản trị'},
    {value: 'product_manager', label: 'Quản lý sản phẩm', description: 'Sản phẩm, catalog, tồn kho, import/export'},
    {value: 'order_manager', label: 'Xử lý đơn', description: 'Đơn hàng, khách hàng, khuyến mãi'},
]

function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [role, setRole] = useState<StaffRole>('product_manager')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const load = () => {
        setLoading(true)
        getAdminUsers().then(setUsers).catch(() => setError('Không thể tải danh sách tài khoản.')).finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const reset = () => {
        setEditingId(null); setUsername(''); setEmail(''); setFirstName(''); setLastName('')
        setRole('product_manager'); setPassword('')
    }

    const edit = (user: AdminUser) => {
        setEditingId(user.id); setUsername(user.username); setEmail(user.email)
        setFirstName(user.first_name); setLastName(user.last_name); setRole(user.role); setPassword('')
    }

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError('')
        const payload: AdminUserPayload = {username: username.trim(), email: email.trim(), first_name: firstName.trim(), last_name: lastName.trim(), role}
        if (!editingId) {
            if (password.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự.'); return }
            payload.password = password
        }
        setSaving(true)
        try {
            if (editingId) await updateAdminUser(editingId, payload)
            else await createAdminUser(payload)
            reset(); load()
        } catch {
            setError('Không thể lưu tài khoản. Hãy kiểm tra dữ liệu.')
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (user: AdminUser) => {
        try {
            const updated = await setAdminUserActive(user.id, !user.is_active)
            setUsers((current) => current.map((item) => item.id === updated.id ? updated : item))
        } catch {
            setError('Không thể thay đổi trạng thái tài khoản.')
        }
    }

    return <div className="min-h-screen bg-slate-100">
        <header className="bg-emerald-600 px-6 py-4 text-white"><h1 className="text-xl font-bold">Quản lý người dùng admin</h1></header>
        <main className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-3xl font-bold text-slate-800">Tài khoản nhân viên</h2><Link to="/dashboard" className="text-blue-600">← Dashboard</Link></div>
            {error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
            <section className="mb-6 rounded-xl bg-white p-5 shadow"><h3 className="mb-4 text-xl font-semibold">{editingId ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản nhân viên'}</h3><form onSubmit={submit} className="grid gap-3 md:grid-cols-3"><input required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Tên đăng nhập" disabled={Boolean(editingId)} className="rounded-lg border px-3 py-2 disabled:bg-slate-100" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="rounded-lg border px-3 py-2" /><input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Tên" className="rounded-lg border px-3 py-2" /><input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Họ" className="rounded-lg border px-3 py-2" /><select value={role} onChange={(event) => setRole(event.target.value as StaffRole)} className="rounded-lg border px-3 py-2">{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{!editingId && <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mật khẩu (tối thiểu 8 ký tự)" className="rounded-lg border px-3 py-2" />}<div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu tài khoản'}</button>{editingId && <button type="button" onClick={reset} className="rounded-lg border px-4 py-2">Hủy</button>}</div></form></section>
            {loading ? <p className="text-slate-500">Đang tải tài khoản...</p> : <section className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="px-4 py-3">Tài khoản</th><th className="px-4 py-3">Vai trò</th><th className="px-4 py-3">Quyền</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody>{users.map((user) => { const roleInfo = roles.find((item) => item.value === user.role); return <tr key={user.id} className="border-t"><td className="px-4 py-3"><p className="font-medium">{user.username}</p><p className="text-sm text-slate-500">{user.email || '—'}</p></td><td className="px-4 py-3">{user.role_display}</td><td className="px-4 py-3 text-sm text-slate-500">{roleInfo?.description}</td><td className="px-4 py-3">{user.is_active ? <span className="text-emerald-600">Đang hoạt động</span> : <span className="text-red-600">Đã khóa</span>}</td><td className="flex gap-3 px-4 py-3"><button onClick={() => edit(user)} className="text-blue-600">Sửa</button><button onClick={() => toggleActive(user)} className="text-red-600">{user.is_active ? 'Khóa' : 'Mở khóa'}</button></td></tr> })}</tbody></table></section>}
        </main>
    </div>
}

export default AdminUsersPage
