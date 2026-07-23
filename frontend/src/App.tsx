import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Emergency from "./pages/Emergency";
import Consultation from "./pages/Consultation";
import Reports from "./pages/Reports";
import MentalHealth from "./pages/MentalHealth";
import ImageAnalyser from "./pages/ImageAnalyser";
import History from "./pages/History";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import EmergencyAvatar from "./pages/EmergencyAvatar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/emergency/ai" element={<EmergencyAvatar />} />
          <Route path="/consultation" element={<Consultation />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/mental-health" element={<MentalHealth />} />
          <Route path="/image-analyser" element={<ImageAnalyser />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
