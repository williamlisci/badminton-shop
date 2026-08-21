import {useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {getCategories, getProducts, type AdminCategory, type AdminProduct} from '../api/products'
import {deleteDiscount, getDiscounts, saveDiscount, type DiscountCode, type DiscountPayload} from '../api/discounts'

const toLocalDateTime = (value: string) => {
    const date = new Date(value)
    const offset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const toIso = (value: string) => new Date(value).toISOString()
const isActiveDiscount = (discount: DiscountCode) => discount.is_active === true
const usageLabel = (discount: DiscountCode) => {
    const usedCount = Number(discount.used_count ?? 0)
    if (discount.max_uses === null) return `${usedCount} / Không giới hạn`
    return `${usedCount} / ${Number(discount.max_uses)}`
}

function DiscountsPage() {
    const [discounts, setDiscounts] = useState<DiscountCode[]>([])
    const [categories, setCategories] = useState<AdminCategory[]>([])
    const [products, setProducts] = useState<AdminProduct[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [code, setCode] = useState('')
    const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
    const [value, setValue] = useState('')
    const [startsAt, setStartsAt] = useState('')
    const [endsAt, setEndsAt] = useState('')
    const [maxUses, setMaxUses] = useState('')
    const [minOrderAmount, setMinOrderAmount] = useState('0')
    const [active, setActive] = useState(true)
    const [categoryIds, setCategoryIds] = useState<number[]>([])
    const [productIds, setProductIds] = useState<number[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const load = async () => {
        setLoading(true)
        try {
            const [discountData, categoryData, productData] = await Promise.all([
                getDiscounts(),
                getCategories(),
                getProducts({page_size: 100}),
            ])
            setDiscounts(discountData)
            setCategories(categoryData)
            setProducts(productData.results)
        } catch {
            setError('Không thể tải dữ liệu khuyến mãi.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { void load() }, [])

    const reset = () => {
        setEditingId(null); setCode(''); setType('percentage'); setValue('')
        setStartsAt(''); setEndsAt(''); setMaxUses(''); setMinOrderAmount('0')
        setActive(true); setCategoryIds([]); setProductIds([])
    }

    const edit = (discount: DiscountCode) => {
        setEditingId(discount.id); setCode(discount.code); setType(discount.discount_type)
        setValue(discount.value); setStartsAt(toLocalDateTime(discount.starts_at))
        setEndsAt(toLocalDateTime(discount.ends_at)); setMaxUses(discount.max_uses?.toString() ?? '')
        setMinOrderAmount(discount.min_order_amount); setActive(discount.is_active)
        setCategoryIds(discount.category_ids); setProductIds(discount.product_ids)
    }

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError('')
        if (!startsAt || !endsAt) { setError('Vui lòng chọn thời gian hiệu lực.'); return }
        const payload: DiscountPayload = {
            code: code.trim().toUpperCase(), discount_type: type, value,
            starts_at: toIso(startsAt), ends_at: toIso(endsAt),
            max_uses: maxUses === '' ? null : Number(maxUses),
            min_order_amount: minOrderAmount, is_active: active,
            product_ids: productIds, category_ids: categoryIds,
        }
        setSaving(true)
        try { await saveDiscount(editingId, payload); reset(); await load() }
        catch { setError('Không thể lưu mã giảm giá. Hãy kiểm tra dữ liệu.') }
        finally { setSaving(false) }
    }

    const remove = async (id: number) => {
        if (!window.confirm('Xóa mã giảm giá này?')) return
        try { await deleteDiscount(id); await load() }
        catch { setError('Không thể xóa mã giảm giá.') }
    }

    return <div className="min-h-screen bg-slate-100">
        <header className="bg-emerald-600 px-6 py-4 text-white"><h1 className="text-xl font-bold">Khuyến mãi & mã giảm giá</h1></header>
        <main className="mx-auto max-w-7xl px-6 py-8">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-3xl font-bold text-slate-800">Quản lý mã giảm giá</h2><Link to="/dashboard" className="text-blue-600">← Dashboard</Link></div>
            {error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
            <section className="mb-6 rounded-xl bg-white p-5 shadow">
                <h3 className="mb-4 text-xl font-semibold">{editingId ? 'Chỉnh sửa' : 'Thêm'} mã giảm giá</h3>
                <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
                    <input required value={code} onChange={(event) => setCode(event.target.value)} placeholder="Mã, ví dụ: SUMMER10" className="rounded-lg border px-3 py-2 uppercase" />
                    <select value={type} onChange={(event) => setType(event.target.value as 'percentage' | 'fixed')} className="rounded-lg border px-3 py-2"><option value="percentage">Giảm theo phần trăm (%)</option><option value="fixed">Giảm số tiền (₫)</option></select>
                    <input required min="0" type="number" value={value} onChange={(event) => setValue(event.target.value)} placeholder={type === 'percentage' ? 'Phần trăm' : 'Số tiền'} className="rounded-lg border px-3 py-2" />
                    <label className="text-sm text-slate-600">Bắt đầu<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
                    <label className="text-sm text-slate-600">Kết thúc<input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
                    <input min="0" type="number" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="Giới hạn lượt dùng (trống = không giới hạn)" className="rounded-lg border px-3 py-2" />
                    <label className="text-sm text-slate-600">Giá trị đơn hàng tối thiểu (₫)<input min="0" type="number" value={minOrderAmount} onChange={(event) => setMinOrderAmount(event.target.value)} placeholder="0 = không yêu cầu tối thiểu" className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Đang hoạt động</label>
                    <div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>{editingId && <button type="button" onClick={reset} className="rounded-lg border px-4 py-2">Hủy</button>}</div>
                    <fieldset className="rounded-lg border p-3 md:col-span-3"><legend className="px-1 text-sm font-medium">Phạm vi áp dụng (bỏ trống để áp dụng toàn bộ)</legend><div className="grid gap-4 md:grid-cols-2"><label className="text-sm">Danh mục<select multiple value={categoryIds.map(String)} onChange={(event) => setCategoryIds(Array.from(event.target.selectedOptions, (option) => Number(option.value)))} className="mt-1 h-24 w-full rounded-lg border p-2">{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm">Sản phẩm<select multiple value={productIds.map(String)} onChange={(event) => setProductIds(Array.from(event.target.selectedOptions, (option) => Number(option.value)))} className="mt-1 h-24 w-full rounded-lg border p-2">{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></fieldset>
                </form>
            </section>
            {loading ? <p className="text-slate-500">Đang tải mã giảm giá...</p> : <section className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="px-4 py-3">Mã</th><th className="px-4 py-3">Mức giảm</th><th className="px-4 py-3">Hiệu lực</th><th className="px-4 py-3">Đã dùng / Giới hạn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody>{discounts.map((item) => <tr key={item.id} className="border-t"><td className="px-4 py-3 font-semibold">{item.code}</td><td className="px-4 py-3">{item.discount_type === 'percentage' ? `${item.value}%` : `${Number(item.value).toLocaleString('vi-VN')}₫`}</td><td className="px-4 py-3 text-sm">{new Date(item.starts_at).toLocaleString('vi-VN')}<br />→ {new Date(item.ends_at).toLocaleString('vi-VN')}</td><td className="px-4 py-3">{usageLabel(item)}</td><td className="px-4 py-3">{isActiveDiscount(item) ? <span className="font-medium text-emerald-600">Đang hoạt động</span> : <span className="text-slate-400">Đã tắt</span>}</td><td className="flex gap-3 px-4 py-3"><button onClick={() => edit(item)} className="text-blue-600">Sửa</button><button onClick={() => remove(item.id)} className="text-red-600">Xóa</button></td></tr>)}</tbody></table></section>}
        </main>
    </div>
}

export default DiscountsPage
