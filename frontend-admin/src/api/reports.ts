import {apiClient} from './client'

export interface ReportProduct {
    product_id?: number
    id?: number
    product_name?: string
    name?: string
    category_name?: string
    quantity_sold?: number
    stock_quantity?: number
    revenue?: string
    cost?: string
    profit?: string
    cost_price?: string
    stock_value?: string
}

export interface ReportsData {
    start_date: string
    end_date: string
    summary: {orders: number; revenue: string; cost: string; profit: string}
    best_sellers: ReportProduct[]
    inventory: ReportProduct[]
}

export const getReports = async (params: {start_date?: string; end_date?: string} = {}) => {
    const response = await apiClient.get('/orders/reports/', {params})
    return response.data as ReportsData
}

export const exportReport = async (format: 'xlsx' | 'pdf', params: {start_date?: string; end_date?: string} = {}) => {
    const response = await apiClient.get('/orders/reports/', {
        params: {...params, export: format},
        responseType: 'blob',
    })
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `reports.${format}`
    link.click()
    URL.revokeObjectURL(url)
}
