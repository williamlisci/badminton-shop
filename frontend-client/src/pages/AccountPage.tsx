import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteAddress, getAddresses, getOrderHistory, getWishlist, login, loginWithGoogle, logout, register, saveAddress } from '../api/account'

declare global {
    interface Window {
        google?: { accounts: { id: { initialize: (options: {client_id: string; callback: (response: {credential: string}) => void}) => void; renderButton: (element: HTMLElement, options: {theme: string; size: string}) => void } } }
    }
}

function AccountPage() {
    const navigate = useNavigate()
    const [mode, setMode] = useState<'login' | 'register'>('login')
    const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('customer_access'))
    const [orders, setOrders] = useState<any[]>([]); const [addresses, setAddresses] = useState<any[]>([]); const [wishlist, setWishlist] = useState<any[]>([])
    const load = async () => { const [o, a, w] = await Promise.all([getOrderHistory(), getAddresses(), getWishlist()]); setOrders(o); setAddresses(a); setWishlist(w) }
    useEffect(() => { if (loggedIn) load() }, [loggedIn])
    useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
        const container = document.getElementById('google-signin')
        if (loggedIn || !clientId || !window.google || !container) return
        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async ({credential}) => {
                try { await loginWithGoogle(credential); setLoggedIn(true) }
                catch { alert('Không thể đăng nhập bằng Google.') }
            },
        })
        window.google.accounts.id.renderButton(container, {theme: 'outline', size: 'large'})
    }, [loggedIn, mode])
    if (!loggedIn) return <div className="mx-auto max-w-md px-4 py-12"><h1 className="text-3xl font-bold">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h1><form className="mt-6 space-y-3" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); try { if (mode === 'login') await login(String(data.get('username')), String(data.get('password'))); else await register({ username: String(data.get('username')), email: String(data.get('email')), password: String(data.get('password')), first_name: String(data.get('first_name')), phone: String(data.get('phone')), address: String(data.get('address')) }); setLoggedIn(true) } catch { alert('Thông tin tài khoản không hợp lệ hoặc đã tồn tại.') } }}><input name="username" required placeholder="Tên đăng nhập" className="w-full rounded border p-3" />{mode === 'register' && <input name="email" type="email" required placeholder="Email" className="w-full rounded border p-3" />}{mode === 'register' && <input name="first_name" required placeholder="Họ và tên" className="w-full rounded border p-3" />}{mode === 'register' && <input name="phone" required type="tel" inputMode="tel" pattern="[0-9+()\\-\\s]{7,20}" placeholder="Số điện thoại" className="w-full rounded border p-3" />}{mode === 'register' && <textarea name="address" required placeholder="Địa chỉ nhà" rows={3} className="w-full rounded border p-3" />}<input name="password" required minLength={8} type="password" placeholder="Mật khẩu (tối thiểu 8 ký tự)" className="w-full rounded border p-3" /><button className="w-full rounded bg-emerald-600 p-3 text-white">{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button></form><div className="my-4 flex items-center gap-3 text-sm text-slate-400"><span className="h-px flex-1 bg-slate-200" />hoặc<span className="h-px flex-1 bg-slate-200" /></div><div id="google-signin" className="flex justify-center" /><p className="mt-2 text-center text-xs text-slate-500">Đăng nhập Google cần cấu hình `VITE_GOOGLE_CLIENT_ID`.</p><button className="mt-4 text-emerald-600" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Tạo tài khoản mới' : 'Đã có tài khoản? Đăng nhập'}</button></div>
    return <div className="mx-auto max-w-5xl space-y-8 px-4 py-10"><div className="flex justify-between"><h1 className="text-3xl font-bold">Tài khoản của tôi</h1><button onClick={() => { logout(); setLoggedIn(false); navigate('/') }} className="text-red-600">Đăng xuất</button></div><section><h2 className="mb-3 text-xl font-bold">Đơn hàng của tôi</h2>{orders.length ? orders.map(o => <div key={o.id} className="mb-2 rounded border p-4">#{o.id} · {o.status} · {Number(o.total_amount).toLocaleString('vi-VN')}₫ · {new Date(o.created_at).toLocaleDateString('vi-VN')}</div>) : <p>Chưa có đơn hàng.</p>}</section><section><h2 className="mb-3 text-xl font-bold">Địa chỉ giao hàng</h2><form className="grid gap-2 md:grid-cols-2" onSubmit={async e => { e.preventDefault(); const d = new FormData(e.currentTarget); await saveAddress({ label: String(d.get('label')), recipient_name: String(d.get('name')), phone: String(d.get('phone')), address: String(d.get('address')), is_default: addresses.length === 0 }); e.currentTarget.reset(); load() }}><input name="label" placeholder="Nhãn (Nhà riêng)" className="rounded border p-2" /><input name="name" required placeholder="Người nhận" className="rounded border p-2" /><input name="phone" required placeholder="Số điện thoại" className="rounded border p-2" /><input name="address" required placeholder="Địa chỉ" className="rounded border p-2" /><button className="rounded bg-slate-800 p-2 text-white">Lưu địa chỉ</button></form>{addresses.map(a => <div key={a.id} className="mt-2 flex justify-between rounded border p-3">{a.label}: {a.recipient_name}, {a.phone}, {a.address}<button onClick={async () => { await deleteAddress(a.id); load() }} className="text-red-600">Xóa</button></div>)}</section><section><h2 className="mb-3 text-xl font-bold">Danh sách yêu thích</h2>{wishlist.length ? wishlist.map(w => <Link key={w.id} to={`/products/${w.product_detail.slug}`} className="mr-3 inline-block rounded border p-3">{w.product_detail.name}</Link>) : <p>Chưa có sản phẩm yêu thích.</p>}</section></div>
}
export default AccountPage
