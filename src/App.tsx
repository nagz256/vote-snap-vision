
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VoteSnapProvider } from "./context/VoteSnapContext";
import Layout from "./components/layout/Layout";

// Import pages
import Home from "./pages/Home";
import Agent from "./pages/Agent";
import Admin from "./pages/Admin";
import PollingStations from "./pages/PollingStations";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";

// Fix for React Native compatibility
import { createClient } from '@supabase/supabase-js';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <VoteSnapProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/agent" element={<Agent />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/polling-stations" element={<PollingStations />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </VoteSnapProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
