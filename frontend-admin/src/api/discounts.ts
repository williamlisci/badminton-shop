import {apiClient} from './client'

export interface DiscountCode {
    id: number
    code: string
    discount_type: 'percentage' | 'fixed'
    value: string
    starts_at: string
    ends_at: string
    max_uses: number | null
    used_count: number
    min_order_amount: string
    is_active: boolean
    product_ids: number[]
    category_ids: number[]
    created_at: string
    updated_at: string
}

export interface DiscountPayload {
    code: string
    discount_type: 'percentage' | 'fixed'
    value: string
    starts_at: string
    ends_at: string
    max_uses: number | null
    min_order_amount: string
    is_active: boolean
    product_ids: number[]
    category_ids: number[]
}

export const getDiscounts = async (): Promise<DiscountCode[]> => {
    const response = await apiClient.get('/orders/admin-discounts/')
    return response.data.results ?? response.data
}

export const saveDiscount = async (id: number | null, payload: DiscountPayload) => {
    const response = id
        ? await apiClient.patch(`/orders/admin-discounts/${id}/`, payload)
        : await apiClient.post('/orders/admin-discounts/', payload)
    return response.data as DiscountCode
}

export const deleteDiscount = (id: number) => apiClient.delete(`/orders/admin-discounts/${id}/`)
