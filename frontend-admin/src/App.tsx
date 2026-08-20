import {Navigate, Outlet, Route, Routes} from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import NewProductPage from './pages/NewProductPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import EditProductPage from './pages/EditProductPage'
import InventoryPage from './pages/InventoryPage'

function ProtectedRoute() {
    const token = sessionStorage.getItem('access_token')

    return token ? <Outlet /> : <Navigate to="/" replace/>
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<LoginPage/>}/>
            <Route element={<ProtectedRoute/>}>
                <Route path="/dashboard" element={<DashboardPage/>}/>
                <Route path="/products" element={<ProductsPage/>}/>
                <Route path="/inventory" element={<InventoryPage/>}/>
                <Route path="/products/new" element={<NewProductPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route
                    path="/orders/:id"
                    element={<OrderDetailPage />}
                />
                <Route
                    path="/products/:id/edit"
                    element={<EditProductPage />}
                />
            </Route>
        </Routes>
    )
}

export default App
