import {Navigate, Outlet, Route, Routes} from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import NewProductPage from './pages/NewProductPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import EditProductPage from './pages/EditProductPage'
import InventoryPage from './pages/InventoryPage'
import CatalogPage from './pages/CatalogPage'
import DiscountsPage from './pages/DiscountsPage'
import CustomersPage from './pages/CustomersPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AuditLogsPage from './pages/AuditLogsPage'
import ReportsPage from './pages/ReportsPage'
import Toast from './components/Toast'

function ProtectedRoute() {
    const token = sessionStorage.getItem('access_token')

    return token ? <Outlet /> : <Navigate to="/" replace/>
}

function App() {
    return (
        <>
        <Routes>
            <Route path="/" element={<LoginPage/>}/>
            <Route element={<ProtectedRoute/>}>
                <Route path="/dashboard" element={<DashboardPage/>}/>
                <Route path="/products" element={<ProductsPage/>}/>
                <Route path="/inventory" element={<InventoryPage/>}/>
                <Route path="/catalog" element={<CatalogPage/>}/>
                <Route path="/discounts" element={<DiscountsPage/>}/>
                <Route path="/customers" element={<CustomersPage/>}/>
                <Route path="/admin-users" element={<AdminUsersPage/>}/>
                <Route path="/audit-logs" element={<AuditLogsPage/>}/>
                <Route path="/reports" element={<ReportsPage/>}/>
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
        <Toast />
        </>
    )
}

export default App
