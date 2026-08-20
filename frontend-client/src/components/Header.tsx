import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'

function Header() {
    const cartCount = useCartStore((state) =>
        state.items.reduce((total, item) => total + item.quantity, 0),
    )

    return (
        <header className="border-b border-slate-200 bg-white">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link to="/" className="text-xl font-bold text-emerald-600">
                    Badminton Shop
                </Link>

                <nav className="flex items-center gap-6 text-sm text-slate-600">
                    <Link to="/" className="hover:text-emerald-600">
                        Trang chủ
                    </Link>

                    <span className="text-slate-300">|</span>

                    <Link to="/cart" className="hover:text-emerald-600">
                        Giỏ hàng ({cartCount})
                    </Link>
                </nav>
            </div>
        </header>
    )
}

export default Header