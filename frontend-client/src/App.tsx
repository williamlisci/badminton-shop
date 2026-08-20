import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'

function App() {
    return (
        <>
            <Header />

            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/products/:slug" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
        </>
    )
}

export default App