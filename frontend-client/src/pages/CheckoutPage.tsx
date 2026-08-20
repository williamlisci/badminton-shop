import {Link} from 'react-router-dom'
import {useCartStore} from '../store/cartStore'
import {type SubmitEvent, useState} from 'react'
import {createOrder} from '../api/orders'

function CheckoutPage() {
    const items = useCartStore((state) => state.items)
    const clearCart = useCartStore((state) => state.clearCart)

    const [submitted, setSubmitted] = useState(false)
    const [orderId, setOrderId] = useState<number | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const total = items.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
    )

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()

        const formData = new FormData(event.currentTarget)

        setIsSubmitting(true)
        setErrorMessage('')

        try {
            const order = await createOrder({
                customer_name: String(formData.get('name')),
                customer_phone: String(formData.get('phone')),
                shipping_address: String(formData.get('address')),
                items: items.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                })),
            })
            console.log('Order response:', order)
            clearCart()
            setOrderId(order.id)
            setSubmitted(true)
        } catch {
            setErrorMessage(
                'Không thể đặt hàng. Sản phẩm có thể đã hết hàng, vui lòng thử lại.',
            )
        } finally {
            setIsSubmitting(false)
        }
    }



    if (submitted) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-emerald-600">
                    Đặt hàng thành công!
                </h1>

                <p className="mt-3 text-slate-600">
                    Mã đơn hàng của bạn là: <strong>#{orderId}</strong>
                </p>

                <p className="mt-2 text-slate-600">
                    Nhân viên sẽ liên hệ để xác nhận đơn hàng.
                </p>

                <Link
                    to="/"
                    className="inline-block mt-6 bg-emerald-600 text-white px-6 py-3 rounded-lg"
                >
                    Tiếp tục mua hàng
                </Link>
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-20 text-center">
                <p>Giỏ hàng đang trống.</p>
                <Link to="/" className="text-emerald-600 hover:underline">
                    Quay lại mua hàng
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">
                Thông tin giao hàng
            </h1>
            {errorMessage && (
                <p className="mb-4 text-red-600">
                    {errorMessage}
                </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    required
                    name="name"
                    placeholder="Họ và tên"
                    className="w-full border rounded-lg px-4 py-3"
                />

                <input
                    required
                    name="phone"
                    type="tel"
                    placeholder="Số điện thoại"
                    className="w-full border rounded-lg px-4 py-3"
                />

                <textarea
                    required
                    name="address"
                    placeholder="Địa chỉ nhận hàng"
                    rows={4}
                    className="w-full border rounded-lg px-4 py-3"
                />

                <div className="border-t pt-4">
                    <p className="text-sm text-slate-500">Thanh toán</p>
                    <p className="font-medium">Thanh toán khi nhận hàng (COD)</p>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <span className="text-lg font-bold">
                        Tổng: {total.toLocaleString('vi-VN')}₫
                    </span>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 disabled:bg-slate-300"
                    >
                        {isSubmitting ? 'Đang đặt hàng...' : 'Đặt hàng'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default CheckoutPage