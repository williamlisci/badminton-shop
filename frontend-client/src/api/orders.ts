import { apiClient } from './client'

interface OrderItemPayload {
    product_id: number
    quantity: number
}

export interface CreateOrderPayload {
    customer_name: string
    customer_phone: string
    shipping_address: string
    items: OrderItemPayload[]
}

export const createOrder = async (payload: CreateOrderPayload) => {
    const response = await apiClient.post('/orders/', payload)
    return response.data
}