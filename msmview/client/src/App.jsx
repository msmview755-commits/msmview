import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login      from './pages/Login'
import Health     from './pages/Health'
import News       from './pages/News'
import Inventory  from './pages/Inventory'
import Roads      from './pages/Roads'
import Events     from './pages/Events'
import AdminUsers from './pages/AdminUsers'
import Sidebar    from './components/Sidebar'
import Topbar     from './components/Topbar'

function PrivateLayout({ children, title }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" />
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={title} />
        <div className="page">{children}</div>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"         element={<PrivateLayout title="Health Status"><Health /></PrivateLayout>} />
      <Route path="/health"   element={<PrivateLayout title="Health & Logistics"><Health /></PrivateLayout>} />
      <Route path="/news"     element={<PrivateLayout title="News"><News /></PrivateLayout>} />
      <Route path="/inventory" element={<PrivateLayout title="Inventory Dashboard"><Inventory /></PrivateLayout>} />
      <Route path="/roads"    element={<PrivateLayout title="Roads"><Roads /></PrivateLayout>} />
      <Route path="/events"   element={<PrivateLayout title="Events"><Events /></PrivateLayout>} />
      <Route path="/admin/users" element={<PrivateLayout title="User Management"><AdminUsers /></PrivateLayout>} />
      <Route path="*"         element={<Navigate to="/" />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}