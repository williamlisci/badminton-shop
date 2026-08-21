import { apiClient } from './client'

interface OrderItemPayload {
    product_id: number
    quantity: number
}

export interface CreateOrderPayload {
    customer_name: string
    customer_phone: string
    shipping_address: string
    payment_method: 'cod' | 'bank_transfer'
    items: OrderItemPayload[]
    discount_code?: string
}

export interface TrackedOrder {
    id: number
    customer_name: string
    customer_phone: string
    shipping_address: string
    status: string
    payment_method: string
    total_amount: string
    created_at: string
}

export interface DiscountValidation {
    discount_code: string
    total_amount: string
    discount_amount: string
    discounted_total: string
}

export const createOrder = async (payload: CreateOrderPayload) => {
    const response = await apiClient.post('/orders/', payload)
    return response.data
}

export const validateDiscount = async (
    discountCode: string,
    items: OrderItemPayload[],
): Promise<DiscountValidation> => {
    const response = await apiClient.post('/orders/validate-discount/', {
        discount_code: discountCode,
        items,
    })
    return response.data
}

export const trackOrder = async (orderId: string, phone: string): Promise<TrackedOrder> => {
    const response = await apiClient.get('/orders/track/', {params: {order_id: orderId, phone}})
    return response.data
}