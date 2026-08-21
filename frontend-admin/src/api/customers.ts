import {apiClient} from './client'

export interface CustomerOrder {
    id: number
    customer_name: string
    customer_phone: string
    shipping_address: string
    status: string
    payment_method: string
    total_amount: string
    created_at: string
}

export interface AdminCustomer {
    id: number
    customer_name: string
    customer_phone: string
    note: string
    purchase_count: number
    total_spent: string
    orders: CustomerOrder[]
    created_at: string
    updated_at: string
}

export const getCustomers = async (search = ''): Promise<AdminCustomer[]> => {
    const response = await apiClient.get('/orders/admin-customers/', {
        params: search ? {search} : undefined,
    })
    return response.data.results ?? response.data
}

export const updateCustomerNote = async (id: number, note: string) => {
    const response = await apiClient.patch(`/orders/admin-customers/${id}/`, {note})
    return response.data as AdminCustomer
}
