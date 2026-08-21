import { apiClient } from './client'

export interface OrderStatusHistory {
    id: number
    from_status: string
    to_status: string
    reason: string
    changed_by: string | null
    created_at: string
}

export interface OrderQuery {
    search?: string
    status?: string
    start_date?: string
    end_date?: string
}

export const getOrders = async (params: OrderQuery = {}): Promise<AdminOrder[]> => {
    const response = await apiClient.get('/orders/admin-orders/', {params})
    return response.data.results ?? response.data
}

export const updateOrderStatus = async (
    orderId: number,
    status: string,
    reason = '',
) => {
    const response = await apiClient.patch(
        `/orders/admin-orders/${orderId}/`,
        { status, reason },
    )

    return response.data
}

export const confirmOrder = async (orderId: number, reason = '') => {
    const response = await apiClient.post(`/orders/admin-orders/${orderId}/confirm/`, {reason})
    return response.data as AdminOrder
}

export const cancelOrder = async (orderId: number, reason: string) => {
    const response = await apiClient.post(`/orders/admin-orders/${orderId}/cancel/`, {reason})
    return response.data as AdminOrder
}

export const updateOrderNote = async (orderId: number, internalNote: string) => {
    const response = await apiClient.patch(`/orders/admin-orders/${orderId}/`, {internal_note: internalNote})
    return response.data as AdminOrder
}

export interface AdminOrderItem {
    id: number
    product: number
    product_name: string
    price: string
    quantity: number
    subtotal: number
}

export interface AdminOrder {
    id: number
    customer_name: string
    customer_phone: string
    shipping_address: string
    status: string
    payment_method: string
    total_amount: string
    items: AdminOrderItem[]
    internal_note: string
    cancellation_reason: string
    status_history: OrderStatusHistory[]
    created_at: string
    updated_at: string
}

export const getOrder = async (
    orderId: number,
): Promise<AdminOrder> => {
    const response = await apiClient.get(
        `/orders/admin-orders/${orderId}/`,
    )

    return response.data
}

const downloadCsv = async (url: string, filename: string, params?: Record<string, string>) => {
    const response = await apiClient.get(url, {params, responseType: 'blob'})
    const objectUrl = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    link.click()
    URL.revokeObjectURL(objectUrl)
}

export const exportOrders = () => downloadCsv('/orders/admin-orders/export/', 'orders.csv')

export const exportRevenue = (params: {start_date?: string; end_date?: string} = {}) =>
    downloadCsv('/orders/admin-orders/revenue-export/', 'revenue.csv', params)