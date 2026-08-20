import { apiClient } from './client'

export interface AdminProduct {
    id: number
    name: string
    slug: string
    description: string
    price: string
    compare_at_price: string | null
    stock_quantity: number
    low_stock_threshold: number
    is_active: boolean
    images: AdminProductImage[]

    category: {
        id: number
        name: string
    }

    brand: {
        id: number
        name: string
    } | null
}

export interface AdminProductPage {
    count: number
    next: string | null
    previous: string | null
    results: AdminProduct[]
}

export interface StockTransaction {
    id: number
    product: number
    product_name: string
    transaction_type: 'in' | 'out' | 'adjustment'
    transaction_type_label: string
    quantity: number
    stock_before: number
    stock_after: number
    reason: string
    created_by_name: string | null
    created_at: string
}

export const getStockTransactions = async (params: {product?: number; transaction_type?: string} = {}) => {
    const response = await apiClient.get('/admin-stock-transactions/', {params})
    return response.data.results ?? response.data
}

export const createStockTransaction = async (payload: {product: number; transaction_type: string; quantity: number; reason: string}) => {
    const response = await apiClient.post('/admin-stock-transactions/', payload)
    return response.data as StockTransaction
}

export interface AdminProductQuery {
    search?: string
    'category__slug'?: string
    'brand__slug'?: string
    is_active?: string
    ordering?: string
    page?: number
    page_size?: number
}

export const getProducts = async (
    params: AdminProductQuery = {},
): Promise<AdminProductPage> => {
    const response = await apiClient.get('/admin-products/', {params})

    if (Array.isArray(response.data)) {
        return {
            count: response.data.length,
            next: null,
            previous: null,
            results: response.data,
        }
    }

    return response.data
}

export interface AdminCategory {
    id: number
    name: string
    slug: string
}

export interface AdminBrand {
    id: number
    name: string
    slug: string
}

export interface CreateProductPayload {
    name: string
    description: string
    price: string
    compare_at_price: string | null
    stock_quantity: number
    is_active: boolean
    category_id: number
    brand_id: number | null
}

export const getCategories = async (): Promise<AdminCategory[]> => {
    const response = await apiClient.get('/categories/')
    return response.data.results ?? response.data
}

export const getBrands = async (): Promise<AdminBrand[]> => {
    const response = await apiClient.get('/brands/')
    return response.data.results ?? response.data
}

export const createProduct = async (
    payload: CreateProductPayload,
) => {
    const response = await apiClient.post(
        '/admin-products/',
        payload,
    )

    return response.data
}

export const updateProductStatus = async (
    productId: number,
    isActive: boolean,
) => {
    const response = await apiClient.patch(
        `/admin-products/${productId}/`,
        {
            is_active: isActive,
        },
    )

    return response.data
}

export const getProduct = async (
    productId: number,
): Promise<AdminProduct> => {
    const response = await apiClient.get(
        `/admin-products/${productId}/`,
    )

    return response.data
}

export const updateProduct = async (
    productId: number,
    payload: CreateProductPayload,
) => {
    const response = await apiClient.patch(
        `/admin-products/${productId}/`,
        payload,
    )

    return response.data
}

export interface AdminProductImage {
    id: number
    image: string
    is_primary: boolean
    order: number
}

export const uploadProductImage = async (
    productId: number,
    file: File,
    isPrimary: boolean,
) => {
    const formData = new FormData()

    formData.append('product_id', String(productId))
    formData.append('image', file)
    formData.append('is_primary', String(isPrimary))
    formData.append('order', '0')

    const response = await apiClient.post(
        '/admin-product-images/',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        },
    )

    return response.data
}

export const deleteProductImage = async (
    imageId: number,
) => {
    await apiClient.delete(
        `/admin-product-images/${imageId}/`,
    )
}
