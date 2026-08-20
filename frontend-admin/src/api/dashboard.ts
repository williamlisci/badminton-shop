import {apiClient} from './client'

export type DashboardPeriod = 'day' | 'month'

export interface DashboardTrendPoint {
    label: string
    revenue: number | string
    orders: number
}

export interface DashboardStatusCount {
    status: string
    label: string
    count: number
}

export interface DashboardTopProduct {
    product_id: number
    product_name: string
    quantity_sold: number
    revenue: number | string
}

export interface DashboardLowStockProduct {
    id: number
    name: string
    stock_quantity: number
    category_name: string
}

export interface DashboardStats {
    total_products: number
    total_orders: number
    total_revenue: number | string
    period: DashboardPeriod
    period_orders: number
    period_revenue: number | string
    average_order_value: number | string
    revenue_trend: DashboardTrendPoint[]
    orders_by_status: DashboardStatusCount[]
    top_products: DashboardTopProduct[]
    low_stock_products: DashboardLowStockProduct[]
    comparison: {
        previous_revenue: number | string
        change_percent: number | string
    }
}

export const getDashboardStats = async (
    period: DashboardPeriod = 'day',
): Promise<DashboardStats> => {
    const response = await apiClient.get('/orders/dashboard-stats/', {
        params: {period},
    })
    return response.data
}
