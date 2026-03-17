import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function PortalGuard() {
	const { user, loading } = useAuthStore();
	if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-500">Loading…</div>;
	if (!user) return <Navigate to="/login" replace />;
	return <Outlet />;
}

export function AdminGuard() {
	const { user, isAdmin, loading } = useAuthStore();
	if (loading) return <div className="flex items-center justify-center min-h-screen text-stone-500">Loading…</div>;
	if (!user) return <Navigate to="/login" replace />;
	if (!isAdmin) return <Navigate to="/portal" replace />;
	return <Outlet />;
}
