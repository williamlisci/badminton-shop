import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'

function Header() {
    const cartCount = useCartStore((state) =>
        state.items.reduce((total, item) => total + item.quantity, 0),
    )

    return (
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-black shadow-sm">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
                <Link to="/" className="text-2xl font-black tracking-tight text-emerald-500">
                    WLSport
                </Link>

                <nav aria-label="Điều hướng chính" className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-white lg:w-auto">
                    <Link to="/" className="hover:text-emerald-400">Trang chủ</Link>
                    <Link to="/#products" className="hover:text-emerald-400">Sản phẩm</Link>
                    <Link to="/promotions" className="hover:text-emerald-400">🏷 Khuyến mãi</Link>
                    <Link to="/#guides" className="hover:text-emerald-400">Hướng dẫn</Link>
                    <Link to="/#contact" className="hover:text-emerald-400">Liên hệ</Link>
                    <Link to="/cart" className="hover:text-emerald-400">Giỏ hàng ({cartCount})</Link>
                    <Link to="/track-order" className="hover:text-emerald-400">Tra cứu đơn</Link>
                    <Link to="/account" className="hover:text-emerald-400">Tài khoản</Link>
                </nav>
            </div>
        </header>
    )
}

export default Header