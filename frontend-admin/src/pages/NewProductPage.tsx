import { type SubmitEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    createProduct,
    getBrands,
    getCategories,
    type AdminBrand,
    type AdminCategory,
} from '../api/products'

function NewProductPage() {
    const navigate = useNavigate()

    const [categories, setCategories] = useState<AdminCategory[]>([])
    const [brands, setBrands] = useState<AdminBrand[]>([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        Promise.all([getCategories(), getBrands()])
            .then(([categoryData, brandData]) => {
                setCategories(categoryData)
                setBrands(brandData)
            })
            .catch(() => {
                setError('Không thể tải danh mục hoặc thương hiệu.')
            })
    }, [])

    const handleSubmit = async (
        event: SubmitEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()

        const formData = new FormData(event.currentTarget)

        setLoading(true)
        setError('')

        try {
            await createProduct({
                name: String(formData.get('name')),
                description: String(formData.get('description')),
                price: String(formData.get('price')),
                compare_at_price:
                    String(formData.get('compare_at_price') || '') || null,
                stock_quantity: Number(formData.get('stock_quantity')),
                is_active: formData.get('is_active') === 'on',
                category_id: Number(formData.get('category_id')),
                brand_id: formData.get('brand_id')
                    ? Number(formData.get('brand_id'))
                    : null,
            })

            navigate('/products')
        } catch {
            setError('Không thể tạo sản phẩm. Hãy kiểm tra dữ liệu nhập.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="bg-emerald-600 text-white px-6 py-4">
                <h1 className="text-xl font-bold">
                    Thêm sản phẩm
                </h1>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-xl shadow p-6 space-y-5"
                >
                    {error && (
                        <p className="text-red-600">
                            {error}
                        </p>
                    )}

                    <input
                        required
                        name="name"
                        placeholder="Tên sản phẩm"
                        className="w-full border rounded-lg px-4 py-3"
                    />

                    <textarea
                        name="description"
                        placeholder="Mô tả sản phẩm"
                        rows={5}
                        className="w-full border rounded-lg px-4 py-3"
                    />

                    <div className="grid md:grid-cols-2 gap-4">
                        <input
                            required
                            name="price"
                            type="number"
                            min="0"
                            placeholder="Giá bán"
                            className="border rounded-lg px-4 py-3"
                        />

                        <input
                            name="compare_at_price"
                            type="number"
                            min="0"
                            placeholder="Giá gốc"
                            className="border rounded-lg px-4 py-3"
                        />
                    </div>

                    <input
                        required
                        name="stock_quantity"
                        type="number"
                        min="0"
                        placeholder="Số lượng tồn kho"
                        className="w-full border rounded-lg px-4 py-3"
                    />

                    <select
                        required
                        name="category_id"
                        className="w-full border rounded-lg px-4 py-3"
                        defaultValue=""
                    >
                        <option value="" disabled>
                            Chọn danh mục
                        </option>

                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        name="brand_id"
                        className="w-full border rounded-lg px-4 py-3"
                        defaultValue=""
                    >
                        <option value="">
                            Không chọn thương hiệu
                        </option>

                        {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                                {brand.name}
                            </option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="is_active"
                            defaultChecked
                        />
                        Đang bán
                    </label>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/products')}
                            className="px-5 py-3 rounded-lg border"
                        >
                            Hủy
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-3 rounded-lg bg-emerald-600 text-white disabled:bg-slate-300"
                        >
                            {loading ? 'Đang lưu...' : 'Lưu sản phẩm'}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    )
}

export default NewProductPage