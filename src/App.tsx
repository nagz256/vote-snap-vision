
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
import DataManagement from "./pages/DataManagement";
import PollingStations from "./pages/PollingStations";
import NotFound from "./pages/NotFound";
import Uploads from "./pages/Uploads";

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
              <Route path="/data-management" element={<DataManagement />} />
              <Route path="/polling-stations" element={<PollingStations />} />
              <Route path="/uploads" element={<Uploads />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </VoteSnapProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
