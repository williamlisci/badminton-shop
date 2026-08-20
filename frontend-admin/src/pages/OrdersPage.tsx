import { useEffect, useState } from 'react'
import {
    getOrders,
    updateOrderStatus,
    type AdminOrder,
} from '../api/orders'
import { Link } from 'react-router-dom'


const statuses = [
    { value: 'pending', label: 'Chờ xác nhận' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'shipping', label: 'Đang giao' },
    { value: 'completed', label: 'Hoàn tất' },
    { value: 'cancelled', label: 'Đã hủy' },
]

function OrdersPage() {
    const [orders, setOrders] = useState<AdminOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        getOrders()
            .then(setOrders)
            .catch(() => {
                setError('Không thể tải danh sách đơn hàng.')
            })
            .finally(() => setLoading(false))
    }, [])

    const handleStatusChange = async (
        orderId: number,
        status: string,
    ) => {
        try {
            const updatedOrder = await updateOrderStatus(orderId, status)

            setOrders((currentOrders) =>
                currentOrders.map((order) =>
                    order.id === orderId ? updatedOrder : order,
                ),
            )
        } catch {
            alert('Không thể cập nhật trạng thái đơn hàng.')
        }
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold">
                    Quản lý đơn hàng
                </h1>

                <nav className="flex items-center gap-6">
                    <Link
                        to="/dashboard"
                        className="hover:underline"
                    >
                        Dashboard
                    </Link>

                    <Link
                        to="/products"
                        className="hover:underline"
                    >
                        Sản phẩm
                    </Link>
                </nav>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <h2 className="text-3xl font-bold text-slate-800 mb-6">
                    Danh sách đơn hàng
                </h2>

                {error && (
                    <p className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">
                        {error}
                    </p>
                )}

                {loading ? (
                    <p className="text-slate-500">
                        Đang tải đơn hàng...
                    </p>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100">
                            <tr>
                                <th className="px-4 py-3">Mã đơn</th>
                                <th className="px-4 py-3">Khách hàng</th>
                                <th className="px-4 py-3">Điện thoại</th>
                                <th className="px-4 py-3">Tổng tiền</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3">Ngày tạo</th>
                                <th className="px-4 py-3">Chi tiết</th>
                            </tr>
                            </thead>

                            <tbody>
                            {orders.map((order) => (
                                <tr
                                    key={order.id}
                                    className="border-t hover:bg-slate-50"
                                >
                                    <td className="px-4 py-3 font-medium">
                                        #{order.id}
                                    </td>

                                    <td className="px-4 py-3">
                                        {order.customer_name}
                                    </td>

                                    <td className="px-4 py-3">
                                        {order.customer_phone}
                                    </td>

                                    <td className="px-4 py-3">
                                        {Number(order.total_amount).toLocaleString(
                                            'vi-VN',
                                        )}
                                        ₫
                                    </td>

                                    <td className="px-4 py-3">
                                        <select
                                            value={order.status}
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    order.id,
                                                    event.target.value,
                                                )
                                            }
                                            className="border rounded-lg px-3 py-2"
                                        >
                                            {statuses.map((status) => (
                                                <option
                                                    key={status.value}
                                                    value={status.value}
                                                >
                                                    {status.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        {new Date(
                                            order.created_at,
                                        ).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            to={`/orders/${order.id}`}
                                            className="text-blue-600 hover:underline"
                                        >
                                            #{order.id}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    )
}

export default OrdersPage