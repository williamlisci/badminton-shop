import {useEffect, useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {type AdminOrder, getOrder, updateOrderStatus,} from '../api/orders'

const statusLabels: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    shipping: 'Đang giao',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
}

function OrderDetailPage() {
    const {id} = useParams<{ id: string }>()

    const [order, setOrder] = useState<AdminOrder | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!id) return

        getOrder(Number(id))
            .then(setOrder)
            .catch(() => {
                setError('Không thể tải chi tiết đơn hàng.')
            })
            .finally(() => setLoading(false))
    }, [id])

    const handleStatusChange = async (status: string) => {
        if (!order) return

        try {
            const updatedOrder = await updateOrderStatus(order.id, status)
            setOrder(updatedOrder)
        } catch {
            setError('Không thể cập nhật trạng thái đơn hàng.')
        }
    }

    if (loading) {
        return (
            <div className="p-8 text-slate-500">
                Đang tải đơn hàng...
            </div>
        )
    }

    if (error || !order) {
        return (
            <div className="p-8 text-red-600">
                {error || 'Không tìm thấy đơn hàng.'}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="bg-emerald-600 text-white px-6 py-4">
                <h1 className="text-xl font-bold">
                    Chi tiết đơn hàng #{order.id}
                </h1>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                <Link
                    to="/orders"
                    className="text-emerald-600 hover:underline"
                >
                    ← Quay lại danh sách đơn hàng
                </Link>

                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <section className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            Thông tin khách hàng
                        </h2>

                        <p>
                            <strong>Họ tên:</strong> {order.customer_name}
                        </p>

                        <p className="mt-2">
                            <strong>Số điện thoại:</strong>{' '}
                            {order.customer_phone}
                        </p>

                        <p className="mt-2">
                            <strong>Địa chỉ:</strong>{' '}
                            {order.shipping_address}
                        </p>

                        <p className="mt-2">
                            <strong>Thanh toán:</strong>{' '}
                            {order.payment_method.toUpperCase()}
                        </p>

                        <div className="mt-4">
                            <label
                                htmlFor="status"
                                className="block font-medium mb-2"
                            >
                                Trạng thái
                            </label>

                            <select
                                id="status"
                                value={order.status}
                                onChange={(event) =>
                                    handleStatusChange(event.target.value)
                                }
                                className="border rounded-lg px-3 py-2"
                            >
                                {Object.entries(statusLabels).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            Sản phẩm trong đơn
                        </h2>

                        <div className="space-y-4">
                            {order.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="border-b pb-3"
                                >
                                    <p className="font-medium">
                                        {item.product_name}
                                    </p>

                                    <p className="text-sm text-slate-500">
                                        {item.quantity} ×{' '}
                                        {Number(item.price).toLocaleString('vi-VN')}₫
                                    </p>

                                    <p className="font-bold mt-1">
                                        {Number(item.subtotal).toLocaleString('vi-VN')}₫
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t mt-4 pt-4 flex justify-between">
                            <span className="font-bold">Tổng cộng</span>
                            <span className="text-xl font-bold text-emerald-600">
                {Number(order.total_amount).toLocaleString('vi-VN')}₫
              </span>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    )
}

export default OrderDetailPage