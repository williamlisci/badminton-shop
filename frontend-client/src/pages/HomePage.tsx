import {useQuery} from '@tanstack/react-query'
import {useEffect, useState, type FormEvent} from 'react'
import {Link} from 'react-router-dom'
import {useLocation} from 'react-router-dom'
import {getBrands, getCategories, getProducts, type ProductQuery} from '../api/products'
import type {ProductListItem} from '../types/product'

function getDiscountPercent(product: ProductListItem) {
    const originalPrice = Number(product.compare_at_price)
    const currentPrice = Number(product.price)
    if (!product.compare_at_price || originalPrice <= currentPrice) return 0
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
}

function HomePage() {
    const location = useLocation()
    const promotionsOnly = location.pathname === '/promotions'
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [category, setCategory] = useState('')
    const [brand, setBrand] = useState('')
    const [ordering, setOrdering] = useState('')
    const [minPrice, setMinPrice] = useState(0)
    const priceLimit = 20000000
    const [maxPrice, setMaxPrice] = useState(priceLimit)
    const [appliedMinPrice, setAppliedMinPrice] = useState(0)
    const [appliedMaxPrice, setAppliedMaxPrice] = useState(priceLimit)
    const [page, setPage] = useState(1)
    const backendOrdering = ordering === 'popular' || ordering === 'rating' ? '-created_at' : ordering
    const filters: ProductQuery = {
        search: search || undefined,
        category: category || undefined,
        brand: brand || undefined,
        ordering: backendOrdering || undefined,
        'price__gte': appliedMinPrice > 0 ? appliedMinPrice : undefined,
        'price__lte': appliedMaxPrice,
        promotion: promotionsOnly || undefined,
        page_size: 12,
    }
    const categoriesQuery = useQuery({queryKey: ['categories'], queryFn: getCategories})
    const brandsQuery = useQuery({queryKey: ['brands'], queryFn: getBrands})
    const productsQuery = useQuery({
        queryKey: ['products', filters, page],
        queryFn: () => getProducts({...filters, page}),
    })
    const products = productsQuery.data?.results ?? []
    const totalCount = productsQuery.data?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / (filters.page_size ?? 12)))

    useEffect(() => {
        setPage(1)
    }, [search, category, brand, ordering, appliedMinPrice, appliedMaxPrice, promotionsOnly])

    const submitSearch = (event: FormEvent) => {
        event.preventDefault()
        setSearch(searchInput.trim())
        setAppliedMinPrice(minPrice)
        setAppliedMaxPrice(maxPrice)
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <h1 className="mb-6 text-3xl font-bold text-slate-800">{promotionsOnly ? 'Sản phẩm khuyến mãi' : 'Sản phẩm cầu lông'}</h1>
            {productsQuery.isLoading && <div className="py-20 text-center text-slate-500">Đang tải sản phẩm...</div>}
            {productsQuery.isError && <div className="py-20 text-center text-red-500">Có lỗi khi tải sản phẩm. Kiểm tra Django server đã chạy chưa.</div>}
            {!productsQuery.isLoading && !productsQuery.isError && <div id="products" className="grid gap-8 lg:grid-cols-4">
                <aside className="h-fit rounded-xl bg-slate-50 p-5 lg:col-span-1">
                    <h2 className="mb-4 text-lg font-semibold text-slate-800">Tìm kiếm và lọc</h2>
                    <form onSubmit={submitSearch} className="space-y-4">
                        <label className="block text-sm font-medium text-slate-700">Tên sản phẩm<input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm kiếm sản phẩm..." className="mt-1 w-full rounded-lg border bg-white px-4 py-2" /></label>
                        <label className="block text-sm font-medium text-slate-700">Danh mục<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option value="">Tất cả danh mục</option>{categoriesQuery.data?.map((item: {slug: string; name: string}) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
                        <label className="block text-sm font-medium text-slate-700">Thương hiệu<select value={brand} onChange={(event) => setBrand(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"><option value="">Tất cả thương hiệu</option>{brandsQuery.data?.map((item: {slug: string; name: string}) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
                        <fieldset className="border-t border-slate-200 pt-4">
                            <legend className="text-sm font-semibold text-slate-800">Lọc theo giá</legend>
                            <div className="mt-3 flex items-center gap-2">
                                <input aria-label="Giá thấp nhất" type="number" min="0" max={maxPrice} step="10000" value={minPrice} onChange={(event) => setMinPrice(Math.min(Math.max(Number(event.target.value) || 0, 0), maxPrice))} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" />
                                <span className="text-slate-400">-</span>
                                <input aria-label="Giá cao nhất" type="number" min={minPrice} max={priceLimit} step="10000" value={maxPrice} onChange={(event) => setMaxPrice(Math.max(Math.min(Number(event.target.value) || 0, priceLimit), minPrice))} className="w-full rounded-lg border bg-white px-3 py-2 text-sm" />
                            </div>
                            <div className="relative mt-5 h-5">
                                <div className="absolute top-2 h-1 w-full rounded-full bg-slate-200" />
                                <div className="absolute top-2 h-1 rounded-full bg-emerald-500" style={{left: `${(minPrice / priceLimit) * 100}%`, right: `${100 - (maxPrice / priceLimit) * 100}%`}} />
                                <label className="sr-only" htmlFor="min-price">Giá thấp nhất</label>
                                <input id="min-price" type="range" min="0" max={priceLimit} step="10000" value={minPrice} onChange={(event) => setMinPrice(Math.min(Number(event.target.value), maxPrice))} className="dual-range absolute inset-0 z-20 w-full" />
                                <label className="sr-only" htmlFor="max-price">Giá cao nhất</label>
                                <input id="max-price" type="range" min="0" max={priceLimit} step="10000" value={maxPrice} onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice))} className="dual-range pointer-events-none absolute inset-0 z-10 w-full" />
                            </div>
                            <p className="mt-2 text-center text-xs text-slate-500">Khoảng giá: {minPrice.toLocaleString('vi-VN')}₫ - {maxPrice.toLocaleString('vi-VN')}₫</p>
                        </fieldset>
                        <button className="w-full rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700">Tìm kiếm</button>
                    </form>
                </aside>
                <section className="lg:col-span-3">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">Hiển thị {products.length} sản phẩm{totalCount > products.length ? ` trong ${totalCount} kết quả` : ''}</p>
                        <label className="flex items-center gap-2 text-sm text-slate-600">Sắp xếp
                            <select value={ordering} onChange={(event) => setOrdering(event.target.value)} className="rounded-lg border bg-white px-3 py-2">
                                <option value="">Mặc định</option>
                                <option value="-created_at">Sắp xếp theo mới nhất</option>
                                <option value="-price">Sắp xếp theo giá: cao đến thấp</option>
                                <option value="price">Sắp xếp theo giá: thấp đến cao</option>
                                <option value="popular">Sắp xếp theo mức độ phổ biến</option>
                                <option value="rating">Sắp xếp theo xếp hạng trung bình</option>
                            </select>
                        </label>
                    </div>
                    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">{products.map((product) => {
                        const discountPercent = getDiscountPercent(product)
                        return <Link key={product.id} to={`/products/${product.slug}`} className="block overflow-hidden rounded-lg border border-slate-200 transition-shadow hover:shadow-lg">
                            <div className="relative aspect-square bg-slate-100">
                                {product.primary_image ? <img src={product.primary_image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-400">Không có ảnh</div>}
                                {discountPercent > 0 && <span className="absolute left-2 top-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">-{discountPercent}%</span>}
                            </div>
                            <div className="p-3">
                                <p className="text-xs font-medium text-emerald-600">{product.brand?.name}</p>
                                <h3 className="mt-1 line-clamp-2 text-sm font-medium text-slate-800">{product.name}</h3>
                                <div className="mt-2 flex flex-wrap items-baseline gap-2">
                                    <p className="text-base font-bold text-red-600">{Number(product.price).toLocaleString('vi-VN')}₫</p>
                                    {discountPercent > 0 && <p className="text-sm text-red-300 line-through">{Number(product.compare_at_price).toLocaleString('vi-VN')}₫</p>}
                                </div>
                            </div>
                        </Link>
                    })}</div>
                    {products.length === 0 && <p className="py-16 text-center text-slate-500">Không tìm thấy sản phẩm phù hợp.</p>}
                    {totalPages > 1 && <nav aria-label="Phân trang sản phẩm" className="mt-8 flex flex-wrap items-center justify-center gap-2">
                        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || productsQuery.isFetching} className="rounded-full border px-3 py-2 disabled:opacity-40">‹</button>
                        {Array.from({length: totalPages}, (_, index) => index + 1).map((pageNumber) => (
                            (pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1)
                                ? <button type="button" key={pageNumber} onClick={() => setPage(pageNumber)} className={`h-10 min-w-10 rounded-full border px-3 py-2 ${pageNumber === page ? 'border-red-600 bg-red-600 text-white' : 'hover:border-red-600 hover:text-red-600'}`}>{pageNumber}</button>
                                : pageNumber === 2 || pageNumber === totalPages - 1
                                    ? <span key={pageNumber} className="px-1 text-slate-500">...</span>
                                    : null
                        ))}
                        <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages || productsQuery.isFetching} className="rounded-full border px-3 py-2 disabled:opacity-40">›</button>
                    </nav>}
                </section>
            </div>}
            <section className="mt-12 grid gap-6 md:grid-cols-2">
                <div id="new-products" className="rounded-xl border border-emerald-100 bg-emerald-50 p-6">
                    <h2 className="text-xl font-bold text-emerald-800">Sản phẩm mới</h2>
                    <p className="mt-2 text-slate-600">Khám phá các mẫu vợt, giày và phụ kiện cầu lông mới nhất tại WLSport.</p>
                </div>
                <div id="promotions" className="rounded-xl border border-orange-100 bg-orange-50 p-6">
                    <h2 className="text-xl font-bold text-orange-800">Khuyến mãi</h2>
                    <p className="mt-2 text-slate-600">Ưu đãi hấp dẫn, giá tốt và quà tặng dành cho người yêu cầu lông.</p>
                </div>
                <div id="news" className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="text-xl font-bold text-slate-800">Tin tức</h2>
                    <p className="mt-2 text-slate-600">Cập nhật xu hướng, sản phẩm và hoạt động mới từ WLSport.</p>
                </div>
                <div id="guides" className="rounded-xl border border-slate-200 bg-white p-6">
                    <h2 className="text-xl font-bold text-slate-800">Hướng dẫn</h2>
                    <p className="mt-2 text-slate-600">Tư vấn chọn vợt, giày, phụ kiện và bảo quản đồ cầu lông đúng cách.</p>
                </div>
            </section>
            <section id="contact" className="mt-8 rounded-xl bg-slate-900 p-8 text-white">
                <h2 className="text-2xl font-bold">LÝ DO NÊN LỰA CHỌN WLSport</h2>
                <div className="mt-5 grid gap-3 text-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                    <p>✓ Hàng chính hãng, giá tốt</p>
                    <p>✓ Giao hàng nhanh toàn quốc</p>
                    <p>✓ Đổi trả trong 7 ngày</p>
                    <p>✓ Thanh toán an toàn</p>
                    <p>✓ Đặt hàng và tư vấn 24/7</p>
                    <p>✓ Hỗ trợ tận tâm, chuyên nghiệp</p>
                </div>
                <div className="mt-8 border-t border-slate-700 pt-5">
                    <p className="text-sm font-semibold text-emerald-300">GỌI NGAY CHO CHÚNG TÔI! HOTLINE!</p>
                    <div className="flex flex-wrap items-center gap-4">
                        <a href="tel:0909384088" className="mt-1 inline-block text-3xl font-black text-orange-400">0909.384.088</a>
                        <a href="tel:0899303303" className="mt-1 inline-block text-3xl font-black text-orange-400">0899.303.303</a>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default HomePage
