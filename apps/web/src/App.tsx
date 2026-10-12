import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar.js';
import { Footer } from './components/Footer.js';
import { HomePage } from './pages/HomePage.js';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.js';
import { PublicBookingPage } from './pages/public/PublicBookingPage.js';
import { CustomerPortalPage } from './pages/portal/CustomerPortalPage.js';
import { SuperadminDashboardPage } from './pages/superadmin/SuperadminDashboardPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col justify-between bg-slate-50">
          <div>
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/superadmin" element={<SuperadminDashboardPage />} />
                <Route path="/portal" element={<CustomerPortalPage />} />
                <Route path="/mi-cuenta" element={<CustomerPortalPage />} />
                <Route path="/b/:slug" element={<PublicBookingPage />} />
                <Route path="/:slug" element={<PublicBookingPage />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </main>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
