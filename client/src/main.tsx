import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

// Layouts
import { PublicLayout } from '@/components/ui/PublicLayout';
import { PortalLayout } from '@/components/ui/PortalLayout';
import { AdminLayout } from '@/components/ui/AdminLayout';

// Public pages
import { HomePage } from '@/pages/public/HomePage';
import { DogsPage } from '@/pages/public/DogsPage';
import { DogProfilePage } from '@/pages/public/DogProfilePage';
import { LittersPage } from '@/pages/public/LittersPage';
import { LitterPage } from '@/pages/public/LitterPage';
import { ApplyPage } from '@/pages/public/ApplyPage';
import { AboutPage } from '@/pages/public/AboutPage';

// Auth pages
import { LoginPage } from '@/pages/LoginPage';
import { CallbackPage } from '@/pages/CallbackPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';

// Portal pages
import { PortalDashboard } from '@/pages/portal/PortalDashboard';
import { PortalUpdates } from '@/pages/portal/PortalUpdates';
import { PortalMessages } from '@/pages/portal/PortalMessages';
import { PortalDocuments } from '@/pages/portal/PortalDocuments';
import { PortalChecklist } from '@/pages/portal/PortalChecklist';

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminDogs } from '@/pages/admin/AdminDogs';
import { AdminDogDetail } from '@/pages/admin/AdminDogDetail';
import { AdminLitters } from '@/pages/admin/AdminLitters';
import { AdminLitterDetail } from '@/pages/admin/AdminLitterDetail';
import { AdminClients } from '@/pages/admin/AdminClients';
import { AdminClientDetail } from '@/pages/admin/AdminClientDetail';
import { AdminUpdates } from '@/pages/admin/AdminUpdates';
import { AdminWaitlist } from '@/pages/admin/AdminWaitlist';
import { AdminDocuments } from '@/pages/admin/AdminDocuments';

// Guards
import { PortalGuard } from '@/components/ui/PortalGuard';
import { AdminGuard } from '@/components/ui/AdminGuard';

// Init auth
import { useAuthStore } from '@/stores/authStore';
import { useEffect } from 'react';

function App() {
	const init = useAuthStore((s) => s.init);

	useEffect(() => {
		init();
	}, [init]);

	return (
		<BrowserRouter>
			<Routes>
				{/* Public site */}
				<Route element={<PublicLayout />}>
					<Route path="/" element={<HomePage />} />
					<Route path="/dogs" element={<DogsPage />} />
					<Route path="/dogs/:id" element={<DogProfilePage />} />
					<Route path="/litters" element={<LittersPage />} />
					<Route path="/litters/:id" element={<LitterPage />} />
					<Route path="/apply" element={<ApplyPage />} />
					<Route path="/about" element={<AboutPage />} />
				</Route>

				{/* Auth */}
				<Route path="/login" element={<LoginPage />} />
				<Route path="/admin/login" element={<AdminLoginPage />} />
				<Route path="/portal/callback" element={<CallbackPage />} />

				{/* Client portal */}
				<Route element={<PortalGuard />}>
					<Route element={<PortalLayout />}>
						<Route path="/portal" element={<PortalDashboard />} />
						<Route path="/portal/updates" element={<PortalUpdates />} />
						<Route path="/portal/messages" element={<PortalMessages />} />
						<Route path="/portal/documents" element={<PortalDocuments />} />
						<Route path="/portal/checklist" element={<PortalChecklist />} />
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
						<Route path="/admin/waitlist" element={<AdminWaitlist />} />
						<Route path="/admin/documents" element={<AdminDocuments />} />
					</Route>
				</Route>

				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
