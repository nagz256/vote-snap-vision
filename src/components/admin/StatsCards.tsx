import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChartBarIcon, UsersIcon, MapPin } from "lucide-react";

const StatsCards = () => {
  const [stats, setStats] = useState({
    totalStations: 0,
    uploadedStations: 0,
    maleVoters: 0,
    femaleVoters: 0,
    totalVoters: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total stations
        const { count: totalStations } = await supabase
          .from('polling_stations')
          .select('*', { count: 'exact', head: true });
        
        // Get uploaded stations
        const { count: uploadedStations } = await supabase
          .from('uploads')
          .select('*', { count: 'exact', head: true });
        
        // Get results with gender counts
        const { data: resultsData } = await supabase
          .from('results')
          .select(`
            votes,
            candidates (name)
          `);
        
        let maleVoters = 0;
        let femaleVoters = 0;
        
        if (resultsData) {
          // This is a simplified approach. In a real app, you'd have gender info in your database
          // For demo purposes, we'll assume candidates with even IDs are male and odd are female
          resultsData.forEach(result => {
            const candidateName = result.candidates?.name.toLowerCase() || "";
            // Mock logic: names with 'john' or 'michael' are counted as male voters
            if (candidateName.includes('john') || candidateName.includes('michael')) {
              maleVoters += result.votes;
            } 
            // Mock logic: names with 'jane' or 'emily' are counted as female voters
            else if (candidateName.includes('jane') || candidateName.includes('emily')) {
              femaleVoters += result.votes;
            }
            // For other names, distribute evenly
            else {
              maleVoters += Math.round(result.votes / 2);
              femaleVoters += result.votes - Math.round(result.votes / 2);
            }
          });
        }
        
        setStats({
          totalStations: totalStations || 0,
          uploadedStations: uploadedStations || 0,
          maleVoters,
          femaleVoters,
          totalVoters: maleVoters + femaleVoters
        });
        
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };
    
    fetchStats();
    
    // Set up a subscription to keep stats fresh
    const channel = supabase
      .channel('table-db-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'results' 
      }, () => {
        fetchStats();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'uploads' 
      }, () => {
        fetchStats();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-base justify-between">
            <span>Polling Stations</span>
            <MapPin size={18} className="text-purple-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">{stats.uploadedStations} / {stats.totalStations}</p>
            <p className="text-sm text-muted-foreground">
              {Math.round((stats.uploadedStations / Math.max(stats.totalStations, 1)) * 100)}% uploaded
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-base justify-between">
            <span>Male Voters</span>
            <UsersIcon size={18} className="text-blue-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">{stats.maleVoters.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              {Math.round((stats.maleVoters / Math.max(stats.totalVoters, 1)) * 100)}% of votes
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-base justify-between">
            <span>Female Voters</span>
            <UsersIcon size={18} className="text-pink-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">{stats.femaleVoters.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              {Math.round((stats.femaleVoters / Math.max(stats.totalVoters, 1)) * 100)}% of votes
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-base justify-between">
            <span>Total Votes</span>
            <ChartBarIcon size={18} className="text-green-500" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">{stats.totalVoters.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              {Math.round(stats.totalVoters / Math.max(stats.totalStations, 1))} avg. per station
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
