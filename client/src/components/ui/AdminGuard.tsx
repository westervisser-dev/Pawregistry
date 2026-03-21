import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function AdminGuard() {
	const { user, isAdmin, loading } = useAuthStore();
	if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-500">Loading…</div>;
	if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;
	return <Outlet />;
}
