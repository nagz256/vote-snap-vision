
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import StatsCards from "@/components/admin/StatsCards";
import LiveUploadNotification from "@/components/admin/LiveUploadNotification";
import { supabase } from "@/integrations/supabase/client";
import StationResultCard from "@/components/admin/StationResultCard";
import PieCharts from "@/components/admin/PieCharts";

const Admin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [stationResults, setStationResults] = useState<Array<{
    id: string;
    station: {name: string, district: string};
    results: Array<{candidateName: string, votes: number}>;
  }>>([]);
  
  const { isAdmin, login, logout } = useVoteSnap();

  // Fetch data when admin logs in
  useEffect(() => {
    if (isAdmin) {
      fetchStationResults();

      // Set up subscription to update data on realtime changes
      const channel = supabase
        .channel('admin-dashboard-updates')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'results' 
        }, () => {
          console.log("Results changed, refreshing data");
          fetchStationResults();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'uploads' 
        }, () => {
          console.log("New upload detected, refreshing data");
          fetchStationResults();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'voter_statistics' 
        }, () => {
          console.log("Voter statistics updated, refreshing data");
          fetchStationResults();
        })
        .subscribe();
      
      // Also set up a periodic refresh as backup
      const refreshInterval = setInterval(() => {
        fetchStationResults();
      }, 30000);
        
      return () => {
        supabase.removeChannel(channel);
        clearInterval(refreshInterval);
      };
    }
  }, [isAdmin]);
  
  const fetchStationResults = async () => {
    try {
      console.log("Fetching station results...");
      const { data: uploadsData, error } = await supabase
        .from('uploads')
        .select(`
          id,
          station_id,
          polling_stations (
            name,
            district
          )
        `);
      
      if (error) throw error;
      
      const stationResultsData = await Promise.all(
        uploadsData.map(async (upload) => {
          const { data: resultsData } = await supabase
            .from('results')
            .select(`
              votes,
              candidates (
                name
              )
            `)
            .eq('upload_id', upload.id);
            
          const formattedResults = resultsData?.map(result => ({
            candidateName: result.candidates.name,
            votes: result.votes
          })) || [];
          
          return {
            id: upload.id,
            station: {
              name: upload.polling_stations?.name || "Unknown",
              district: upload.polling_stations?.district || "Unknown"
            },
            results: formattedResults
          };
        })
      );
      
      setStationResults(stationResultsData);
      console.log("Station results fetched:", stationResultsData);
    } catch (error) {
      console.error("Error fetching station results:", error);
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
        
        {/* Charts - Using our new PieCharts component */}
        <PieCharts />
        
        {/* Polling Station Results */}
        <Card className="glass-card shadow-md">
          <CardHeader>
            <CardTitle>Polling Station Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {stationResults.length > 0 ? (
                stationResults.map(stationResult => (
                  <StationResultCard key={stationResult.id} stationResult={stationResult} />
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-muted-foreground">
                  No polling station results available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Admin;
