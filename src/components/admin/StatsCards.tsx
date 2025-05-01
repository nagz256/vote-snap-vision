import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChartBarIcon, UsersIcon, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const StatsCards = () => {
  const [stats, setStats] = useState({
    totalStations: 0,
    uploadedStations: 0,
    maleVoters: 0,
    femaleVoters: 0,
    totalVoters: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      setIsRefreshing(true);
      
      // Get total stations
      const { count: totalStations } = await supabase
        .from('polling_stations')
        .select('*', { count: 'exact', head: true });
      
      // Get uploaded stations (distinct station IDs)
      const { data: uploadedStationsData } = await supabase
        .from('uploads')
        .select('station_id');
        
      // Count unique station IDs
      const uniqueStationIds = new Set(uploadedStationsData?.map(u => u.station_id));
      const uploadedStations = uniqueStationIds.size;
      
      // Get voter statistics from the new table
      const { data: voterStats } = await supabase
        .from('voter_statistics')
        .select(`
          male_voters,
          female_voters,
          total_voters
        `);
        
      let totalMale = 0;
      let totalFemale = 0;
      let totalVotes = 0;
      
      if (voterStats) {
        totalMale = voterStats.reduce((sum, stat) => sum + stat.male_voters, 0);
        totalFemale = voterStats.reduce((sum, stat) => sum + stat.female_voters, 0);
        totalVotes = voterStats.reduce((sum, stat) => sum + stat.total_voters, 0);
      }
      
      setStats({
        totalStations: totalStations || 0,
        uploadedStations: uploadedStations || 0,
        maleVoters: totalMale,
        femaleVoters: totalFemale,
        totalVoters: totalVotes
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Set up a subscription to keep stats fresh with multiple channels
    const uploadsChannel = supabase
      .channel('stats-uploads-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'uploads' 
      }, () => {
        console.log("Uploads table updated, refreshing stats");
        fetchStats();
      })
      .subscribe();
      
    const voterStatsChannel = supabase
      .channel('stats-voter-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'voter_statistics' 
      }, () => {
        console.log("Voter statistics updated, refreshing stats");
        fetchStats();
      })
      .subscribe();
      
    const resultsChannel = supabase
      .channel('stats-results-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'results' 
      }, () => {
        console.log("Results updated, refreshing stats");
        fetchStats();
      })
      .subscribe();
      
    const stationsChannel = supabase
      .channel('stats-stations-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'polling_stations' 
      }, () => {
        console.log("Polling stations table updated, refreshing stats");
        fetchStats();
      })
      .subscribe();
      
    // Also set up a periodic refresh as backup (every 30 seconds)
    const refreshInterval = setInterval(() => {
      fetchStats();
    }, 30000);
      
    return () => {
      supabase.removeChannel(uploadsChannel);
      supabase.removeChannel(voterStatsChannel);
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(stationsChannel);
      clearInterval(refreshInterval);
    };
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchStats} 
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          {isRefreshing ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Refresh
            </>
          )}
        </Button>
      </div>

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
                {Math.round(stats.totalVoters / Math.max(stats.uploadedStations, 1))} avg. per station
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatsCards;
