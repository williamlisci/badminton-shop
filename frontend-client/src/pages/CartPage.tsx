import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useCartStore } from '../store/cartStore'
import { validateDiscount } from '../api/orders'
import axios from 'axios'

function CartPage() {
    const items = useCartStore((state) => state.items)
    const removeItem = useCartStore((state) => state.removeItem)
    const clearCart = useCartStore((state) => state.clearCart)
    const discountCode = useCartStore((state) => state.discountCode)
    const setDiscountCode = useCartStore((state) => state.setDiscountCode)
    const [discountAmount, setDiscountAmount] = useState(0)
    const [discountedTotal, setDiscountedTotal] = useState<number | null>(null)
    const [discountMessage, setDiscountMessage] = useState('')
    const [isValidating, setIsValidating] = useState(false)

    const total = items.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
    )
    const addItem = useCartStore((state) => state.addItem)
    const decreaseItem = useCartStore((state) => state.decreaseItem)

    const handleValidateDiscount = async () => {
        const code = discountCode.trim().toUpperCase()
        if (!code) {
            setDiscountAmount(0)
            setDiscountedTotal(null)
            setDiscountMessage('Vui lòng nhập mã giảm giá.')
            return
        }
        setIsValidating(true)
        setDiscountMessage('')
        try {
            const result = await validateDiscount(
                code,
                items.map((item) => ({product_id: item.product.id, quantity: item.quantity})),
            )
            setDiscountAmount(Number(result.discount_amount))
            setDiscountedTotal(Number(result.discounted_total))
            setDiscountMessage('Mã giảm giá hợp lệ.')
            setDiscountCode(code)
        } catch (error) {
            setDiscountAmount(0)
            setDiscountedTotal(null)
            if (axios.isAxiosError(error) && error.response?.data) {
                const data = error.response.data as Record<string, unknown>
                setDiscountMessage(Object.values(data).flat().join(' '))
            } else {
                setDiscountMessage('Không thể kiểm tra mã giảm giá. Vui lòng thử lại.')
            }
        } finally {
            setIsValidating(false)
        }
    }

    if (items.length === 0) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-slate-800">
                    Giỏ hàng đang trống
                </h1>

                <Link
                    to="/"
                    className="inline-block mt-6 bg-emerald-600 text-white px-6 py-3 rounded-lg"
                >
                    Tiếp tục mua hàng
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">
                Giỏ hàng
            </h1>

            <div className="space-y-4">
                {items.map((item) => (
                    <div
                        key={item.product.id}
                        className="flex gap-4 border-b border-slate-200 pb-4"
                    >
                        <img
                            src={item.product.images[0]?.image}
                            alt={item.product.name}
                            className="w-24 h-24 object-cover rounded-lg bg-slate-100"
                        />

                        <div className="flex-1">
                            <h2 className="font-medium text-slate-800">
                                {item.product.name}
                            </h2>

                            <div className="flex items-center gap-3 mt-2">
                                <button
                                    type="button"
                                    onClick={() => decreaseItem(item.product.id)}
                                    className="w-8 h-8 border rounded hover:bg-slate-100"
                                >
                                    −
                                </button>

                                <span className="min-w-6 text-center">{item.quantity}</span>

                                <button
                                    type="button"
                                    onClick={() => addItem(item.product)}
                                    disabled={item.quantity >= item.product.stock_quantity}
                                    className="w-8 h-8 border rounded hover:bg-slate-100 disabled:opacity-40"
                                >
                                    +
                                </button>
                            </div>

                            <p className="font-bold text-slate-900 mt-2">
                                {(Number(item.product.price) * item.quantity).toLocaleString(
                                    'vi-VN',
                                )}
                                ₫
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => removeItem(item.product.id)}
                            className="text-sm text-red-500 hover:underline"
                        >
                            Xóa
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
                <button
                    type="button"
                    onClick={clearCart}
                    className="text-sm text-red-500 hover:underline"
                >
                    Xóa toàn bộ
                </button>

                <div className="text-right">
                    <p className="text-sm text-slate-500">Tổng cộng</p>
                    <p className="text-2xl font-bold text-emerald-600">
                        {total.toLocaleString('vi-VN')}₫
                    </p>
                </div>
            </div>
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label htmlFor="cart-discount-code" className="block text-sm font-semibold text-slate-700">Mã giảm giá</label>
                <input id="cart-discount-code" value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} placeholder="Nhập mã giảm giá" className="mt-2 w-full rounded-lg border bg-white px-4 py-3 uppercase" />
                <button type="button" onClick={handleValidateDiscount} disabled={isValidating} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-50">
                    {isValidating ? 'Đang kiểm tra...' : 'Áp dụng mã'}
                </button>
                {discountMessage && <p className={`mt-2 text-sm ${discountAmount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{discountMessage}</p>}
            </div>
            {discountedTotal !== null && <div className="mt-6 text-right">
                <p className="text-sm text-slate-500">Giảm giá: {discountAmount.toLocaleString('vi-VN')}₫</p>
                <p className="text-2xl font-bold text-emerald-600">Tổng sau giảm: {discountedTotal.toLocaleString('vi-VN')}₫</p>
            </div>}
            <div className="mt-6 text-right">
                <Link
                    to="/checkout"
                    className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700"
                >
                    Tiến hành thanh toán
                </Link>
            </div>
        </div>
    )
}

export default CartPage