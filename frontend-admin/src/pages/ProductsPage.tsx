import {useEffect, useState, type SubmitEvent} from 'react'
import {Link} from 'react-router-dom'
import {useToastStore} from '../store/toastStore'
import {
    type AdminBrand,
    type AdminCategory,
    type AdminProduct,
    getBrands,
    getCategories,
    getProducts,
    downloadProductTemplate,
    exportProducts,
    importProducts,
    type ProductImportResult,
    updateProductStatus,
} from '../api/products'

const PAGE_SIZE = 10
const LOW_STOCK_THRESHOLD = 5

function ProductsPage() {
    const {show: showToast} = useToastStore()
    const [products, setProducts] = useState<AdminProduct[]>([])
    const [categories, setCategories] = useState<AdminCategory[]>([])
    const [brands, setBrands] = useState<AdminBrand[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [page, setPage] = useState(1)
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [categorySlug, setCategorySlug] = useState('')
    const [brandSlug, setBrandSlug] = useState('')
    const [activeFilter, setActiveFilter] = useState('')
    const [ordering, setOrdering] = useState('-created_at')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importFileKey, setImportFileKey] = useState(0)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState<ProductImportResult | null>(null)

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

    useEffect(() => {
        Promise.all([getCategories(), getBrands()])
            .then(([categoryData, brandData]) => {
                setCategories(categoryData)
                setBrands(brandData)
            })
            .catch(() => setError('Không thể tải danh mục hoặc thương hiệu.'))
    }, [])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError('')

        getProducts({
            search: search || undefined,
            'category__slug': categorySlug || undefined,
            'brand__slug': brandSlug || undefined,
            is_active: activeFilter || undefined,
            ordering,
            page,
            page_size: PAGE_SIZE,
        })
            .then((data) => {
                if (cancelled) return
                setProducts(data.results)
                setTotalCount(data.count)
            })
            .catch((requestError) => {
                if (cancelled) return
                if (requestError.response?.status === 401) {
                    setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
                } else if (requestError.response?.status === 403) {
                    setError('Tài khoản không có quyền quản lý sản phẩm.')
                } else {
                    setError('Không thể tải danh sách sản phẩm.')
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [activeFilter, brandSlug, categorySlug, ordering, page, search])

    const handleSearch = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        setPage(1)
        setSearch(searchInput.trim())
    }

    const resetFilters = () => {
        setSearchInput('')
        setSearch('')
        setCategorySlug('')
        setBrandSlug('')
        setActiveFilter('')
        setOrdering('-created_at')
        setPage(1)
    }

    const handleToggleActive = async (product: AdminProduct) => {
        try {
            await updateProductStatus(product.id, !product.is_active)
            setProducts((currentProducts) =>
                currentProducts.map((item) =>
                    item.id === product.id
                        ? {...item, is_active: !product.is_active}
                        : item,
                ),
            )
        } catch {
            showToast('Không thể cập nhật trạng thái sản phẩm.', 'error')
        }

    }

    const handleImport = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!importFile) return
        setImporting(true)
        setImportResult(null)
        setError('')
        try {
            setImportResult(await importProducts(importFile))
            setImportFile(null)
            setImportFileKey((key) => key + 1)
            setPage(1)
            setSearch('')
        } catch {
            setError('Không thể nhập file. Hãy kiểm tra định dạng và dữ liệu.')
        } finally {
            setImporting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="bg-emerald-600 px-6 py-4 text-white">
                <h1 className="text-xl font-bold">Quản lý sản phẩm</h1>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-8">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-3xl font-bold text-slate-800">
                        Danh sách sản phẩm
                    </h2>
                    <div className="flex gap-3">
                        <Link to="/inventory" className="rounded-lg border border-emerald-600 px-5 py-3 text-emerald-700 hover:bg-emerald-50">Tồn kho</Link>
                        <Link to="/catalog" className="rounded-lg border border-emerald-600 px-5 py-3 text-emerald-700 hover:bg-emerald-50">Danh mục</Link>
                        <Link to="/products/new" className="rounded-lg bg-emerald-600 px-5 py-3 text-white hover:bg-emerald-700">+ Thêm sản phẩm</Link>
                    </div>

                </div>
                <section className="mb-6 rounded-xl bg-white p-4 shadow">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="font-semibold text-slate-800">Import / Export sản phẩm</h3>
                                <p className="mt-1 text-sm text-slate-500">Hỗ trợ CSV hoặc XLSX. Dùng tên hoặc ID danh mục/thương hiệu.</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={downloadProductTemplate} className="rounded-lg border px-3 py-2 text-sm">Tải file mẫu</button>
                                <button type="button" onClick={() => exportProducts().catch(() => setError('Không thể xuất danh sách sản phẩm.'))} className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">Xuất sản phẩm CSV</button>
                            </div>
                        </div>
                    <form onSubmit={handleImport} className="mt-4 flex flex-wrap items-center gap-3">
                        <label htmlFor="product-import-file" className="cursor-pointer rounded-lg border bg-slate-50 px-3 py-2 text-sm hover:bg-slate-100">Chọn file</label>
                        <input key={importFileKey} id="product-import-file" type="file" accept=".csv,.xlsx" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} className="sr-only" />
                        <span className="max-w-xs truncate text-sm text-slate-500">{importFile?.name ?? 'Chưa chọn file'}</span>
                            <button type="submit" disabled={!importFile || importing} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">{importing ? 'Đang nhập...' : 'Nhập sản phẩm'}</button>
                    </form>
                    {importResult && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><p className="font-medium text-emerald-700">Thành công: {importResult.success_count} dòng · Lỗi: {importResult.error_count} dòng</p>{importResult.errors.length > 0 && <div className="mt-2 max-h-40 overflow-y-auto text-red-700">{importResult.errors.map((item) => <p key={item.line}>Dòng {item.line}: {Object.entries(item.errors).map(([field, messages]) => `${field}: ${messages.join(', ')}`).join('; ')}</p>)}</div>}</div>}
                </section>

                {error && (
                    <p className="mb-6 rounded-lg bg-red-100 px-4 py-3 text-red-700">
                        {error}
                    </p>
                )}

                <section className="mb-6 rounded-xl bg-white p-4 shadow">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                        <input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Tìm theo tên, mô tả, thương hiệu..."
                            className="min-w-64 flex-1 rounded-lg border px-4 py-2"
                        />
                        <select
                            value={categorySlug}
                            onChange={(event) => {
                                setCategorySlug(event.target.value)
                                setPage(1)
                            }}
                            className="rounded-lg border px-3 py-2"
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.slug}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={brandSlug}
                            onChange={(event) => {
                                setBrandSlug(event.target.value)
                                setPage(1)
                            }}
                            className="rounded-lg border px-3 py-2"
                        >
                            <option value="">Tất cả thương hiệu</option>
                            {brands.map((brand) => (
                                <option key={brand.id} value={brand.slug}>
                                    {brand.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={activeFilter}
                            onChange={(event) => {
                                setActiveFilter(event.target.value)
                                setPage(1)
                            }}
                            className="rounded-lg border px-3 py-2"
                        >
                            <option value="">Mọi trạng thái</option>
                            <option value="true">Đang bán</option>
                            <option value="false">Đã ẩn</option>
                        </select>
                        <select
                            value={ordering}
                            onChange={(event) => {
                                setOrdering(event.target.value)
                                setPage(1)
                            }}
                            className="rounded-lg border px-3 py-2"
                        >
                            <option value="-created_at">Mới nhất</option>
                            <option value="name">Tên A–Z</option>
                            <option value="price">Giá tăng dần</option>
                            <option value="-price">Giá giảm dần</option>
                            <option value="stock_quantity">Tồn kho thấp nhất</option>
                        </select>
                        <button
                            type="submit"
                            className="rounded-lg bg-slate-800 px-5 py-2 text-white hover:bg-slate-700"
                        >
                            Tìm kiếm
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="rounded-lg border px-5 py-2 text-slate-700 hover:bg-slate-50"
                        >
                            Xóa lọc
                        </button>
                    </form>
                </section>

                {loading ? (
                    <p className="text-slate-500">Đang tải sản phẩm...</p>
                ) : (
                    <>
                        <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
                            <span>{totalCount} sản phẩm</span>
                            <span>Trang {page}/{totalPages}</span>
                        </div>

                        <div className="overflow-x-auto rounded-xl bg-white shadow">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Tên sản phẩm</th>
                                    <th className="px-4 py-3">Danh mục</th>
                                    <th className="px-4 py-3">Thương hiệu</th>
                                    <th className="px-4 py-3">Giá</th>
                                    <th className="px-4 py-3">Tồn kho</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3">Thao tác</th>
                                    <th className="px-4 py-3">Cập nhật</th>
                                </tr>
                                </thead>
                                <tbody>
                                {products.map((product) => {
                                    const isOutOfStock = product.stock_quantity === 0
                                    const isLowStock =
                                        product.stock_quantity > 0 &&
                                        product.stock_quantity <= LOW_STOCK_THRESHOLD

                                    return (
                                        <tr key={product.id} className="border-t hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium">{product.name}</td>
                                            <td className="px-4 py-3">{product.category.name}</td>
                                            <td className="px-4 py-3">{product.brand?.name ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                {Number(product.price).toLocaleString('vi-VN')}₫
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={
                                                    isOutOfStock
                                                        ? 'font-semibold text-red-600'
                                                        : isLowStock
                                                            ? 'font-semibold text-orange-600'
                                                            : ''
                                                }>
                                                    {product.stock_quantity}
                                                </span>
                                                {isOutOfStock && (
                                                    <span className="ml-2 text-xs text-red-600">Hết hàng</span>
                                                )}
                                                {isLowStock && (
                                                    <span className="ml-2 text-xs text-orange-600">Sắp hết</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={product.is_active ? 'text-emerald-600' : 'text-slate-400'}>
                                                    {product.is_active ? 'Đang bán' : 'Đã ẩn'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleActive(product)}
                                                    className="text-sm text-blue-600 hover:underline"
                                                >
                                                    {product.is_active ? 'Ẩn' : 'Hiện'}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    to={`/products/${product.id}/edit`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    Sửa
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                                </tbody>
                            </table>
                            {products.length === 0 && (
                                <p className="px-4 py-10 text-center text-slate-500">
                                    Không tìm thấy sản phẩm phù hợp.
                                </p>
                            )}
                        </div>

                        <div className="mt-5 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                disabled={page === 1}
                                onClick={() => setPage((current) => current - 1)}
                                className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                ← Trước
                            </button>
                            <span className="text-sm text-slate-600">{page} / {totalPages}</span>
                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage((current) => current + 1)}
                                className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Sau →
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

export default ProductsPage
