import { apiClient } from './client'
import type { ProductListItem, ProductDetail } from '../types/product'

export const getProducts = async (): Promise<ProductListItem[]> => {
    const response = await apiClient.get('/products/')
    return response.data.results ?? response.data
}

export const getProductBySlug = async (slug: string): Promise<ProductDetail> => {
    const response = await apiClient.get(`/products/${slug}/`)
    return response.data
}