
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import StatsCards from "@/components/admin/StatsCards";
import LiveUploadNotification from "@/components/admin/LiveUploadNotification";
import StationResultCard from "@/components/admin/StationResultCard";
import PieCharts from "@/components/admin/PieCharts";
import { supabase, hasError, safeData, filterOut } from "@/integrations/supabase/client";

// Define the interface for station results
interface StationResult {
  id: string;
  station: {
    name: string;
    district: string;
  };
  results: Array<{
    candidateName: string;
    votes: number;
  }>;
}

interface UploadData {
  id: string;
  polling_stations?: {
    id?: string;
    name?: string;
    district?: string;
  };
}

interface ResultData {
  votes: number;
  candidates: {
    name: string;
  };
}

const Admin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [stationResults, setStationResults] = useState<StationResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  
  const { isAdmin, login, logout } = useVoteSnap();

  // Fetch data when admin logs in
  useEffect(() => {
    if (isAdmin) {
      fetchStationResults();
      
      // Set up periodic refresh
      const refreshInterval = setInterval(() => {
        fetchStationResults();
      }, 30000);
        
      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [isAdmin]);
  
  const fetchStationResults = async () => {
    try {
      setIsLoadingResults(true);
      console.log("Fetching station results from database...");
      
      // Get all uploads with their station info
      const uploadsResponse = await supabase
        .from('uploads')
        .select(`
          id,
          polling_stations (
            id,
            name,
            district
          )
        `);
        
      if (hasError(uploadsResponse)) {
        console.error("Error fetching uploads:", uploadsResponse.error);
        setStationResults([]);
        setIsLoadingResults(false);
        return;
      }
      
      const uploadsData = safeData<UploadData>(uploadsResponse);
      
      if (!uploadsData || uploadsData.length === 0) {
        console.log("No uploads found");
        setStationResults([]);
        setIsLoadingResults(false);
        return;
      }
      
      // Process each upload to get its results
      const resultsPromises = uploadsData.map(async (upload) => {
        if (!upload.id) return null;
        
        const resultResponse = await supabase
          .from('results')
          .select(`
            votes,
            candidates (
              name
            )
          `)
          .match(filterOut.match({ upload_id: upload.id }));
          
        if (hasError(resultResponse)) {
          console.log(`Error getting results for upload ${upload.id}:`, resultResponse.error);
          return null;
        }
        
        const resultData = safeData<ResultData>(resultResponse);
        
        if (resultData.length === 0) {
          console.log(`No results for upload ${upload.id}`);
          return null;
        }
        
        const formattedResults = resultData.map(item => ({
          candidateName: item.candidates?.name || "Unknown Candidate",
          votes: item.votes || 0
        }));
        
        return {
          id: upload.id,
          station: {
            name: upload.polling_stations?.name || "Unknown Station",
            district: upload.polling_stations?.district || "Unknown District"
          },
          results: formattedResults
        };
      });
      
      const results = await Promise.all(resultsPromises);
      const validResults = results.filter(Boolean) as StationResult[];
      
      setStationResults(validResults);
      console.log("Fetched station results:", validResults);
    } catch (error) {
      console.error("Error fetching station results:", error);
      setStationResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      setLoginError("");
    } else {
      setLoginError("Invalid username or password");
    }
  };
  
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-10">
        <div className="glass-container">
          <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Username
              </label>
              <Input
                id="username"
                className="glass-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
            
            <div className="pt-2">
              <Button className="glass-button w-full" type="submit">
                Login
              </Button>
            </div>
            
            <p className="text-xs text-foreground/70 text-center pt-2">
              Demo credentials: username "admin" / password "password123"
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <LiveUploadNotification />
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link to="/data-management" className="flex items-center gap-2">
                <Settings size={16} />
                Data Management
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/polling-stations">Manage Polling Stations</Link>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={logout}>
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
        
        {/* Statistics Cards */}
        <StatsCards />
        
        {/* Charts - Using our PieCharts component */}
        <PieCharts />
        
        {/* Polling Station Results */}
        <Card className="glass-card shadow-md">
          <CardHeader>
            <CardTitle>Polling Station Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingResults ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {stationResults.length > 0 ? (
                  stationResults.map(stationResult => (
                    <StationResultCard key={stationResult.id} stationResult={stationResult} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-6 text-muted-foreground">
                    No polling station results available yet. Submit results from the Agent Portal.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Admin;
