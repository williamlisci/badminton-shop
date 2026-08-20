import {useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {createStockTransaction, getProducts, getStockTransactions, type AdminProduct, type StockTransaction} from '../api/products'

function getErrorMessage(error: any) {
    const quantityError = error.response?.data?.quantity
    if (Array.isArray(quantityError)) return quantityError[0]
    if (typeof quantityError === 'string') return quantityError
    const detail = error.response?.data?.detail
    if (Array.isArray(detail)) return detail[0]
    if (typeof detail === 'string') return detail
    return 'Không thể cập nhật tồn kho.'
}

function InventoryPage() {
    const [products, setProducts] = useState<AdminProduct[]>([])
    const [transactions, setTransactions] = useState<StockTransaction[]>([])
    const [productId, setProductId] = useState('')
    const [type, setType] = useState('in')
    const [quantity, setQuantity] = useState('1')
    const [reason, setReason] = useState('')
    const [threshold, setThreshold] = useState('')
    const [error, setError] = useState('')
    const selected = products.find((product) => String(product.id) === productId)

    const load = () => {
        getProducts({page_size: 100, ordering: 'name'}).then((data) => setProducts(data.results))
        getStockTransactions().then(setTransactions).catch(() => setError('Không thể tải lịch sử tồn kho.'))
    }
    useEffect(load, [])

    const submit = async (event: FormEvent) => {
        event.preventDefault(); setError('')
        try {
            await createStockTransaction({product: Number(productId), transaction_type: type, quantity: Number(quantity), reason})
            setReason(''); setQuantity('1'); load()
        } catch (requestError: any) {
            setError(getErrorMessage(requestError))
        }
    }

    return <div className="min-h-screen bg-slate-100"><header className="bg-emerald-600 px-6 py-4 text-white"><h1 className="text-xl font-bold">Quản lý tồn kho</h1></header>
        <main className="mx-auto max-w-6xl px-6 py-8"><div className="mb-6 flex justify-between"><h2 className="text-3xl font-bold text-slate-800">Nhập / xuất kho</h2><Link to="/products" className="text-blue-600">← Sản phẩm</Link></div>
            {error && <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">{error}</p>}
            <section className="mb-8 rounded-xl bg-white p-5 shadow"><h3 className="mb-4 text-xl font-semibold">Điều chỉnh tồn kho</h3><form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
                <select required value={productId} onChange={(e) => {setProductId(e.target.value); setThreshold(String(products.find(p => String(p.id) === e.target.value)?.low_stock_threshold ?? 5))}} className="rounded-lg border px-3 py-2"><option value="">Chọn sản phẩm</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (tồn: {p.stock_quantity})</option>)}</select>
                <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border px-3 py-2"><option value="in">Nhập kho</option><option value="out">Xuất kho</option><option value="adjustment">Điều chỉnh (+/-)</option></select>
                <input required min={type === 'adjustment' ? undefined : 1} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg border px-3 py-2" placeholder="Số lượng" />
                <input required value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border px-3 py-2" placeholder="Lý do" />
                <button className="rounded-lg bg-emerald-600 px-4 py-2 text-white">Lưu thay đổi</button></form>
                {selected && <p className="mt-3 text-sm text-slate-500">Tồn hiện tại: <b>{selected.stock_quantity}</b> · Ngưỡng cảnh báo: <b>{threshold}</b> · {selected.stock_quantity <= selected.low_stock_threshold ? <span className="text-orange-600">Sắp hết hàng</span> : 'Bình thường'}</p>}
            </section>
            <section className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left"><thead className="bg-slate-100"><tr>{['Thời gian','Sản phẩm','Loại','Số lượng','Tồn trước → sau','Lý do','Người thực hiện'].map(x => <th className="px-4 py-3" key={x}>{x}</th>)}</tr></thead><tbody>{transactions.map(t => <tr className="border-t" key={t.id}><td className="px-4 py-3">{new Date(t.created_at).toLocaleString('vi-VN')}</td><td className="px-4 py-3">{t.product_name}</td><td className="px-4 py-3">{t.transaction_type_label}</td><td className="px-4 py-3">{t.quantity > 0 ? '+' : ''}{t.quantity}</td><td className="px-4 py-3">{t.stock_before} → {t.stock_after}</td><td className="px-4 py-3">{t.reason}</td><td className="px-4 py-3">{t.created_by_name ?? '—'}</td></tr>)}</tbody></table>{transactions.length === 0 && <p className="p-8 text-center text-slate-500">Chưa có lịch sử tồn kho.</p>}</section>
        </main></div>
}
export default InventoryPage
