import { apiClient } from './client'

export interface AdminOrder {
    id: number
    customer_name: string
    customer_phone: string
    shipping_address: string
    status: string
    payment_method: string
    total_amount: string
    created_at: string
}

export const getOrders = async (): Promise<AdminOrder[]> => {
    const response = await apiClient.get('/orders/admin-orders/')
    return response.data.results ?? response.data
}

export const updateOrderStatus = async (
    orderId: number,
    status: string,
) => {
    const response = await apiClient.patch(
        `/orders/admin-orders/${orderId}/`,
        { status },
    )

    return response.data
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
    created_at: string
}

export const getOrder = async (
    orderId: number,
): Promise<AdminOrder> => {
    const response = await apiClient.get(
        `/orders/admin-orders/${orderId}/`,
    )

    return response.data
}