import {useCallback, useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {getAdminBrands, getAdminCategories, saveAdminBrand, saveAdminCategory, type AdminBrand, type AdminCategory} from '../api/products'

function CatalogPage() {
    const [tab, setTab] = useState<'categories' | 'brands'>('categories')
    const [categories, setCategories] = useState<AdminCategory[]>([])
    const [brands, setBrands] = useState<AdminBrand[]>([])
    const [editingId, setEditingId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [active, setActive] = useState(true)
    const [logo, setLogo] = useState<File | null>(null)
    const [fileInputKey, setFileInputKey] = useState(0)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [categoryData, brandData] = await Promise.all([getAdminCategories(), getAdminBrands()])
            setCategories(categoryData)
            setBrands(brandData)
        } catch {
            setError('Không thể tải dữ liệu danh mục và thương hiệu.')
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => { void load() }, [load])
    const reset = () => {setEditingId(null); setName(''); setDescription(''); setActive(true); setLogo(null); setFileInputKey((key) => key + 1)}
    const editCategory = (item: AdminCategory) => {setTab('categories'); setEditingId(item.id); setName(item.name); setDescription(item.description ?? ''); setActive(item.is_active !== false)}
    const editBrand = (item: AdminBrand) => {setTab('brands'); setEditingId(item.id); setName(item.name); setActive(item.is_active !== false)}
    const submit = async (event: FormEvent) => {
        event.preventDefault()
        const trimmedName = name.trim()
        if (!trimmedName) {
            setError('Vui lòng nhập tên.')
            return
        }
        setError('')
        setSaving(true)
        try {
            if (tab === 'categories') {
                await saveAdminCategory(editingId, {name: trimmedName, description: description.trim(), is_active: active})
            } else {
                await saveAdminBrand(editingId, {name: trimmedName, is_active: active, logo})
            }
            reset()
            await load()
        } catch {
            setError('Không thể lưu thay đổi. Hãy kiểm tra dữ liệu.')
        } finally {
            setSaving(false)
        }
    }
    const toggleVisibility = async (item: AdminCategory | AdminBrand) => {
        setError('')
        try {
            if (tab === 'categories') {
                const category = item as AdminCategory
                await saveAdminCategory(category.id, {
                    name: category.name,
                    description: category.description ?? '',
                    is_active: category.is_active === false,
                })
            } else {
                await saveAdminBrand(item.id, {
                    name: item.name,
                    is_active: item.is_active === false,
                })
            }
            await load()
        } catch {
            setError('Không thể cập nhật trạng thái.')
        }
    }
    return <div className="min-h-screen bg-slate-100"><header className="bg-emerald-600 px-6 py-4 text-white"><h1 className="text-xl font-bold">Danh mục & thương hiệu</h1></header><main className="mx-auto max-w-6xl px-6 py-8"><div className="mb-6 flex justify-between"><h2 className="text-3xl font-bold text-slate-800">Quản lý danh mục và thương hiệu</h2><Link to="/products" className="text-blue-600">← Sản phẩm</Link></div>{error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
        <div className="mb-5 flex gap-2"><button onClick={() => {setTab('categories'); reset()}} className={`rounded-lg px-4 py-2 ${tab === 'categories' ? 'bg-emerald-600 text-white' : 'bg-white'}`}>Danh mục</button><button onClick={() => {setTab('brands'); reset()}} className={`rounded-lg px-4 py-2 ${tab === 'brands' ? 'bg-emerald-600 text-white' : 'bg-white'}`}>Thương hiệu</button></div>
        <section className="mb-6 rounded-xl bg-white p-5 shadow"><h3 className="mb-4 text-xl font-semibold">{editingId ? 'Chỉnh sửa' : 'Thêm'} {tab === 'categories' ? 'danh mục' : 'thương hiệu'}</h3><form onSubmit={submit} className="grid gap-3 md:grid-cols-4"><input required value={name} onChange={e => setName(e.target.value)} placeholder={tab === 'categories' ? 'Tên danh mục' : 'Tên thương hiệu'} className="rounded-lg border px-3 py-2" />{tab === 'categories' ? <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả" className="rounded-lg border px-3 py-2" /> : <div className="flex min-w-0 items-center gap-3"><label htmlFor="brand-logo" className="shrink-0 cursor-pointer rounded-lg border bg-slate-50 px-3 py-2 hover:bg-slate-100">Chọn logo</label><input key={fileInputKey} id="brand-logo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setLogo(e.target.files?.[0] ?? null)} className="sr-only" /><span className="min-w-0 truncate text-sm text-slate-500">{logo?.name ?? 'Chưa chọn logo'}</span></div>}<label className="flex items-center gap-2 px-2"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Hiển thị</label><div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>{editingId && <button type="button" onClick={reset} className="rounded-lg border px-4 py-2">Hủy</button>}</div></form></section>
        {loading ? <p className="text-slate-500">Đang tải dữ liệu...</p> : <section className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left"><thead className="bg-slate-100"><tr><th className="px-4 py-3">Tên</th>{tab === 'categories' && <th className="px-4 py-3">Số sản phẩm</th>}{tab === 'brands' && <th className="px-4 py-3">Logo</th>}<th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thao tác</th></tr></thead><tbody>{tab === 'categories' ? categories.map((item) => <tr className="border-t" key={item.id}><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{item.product_count ?? 0}</td><td className="px-4 py-3">{item.is_active !== false ? <span className="text-emerald-600">Đang hiển thị</span> : <span className="text-slate-400">Đang ẩn</span>}</td><td className="flex gap-3 px-4 py-3"><button onClick={() => editCategory(item)} className="text-blue-600">Sửa</button><button onClick={() => toggleVisibility(item)} className="text-red-600">{item.is_active === false ? 'Hiện' : 'Ẩn'}</button></td></tr>) : brands.map((item) => <tr className="border-t" key={item.id}><td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3">{item.logo ? <img src={item.logo} alt={item.name} className="h-10 w-10 rounded object-contain" /> : '—'}</td><td className="px-4 py-3">{item.is_active !== false ? <span className="text-emerald-600">Đang hiển thị</span> : <span className="text-slate-400">Đang ẩn</span>}</td><td className="flex gap-3 px-4 py-3"><button onClick={() => editBrand(item)} className="text-blue-600">Sửa</button><button onClick={() => toggleVisibility(item)} className="text-red-600">{item.is_active === false ? 'Hiện' : 'Ẩn'}</button></td></tr>)}</tbody></table></section>}
    </main></div>
}
export default CatalogPage
