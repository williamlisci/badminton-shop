import {useQuery} from '@tanstack/react-query'
import {getProducts} from '../api/products'
import {Link} from 'react-router-dom'

function HomePage() {
    const {data: products, isLoading, isError} = useQuery({
        queryKey: ['products'],
        queryFn: getProducts,
    })

    if (isLoading) {
        return <div className="text-center py-20 text-slate-500">Đang tải sản phẩm...</div>
    }

    if (isError) {
        return <div className="text-center py-20 text-red-500">Có lỗi khi tải sản phẩm. Kiểm tra Django server đã chạy
            chưa.</div>
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Sản phẩm cầu lông</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {products?.map((product) => (

                    <Link
                        key={product.id}
                        to={`/products/${product.slug}`}
                        className="block border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="aspect-square bg-slate-100">
                            {product.primary_image ? (
                                <img src={product.primary_image} alt={product.name}
                                     className="w-full h-full object-cover"/>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">Không có
                                    ảnh</div>
                            )}
                        </div>
                        <div className="p-3">
                            <p className="text-xs text-emerald-600 font-medium">{product.brand?.name}</p>
                            <h3 className="text-sm font-medium text-slate-800 line-clamp-2 mt-1">{product.name}</h3>
                            <p className="text-base font-bold text-slate-900 mt-2">
                                {Number(product.price).toLocaleString('vi-VN')}₫
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default HomePage