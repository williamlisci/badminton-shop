import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProductDetail } from '../types/product'

interface CartItem {
    product: ProductDetail
    quantity: number
}

interface CartState {
    items: CartItem[]
    discountCode: string
    addItem: (product: ProductDetail) => void
    removeItem: (productId: number) => void
    clearCart: () => void
    setDiscountCode: (code: string) => void
    decreaseItem: (productId: number) => void
}

export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            items: [],
            discountCode: '',

            addItem: (product) =>
                set((state) => {
                    if (product.stock_quantity <= 0) {
                        return state
                    }

                    const existing = state.items.find(
                        (item) => item.product.id === product.id,
                    )

                    if (existing) {
                        if (existing.quantity >= product.stock_quantity) {
                            return state
                        }

                        return {
                            items: state.items.map((item) =>
                                item.product.id === product.id
                                    ? { ...item, quantity: item.quantity + 1 }
                                    : item,
                            ),
                        }
                    }

                    return {
                        items: [...state.items, { product, quantity: 1 }],
                    }
                }),

            removeItem: (productId) =>
                set((state) => ({
                    items: state.items.filter((item) => item.product.id !== productId),
                })),

            clearCart: () => set({ items: [], discountCode: '' }),

            setDiscountCode: (discountCode) => set({discountCode}),

            decreaseItem: (productId) =>
                set((state) => ({
                    items: state.items
                        .map((item) =>
                            item.product.id === productId
                                ? { ...item, quantity: item.quantity - 1 }
                                : item,
                        )
                        .filter((item) => item.quantity > 0),
                })),
        }),
        {
            name: 'badminton-shop-cart',
            partialize: (state) => ({items: state.items, discountCode: state.discountCode}),
        },
    ),
)