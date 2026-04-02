import React, { lazy, Suspense, Component, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// ─── Error boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
	state = { error: null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	render() {
		if (this.state.error) {
			return (
				<div className="min-h-screen bg-warm-50 flex items-center justify-center px-6">
					<div className="w-full max-w-sm text-center">
						<p className="text-4xl mb-4">🐾</p>
						<h1 className="font-serif text-xl font-bold text-warm-900 mb-2">Something went wrong</h1>
						<p className="text-warm-500 text-sm mb-6">An unexpected error occurred. Please refresh the page.</p>
						<button
							onClick={() => window.location.reload()}
							className="px-6 py-2.5 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
						>
							Refresh page
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}

// Layouts & guards — eager (always needed)
import { PublicLayout } from '@/components/ui/PublicLayout';
import { PortalLayout } from '@/components/ui/PortalLayout';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { PortalGuard } from '@/components/ui/PortalGuard';
import { AdminGuard } from '@/components/ui/AdminGuard';
import { LoadingPage } from '@/components/ui';

// Auth store — eager
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

// ─── Lazy page imports ────────────────────────────────────────────────────────

const lazy$ = <M, K extends keyof M>(
	load: () => Promise<M>,
	name: K,
) => lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

// Public
const HomePage = lazy$(() => import('@/pages/public/HomePage'), 'HomePage');
const DogsPage = lazy$(() => import('@/pages/public/DogsPage'), 'DogsPage');
const DogProfilePage = lazy$(() => import('@/pages/public/DogProfilePage'), 'DogProfilePage');
const LittersPage = lazy$(() => import('@/pages/public/LittersPage'), 'LittersPage');
const ApplyPage = lazy$(() => import('@/pages/public/ApplyPage'), 'ApplyPage');
const AboutPage = lazy$(() => import('@/pages/public/AboutPage'), 'AboutPage');

// Auth
const LoginPage = lazy$(() => import('@/pages/LoginPage'), 'LoginPage');
const CallbackPage = lazy$(() => import('@/pages/CallbackPage'), 'CallbackPage');
const AdminLoginPage = lazy$(() => import('@/pages/AdminLoginPage'), 'AdminLoginPage');
const AdminInviteCallbackPage = lazy$(() => import('@/pages/AdminInviteCallbackPage'), 'AdminInviteCallbackPage');

// Portal
const PortalDashboard = lazy$(() => import('@/pages/portal/PortalDashboard'), 'PortalDashboard');
const PortalUpdates = lazy$(() => import('@/pages/portal/PortalUpdates'), 'PortalUpdates');
const PortalDocuments = lazy$(() => import('@/pages/portal/PortalDocuments'), 'PortalDocuments');
const PortalLitters = lazy$(() => import('@/pages/portal/PortalLitters'), 'PortalLitters');
const PortalLitterDetail = lazy$(() => import('@/pages/portal/PortalLitterDetail'), 'PortalLitterDetail');
const PortalPreferences = lazy$(() => import('@/pages/portal/PortalPreferences'), 'PortalPreferences');

// Admin
const AdminDashboard = lazy$(() => import('@/pages/admin/AdminDashboard'), 'AdminDashboard');
const AdminDogs = lazy$(() => import('@/pages/admin/AdminDogs'), 'AdminDogs');
const AdminDogDetail = lazy$(() => import('@/pages/admin/AdminDogDetail'), 'AdminDogDetail');
const AdminLitters = lazy$(() => import('@/pages/admin/AdminLitters'), 'AdminLitters');
const AdminLitterDetail = lazy$(() => import('@/pages/admin/AdminLitterDetail'), 'AdminLitterDetail');
const AdminClients = lazy$(() => import('@/pages/admin/AdminClients'), 'AdminClients');
const AdminClientDetail = lazy$(() => import('@/pages/admin/AdminClientDetail'), 'AdminClientDetail');
const AdminUpdates = lazy$(() => import('@/pages/admin/AdminUpdates'), 'AdminUpdates');
const AdminDocuments = lazy$(() => import('@/pages/admin/AdminDocuments'), 'AdminDocuments');
const AdminAdmins = lazy$(() => import('@/pages/admin/AdminAdmins'), 'AdminAdmins');
const AdminEmails = lazy$(() => import('@/pages/admin/AdminEmails'), 'AdminEmails');

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
	const init = useAuthStore((s) => s.init);

	useEffect(() => {
		init();
	}, [init]);

	return (
		<BrowserRouter>
			<Suspense fallback={<LoadingPage />}>
				<Routes>
					{/* Public site */}
					<Route element={<PublicLayout />}>
						<Route path="/" element={<HomePage />} />
						<Route path="/dogs" element={<DogsPage />} />
						<Route path="/dogs/:id" element={<DogProfilePage />} />
						<Route path="/litters" element={<LittersPage />} />
						<Route path="/apply" element={<ApplyPage />} />
						<Route path="/about" element={<AboutPage />} />
					</Route>

					{/* Auth */}
					<Route path="/login" element={<LoginPage />} />
					<Route path="/admin/login" element={<AdminLoginPage />} />
					<Route path="/admin/invite-callback" element={<AdminInviteCallbackPage />} />
					<Route path="/portal/callback" element={<CallbackPage />} />

					{/* Client portal */}
					<Route element={<PortalGuard />}>
						<Route element={<PortalLayout />}>
							<Route path="/portal" element={<PortalDashboard />} />
							<Route path="/portal/litters" element={<PortalLitters />} />
							<Route path="/portal/litters/:id" element={<PortalLitterDetail />} />
							<Route path="/portal/updates" element={<PortalUpdates />} />
							<Route path="/portal/documents" element={<PortalDocuments />} />
							<Route path="/portal/preferences" element={<PortalPreferences />} />
						</Route>
					</Route>

					{/* Admin portal */}
					<Route element={<AdminGuard />}>
						<Route element={<AdminLayout />}>
							<Route path="/admin" element={<AdminDashboard />} />
							<Route path="/admin/dogs" element={<AdminDogs />} />
							<Route path="/admin/dogs/:id" element={<AdminDogDetail />} />
							<Route path="/admin/litters" element={<AdminLitters />} />
							<Route path="/admin/litters/:id" element={<AdminLitterDetail />} />
							<Route path="/admin/clients" element={<AdminClients />} />
							<Route path="/admin/clients/:id" element={<AdminClientDetail />} />
							<Route path="/admin/updates" element={<AdminUpdates />} />
							<Route path="/admin/documents" element={<AdminDocuments />} />
							<Route path="/admin/admins" element={<AdminAdmins />} />
							<Route path="/admin/emails" element={<AdminEmails />} />
						</Route>
					</Route>

					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</React.StrictMode>
);
