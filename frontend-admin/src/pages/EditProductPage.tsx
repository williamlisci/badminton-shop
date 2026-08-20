import {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {
    getProduct,
    getCategories,
    getBrands,
    updateProduct,
    uploadProductImage,
    deleteProductImage,
    type AdminProduct,
    type AdminCategory,
    type AdminBrand,
} from '../api/products'

export default function EditProductPage() {
    const {id} = useParams()
    const navigate = useNavigate()

    const [product, setProduct] = useState<AdminProduct | null>(null)
    const [categories, setCategories] = useState<AdminCategory[]>([])
    const [brands, setBrands] = useState<AdminBrand[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedImage, setSelectedImage] =
        useState<File | null>(null)
    const [fileInputKey, setFileInputKey] = useState(0)

    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        if (!id) return

        Promise.all([
            getProduct(Number(id)),
            getCategories(),
            getBrands(),
        ])
            .then(([productData, categoryData, brandData]) => {
                setProduct(productData)
                setCategories(categoryData)
                setBrands(brandData)
            })
            .catch(() => {
                alert('Không thể tải dữ liệu sản phẩm.')
                navigate('/products')
            })
            .finally(() => setLoading(false))
    }, [id, navigate])

    const handleSubmit = async (
        event: SubmitEvent,
        form: HTMLFormElement,
    ) => {
        event.preventDefault()

        const formData = new FormData(form)

        try {
            await updateProduct(Number(id), {
                name: String(formData.get('name')),
                description: String(formData.get('description')),
                price: String(formData.get('price')),
                compare_at_price:
                    String(formData.get('compare_at_price') || '') || null,
                stock_quantity: Number(formData.get('stock_quantity')),
                category_id: Number(formData.get('category_id')),
                brand_id: formData.get('brand_id')
                    ? Number(formData.get('brand_id'))
                    : null,
                is_active: formData.get('is_active') === 'on',
            })

            alert('Cập nhật sản phẩm thành công.')
            navigate('/products')
        } catch {
            alert('Không thể cập nhật sản phẩm.')
        }
    }
    const getImageUrl = (image: string) => {
        if (image.startsWith('http')) {
            return image
        }

        return `http://127.0.0.1:8000${image}`
    }

    const handleUploadImage = async () => {
        if (!selectedImage || !product) return

        try {
            setUploading(true)

            await uploadProductImage(
                product.id,
                selectedImage,
                product.images.length === 0,
            )

            const updatedProduct = await getProduct(product.id)
            setProduct(updatedProduct)
            setSelectedImage(null)
            setFileInputKey((value) => value + 1)

            alert('Tải ảnh lên thành công.')
        } catch {
            alert('Không thể tải ảnh lên.')
        } finally {
            setUploading(false)
        }
    }

    const handleDeleteImage = async (imageId: number) => {
        if (!product) return

        if (!window.confirm('Bạn có chắc muốn xóa ảnh này?')) {
            return
        }

        try {
            await deleteProductImage(imageId)

            setProduct({
                ...product,
                images: product.images.filter(
                    (image) => image.id !== imageId,
                ),
            })
        } catch {
            alert('Không thể xóa ảnh.')
        }
    }
    if (loading || !product) {
        return <p className="p-8">Đang tải dữ liệu...</p>
    }

    return (
        <main className="min-h-screen bg-slate-100 p-8">
            <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow">
                <h1 className="mb-6 text-3xl font-bold text-slate-900">
                    Sửa sản phẩm
                </h1>
                <div className="mb-8 rounded-lg border p-4">
                    <h2 className="mb-4 text-xl font-semibold">
                        Hình ảnh sản phẩm
                    </h2>

                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        {product.images.map((image) => (
                            <div key={image.id} className="relative">
                                <img
                                    src={getImageUrl(image.image)}
                                    alt={product.name}
                                    className="h-32 w-full rounded-lg object-cover"
                                />

                                <button
                                    type="button"
                                    onClick={() => handleDeleteImage(image.id)}
                                    className="mt-2 w-full rounded bg-red-600 px-2 py-1 text-sm text-white"
                                >
                                    Xóa ảnh
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            key={fileInputKey}
                            id="product-image"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                                setSelectedImage(
                                    event.target.files?.[0] ?? null,
                                )
                            }
                        />

                        <label
                            htmlFor="product-image"
                            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50"
                        >
                            Chọn ảnh
                        </label>

                        <span className="max-w-xs truncate text-sm text-slate-500">
                            {selectedImage
                                ? selectedImage.name
                                : 'Chưa chọn ảnh'}
                        </span>

                        <button
                            type="button"
                            onClick={handleUploadImage}
                            disabled={!selectedImage || uploading}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                        >
                            {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
                        </button>
                    </div>
                </div>

                <form
                    onSubmit={(event) =>
                        handleSubmit(
                            event.nativeEvent as SubmitEvent,
                            event.currentTarget,
                        )
                    }
                >
                    <input
                        name="name"
                        defaultValue={product.name}
                        placeholder="Tên sản phẩm"
                        required
                        className="w-full rounded-lg border px-4 py-3"
                    />

                    <textarea
                        name="description"
                        defaultValue={product.description ?? ''}
                        placeholder="Mô tả sản phẩm"
                        rows={5}
                        className="w-full rounded-lg border px-4 py-3"
                    />

                    <input
                        name="price"
                        type="number"
                        defaultValue={product.price}
                        placeholder="Giá"
                        required
                        className="w-full rounded-lg border px-4 py-3"
                    />

                    <input
                        name="compare_at_price"
                        type="number"
                        defaultValue={product.compare_at_price ?? ''}
                        placeholder="Giá so sánh"
                        className="w-full rounded-lg border px-4 py-3"
                    />

                    <input
                        name="stock_quantity"
                        type="number"
                        defaultValue={product.stock_quantity}
                        placeholder="Tồn kho"
                        required
                        className="w-full rounded-lg border px-4 py-3"
                    />

                    <select
                        name="category_id"
                        defaultValue={product.category.id}
                        required
                        className="w-full rounded-lg border px-4 py-3"
                    >
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        name="brand_id"
                        defaultValue={product.brand?.id ?? ''}
                        className="w-full rounded-lg border px-4 py-3"
                    >
                        <option value="">Không chọn thương hiệu</option>

                        {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                                {brand.name}
                            </option>
                        ))}
                    </select>

                    <label className="flex items-center gap-2">
                        <input
                            name="is_active"
                            type="checkbox"
                            defaultChecked={product.is_active}
                        />
                        Đang bán
                    </label>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className="rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
                        >
                            Lưu thay đổi
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/products')}
                            className="rounded-lg bg-slate-200 px-6 py-3"
                        >
                            Hủy
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}
