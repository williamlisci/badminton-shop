export interface Category {
    id: number
    name: string
    slug: string
    description: string
}

export interface Brand {
    id: number
    name: string
    slug: string
    logo: string | null
}

export interface ProductImage {
    id: number
    image: string
    is_primary: boolean
    order: number
}

export interface ProductListItem {
    id: number
    name: string
    slug: string
    price: string
    compare_at_price: string | null
    category: Category
    brand: Brand | null
    primary_image: string | null
    stock_quantity: number
}

export interface ProductDetail extends Omit<ProductListItem, 'primary_image'> {
    description: string
    images: ProductImage[]
    is_active: boolean
    created_at: string
}