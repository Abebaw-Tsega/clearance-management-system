import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Login from "./pages/Login";
import Welcome from "./pages/Welcome";
import Student from "./pages/Student";
import Admin from "./pages/Admin";
import Staff from "./pages/Staff";
import SuperAdmin from "./pages/SuperAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const user = localStorage.getItem('user');

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    const userData = JSON.parse(user);
    if (!allowedRoles.includes(userData.role)) {
      return <Navigate to={`/${userData.role}`} replace />;
    }
  }

  return <>{children}</>;
}

// Redirect based on user role
function RoleBasedRedirect() {
  const user = localStorage.getItem('user');

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userData = JSON.parse(user);
  return <Navigate to={`/${userData.role}`} replace />;
}

// Logout handler component
function LogoutHandler() {
  useEffect(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('studentRequests');
    localStorage.removeItem('staffList');
    localStorage.removeItem('systemStatus');
    window.location.href = '/login';
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-aastu-blue">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Logging out...</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/welcome" element={<Welcome />} />

          {/* Root redirect to welcome page for public access */}
          <Route path="/" element={<Welcome />} />

          {/* Protected Role-based Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Student />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["staff", "department_head", "librarian", "cafeteria", "dormitory", "sport", "student_affair", "registrar"]}>
                <Staff />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdmin />
              </ProtectedRoute>
            }
          />

          {/* Logout Route */}
          <Route path="/logout" element={<LogoutHandler />} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
