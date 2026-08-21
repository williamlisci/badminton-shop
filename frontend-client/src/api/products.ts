import { apiClient } from './client'
import type { ProductListItem, ProductDetail } from '../types/product'

export interface ProductQuery {
    search?: string
    category?: string
    brand?: string
    ordering?: string
    'price__gte'?: number
    'price__lte'?: number
    promotion?: boolean
    page?: number
    page_size?: number
}

export interface ProductPage {
    count: number
    next: string | null
    previous: string | null
    results: ProductListItem[]
}

export const getProducts = async (params: ProductQuery = {}): Promise<ProductPage> => {
    const response = await apiClient.get('/products/', {params})
    if (Array.isArray(response.data)) {
        return {count: response.data.length, next: null, previous: null, results: response.data}
    }
    return response.data
}

export const getProductBySlug = async (slug: string): Promise<ProductDetail> => {
    const response = await apiClient.get(`/products/${slug}/`)
    return response.data
}

export const getCategories = async () => {
    const response = await apiClient.get('/categories/')
    return response.data.results ?? response.data
}

export const getBrands = async () => {
    const response = await apiClient.get('/brands/')
    return response.data.results ?? response.data
}