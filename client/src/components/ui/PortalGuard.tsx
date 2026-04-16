import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function PortalGuard() {
	const { user, loading } = useAuthStore();
	const location = useLocation();
	if (loading) return <div className="flex items-center justify-center min-h-screen text-warm-500">Loading…</div>;
	if (!user) {
		sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
		return <Navigate to="/login" replace />;
	}
	return <Outlet />;
}
