import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProductBySlug } from '../api/products'
import { useCartStore } from '../store/cartStore'
import { addWishlist } from '../api/account'

function ProductDetailPage() {
    const { slug } = useParams<{ slug: string }>()
    const addItem = useCartStore((state) => state.addItem)
    const [selectedImageId, setSelectedImageId] = useState<number | null>(null)

    const { data: product, isLoading, isError } = useQuery({
        queryKey: ['product', slug],
        queryFn: () => getProductBySlug(slug!),
        enabled: !!slug,
    })

    if (isLoading) return <div className="text-center py-20 text-slate-500">Đang tải...</div>
    if (isError || !product) return <div className="text-center py-20 text-red-500">Không tìm thấy sản phẩm.</div>

    const primaryImage = product.images.find((img) => img.is_primary) ?? product.images[0]
    const selectedImage = product.images.find(
        (image) => image.id === selectedImageId,
    ) ?? primaryImage

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <Link to="/" className="text-sm text-emerald-600 hover:underline">← Quay lại</Link>

            <div className="grid md:grid-cols-2 gap-8 mt-4">
                <div>
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    {selectedImage ? (
                        <img src={selectedImage.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">Không có ảnh</div>
                    )}
                    </div>

                    {product.images.length > 1 && (
                        <div className="mt-3 grid grid-cols-4 gap-3">
                            {product.images.map((image) => (
                                <button
                                    key={image.id}
                                    type="button"
                                    onClick={() => setSelectedImageId(image.id)}
                                    className={`aspect-square overflow-hidden rounded-lg border-2 ${
                                        selectedImage?.id === image.id
                                            ? 'border-emerald-600'
                                            : 'border-transparent'
                                    }`}
                                >
                                    <img
                                        src={image.image}
                                        alt={`${product.name} ${image.order + 1}`}
                                        className="h-full w-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-sm text-emerald-600 font-medium">{product.brand?.name}</p>
                    <h1 className="text-2xl font-bold text-slate-800 mt-1">{product.name}</h1>
                    <p className="text-sm text-slate-500 mt-2">Danh mục: {product.category.name}</p>

                    <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-slate-900">
              {Number(product.price).toLocaleString('vi-VN')}₫
            </span>
                        {product.compare_at_price && (
                            <span className="text-base text-slate-400 line-through">
                {Number(product.compare_at_price).toLocaleString('vi-VN')}₫
              </span>
                        )}
                    </div>

                    <p className="text-sm text-slate-500 mt-2">
                        {product.stock_quantity > 0 ? `Còn ${product.stock_quantity} sản phẩm` : 'Hết hàng'}
                    </p>

                    <button
                        type="button"
                        disabled={product.stock_quantity === 0}
                        onClick={() => addItem(product)}
                        className="mt-6 w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:bg-slate-300"
                    >
                        {product.stock_quantity > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            if (!localStorage.getItem('customer_access')) {
                                window.location.href = '/account'
                                return
                            }
                            try {
                                await addWishlist(product.id)
                                window.alert('Đã thêm vào danh sách yêu thích.')
                            } catch {
                                window.alert('Sản phẩm đã có trong danh sách yêu thích.')
                            }
                        }}
                        className="mt-3 w-full rounded-lg border border-emerald-600 py-3 font-medium text-emerald-700"
                    >
                        ♡ Thêm vào yêu thích
                    </button>

                    {product.description && (
                        <div className="mt-6 border-t border-slate-200 pt-4">
                            <h2 className="font-medium text-slate-800 mb-2">Mô tả sản phẩm</h2>
                            <p className="text-sm text-slate-600 whitespace-pre-line">{product.description}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ProductDetailPage
