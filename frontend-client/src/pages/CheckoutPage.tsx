import axios from 'axios'
import {Link} from 'react-router-dom'
import {type SubmitEvent, useState} from 'react'
import {useCartStore} from '../store/cartStore'
import {createOrder} from '../api/orders'
import {useToastStore} from '../store/toastStore'

const phonePattern = /^[0-9+()\-\s]{7,20}$/

function getApiError(error: unknown) {
    if (!axios.isAxiosError(error)) return 'Không thể kết nối máy chủ. Vui lòng thử lại.'
    if (!error.response) return 'Lỗi mạng: không thể kết nối máy chủ.'
    if (error.response.status === 400) {
        const data = error.response.data as Record<string, unknown>
        return Object.entries(data).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(', ') : String(value)}`).join(' ')
    }
    if (error.response.status === 409) return 'Sản phẩm vừa được người khác đặt hết. Vui lòng cập nhật giỏ hàng.'
    return 'Đặt hàng thất bại. Vui lòng thử lại sau.'
}

function CheckoutPage() {
    const items = useCartStore((state) => state.items)
    const discountCode = useCartStore((state) => state.discountCode)
    const clearCart = useCartStore((state) => state.clearCart)
    const showToast = useToastStore((state) => state.show)
    const [submitted, setSubmitted] = useState(false)
    const [orderId, setOrderId] = useState<number | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank_transfer'>('cod')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [discountAmount, setDiscountAmount] = useState(0)
    const total = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0)

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const name = String(formData.get('name') ?? '').trim()
        const phone = String(formData.get('phone') ?? '').trim()
        const address = String(formData.get('address') ?? '').trim()
        if (!name || !phone || !address) {
            setErrorMessage('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ.')
            return
        }
        if (!phonePattern.test(phone)) {
            setErrorMessage('Số điện thoại không hợp lệ. Chỉ dùng 7-20 ký tự số, khoảng trắng hoặc +()- .')
            return
        }
        setIsSubmitting(true)
        setErrorMessage('')
        try {
            const order = await createOrder({
                customer_name: name,
                customer_phone: phone,
                shipping_address: address,
                payment_method: paymentMethod,
                items: items.map((item) => ({product_id: item.product.id, quantity: item.quantity})),
                discount_code: String(formData.get('discount_code') || '').trim(),
            })
            clearCart()
            setDiscountAmount(Number(order.discount_amount ?? 0))
            setOrderId(order.id)
            setSubmitted(true)
            showToast('Đặt hàng thành công.', 'success')
        } catch (error) {
            const message = getApiError(error)
            setErrorMessage(message)
            showToast(message, 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (submitted) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-2xl font-bold text-emerald-600">Đặt hàng thành công!</h1><p className="mt-3 text-slate-600">Mã đơn hàng: <strong>#{orderId}</strong></p><p className="mt-2 text-slate-600">{paymentMethod === 'bank_transfer' ? 'Vui lòng chuyển khoản theo hướng dẫn nhân viên gửi cho bạn.' : 'Nhân viên sẽ liên hệ để xác nhận đơn hàng.'}</p>{discountAmount > 0 && <p className="mt-2 text-emerald-600">Đã giảm {discountAmount.toLocaleString('vi-VN')}₫</p>}<Link to={`/track-order?order_id=${orderId}`} className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-3 text-white">Tra cứu đơn hàng</Link></div>
    if (items.length === 0) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><p>Giỏ hàng đang trống.</p><Link to="/" className="text-emerald-600 hover:underline">Quay lại mua hàng</Link></div>

    return <div className="mx-auto max-w-3xl px-4 py-8"><h1 className="mb-6 text-3xl font-bold text-slate-800">Thông tin giao hàng</h1>{errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{errorMessage}</p>}<form onSubmit={handleSubmit} noValidate className="space-y-4"><label className="block">Họ và tên<input required name="name" aria-required="true" placeholder="Họ và tên" className="mt-1 w-full rounded-lg border px-4 py-3" /></label><label className="block">Số điện thoại<input required name="phone" aria-required="true" type="tel" inputMode="tel" pattern="[0-9+()\\-\\s]{7,20}" placeholder="Số điện thoại" className="mt-1 w-full rounded-lg border px-4 py-3" /></label><label className="block">Địa chỉ nhận hàng<textarea required name="address" aria-required="true" placeholder="Địa chỉ nhận hàng" rows={4} className="mt-1 w-full rounded-lg border px-4 py-3" /></label><fieldset className="border-t pt-4"><legend className="text-sm text-slate-500">Phương thức thanh toán</legend><label className="mt-2 block"><input type="radio" name="payment_method" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} /> <span className="ml-2">Thanh toán khi nhận hàng (COD)</span></label><label className="mt-2 block"><input type="radio" name="payment_method" value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} /> <span className="ml-2">Chuyển khoản online</span></label>{paymentMethod === 'bank_transfer' && <p className="mt-2 rounded bg-blue-50 p-3 text-sm text-blue-700">Đơn hàng sẽ ở trạng thái chờ xác nhận. Nhân viên sẽ gửi thông tin tài khoản để hoàn tất thanh toán.</p>}</fieldset><label className="block text-sm text-slate-600">Mã giảm giá (nếu có)<input id="discount_code" name="discount_code" defaultValue={discountCode} placeholder="Nhập mã giảm giá" className="mt-1 w-full rounded-lg border px-4 py-3 uppercase" /></label><div className="flex items-center justify-between pt-4"><span className="text-lg font-bold">Tổng: {total.toLocaleString('vi-VN')}₫</span><button type="submit" disabled={isSubmitting} className="rounded-lg bg-emerald-600 px-6 py-3 text-white disabled:bg-slate-300">{isSubmitting ? 'Đang đặt hàng...' : 'Đặt hàng'}</button></div></form></div>
}

export default CheckoutPage
