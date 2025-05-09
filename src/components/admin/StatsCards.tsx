
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { ChartBarIcon, UsersIcon, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase, hasError, safeData } from "@/integrations/supabase/client";

interface UploadData {
  id: string;
  station_id: string;
}

const StatsCards = () => {
  const [stats, setStats] = useState({
    totalStations: 0,
    uploadedStations: 0,
    maleVoters: 0,
    femaleVoters: 0,
    totalVoters: 0,
    totalVotesCounted: 0,
    wastedBallots: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      setIsRefreshing(true);
      
      // Get total number of polling stations
      const stationsResponse = await supabase
        .from('polling_stations')
        .select('id');
        
      if (hasError(stationsResponse)) {
        console.error("Error fetching stations:", stationsResponse.error);
        throw stationsResponse.error;
      }
      
      const totalStations = safeData(stationsResponse).length;
      
      // Get uploads to determine submitted stations
      const uploadsResponse = await supabase
        .from('uploads')
        .select('id, station_id');
        
      if (hasError(uploadsResponse)) {
        console.error("Error fetching uploads:", uploadsResponse.error);
        throw uploadsResponse.error;
      }
      
      const uploadsData = safeData<UploadData>(uploadsResponse);
      
      // For uploads with valid results, check the results table
      const validStationIds = new Set<string>();
      
      if (uploadsData && uploadsData.length > 0) {
        for (const upload of uploadsData) {
          if (!upload.id || !upload.station_id) continue;
          
          // Use .eq instead of .filter for TypeScript compatibility
          const resultsResponse = await supabase
            .from('results')
            .select('id')
            .eq('upload_id', upload.id)
            .limit(1);
            
          if (hasError(resultsResponse)) {
            console.error(`Error checking results for upload ${upload.id}:`, resultsResponse.error);
            continue;
          }
          
          const resultsData = safeData(resultsResponse);
          if (resultsData.length > 0) {
            validStationIds.add(upload.station_id);
          }
        }
      }
      
      // Get total votes from results
      const resultsResponse = await supabase
        .from('results')
        .select('votes');
        
      if (hasError(resultsResponse)) {
        console.error("Error fetching results:", resultsResponse.error);
        throw resultsResponse.error;
      }
      
      const resultsData = safeData<{votes: number}>(resultsResponse);
      const totalVotesCounted = resultsData.reduce((sum, item) => sum + (item.votes || 0), 0);
      
      // Get voter statistics
      const voterStatsResponse = await supabase
        .from('voter_statistics')
        .select('male_voters, female_voters, wasted_ballots, total_voters');
        
      if (hasError(voterStatsResponse)) {
        console.error("Error fetching voter statistics:", voterStatsResponse.error);
        throw voterStatsResponse.error;
      }
      
      const voterStatsData = safeData<{
        male_voters: number, 
        female_voters: number, 
        wasted_ballots: number, 
        total_voters: number
      }>(voterStatsResponse);
      
      let totalMale = 0;
      let totalFemale = 0;
      let totalWastedBallots = 0;
      let totalVoters = 0;
      
      if (voterStatsData && voterStatsData.length > 0) {
        totalMale = voterStatsData.reduce((sum, item) => sum + (item.male_voters || 0), 0);
        totalFemale = voterStatsData.reduce((sum, item) => sum + (item.female_voters || 0), 0);
        totalWastedBallots = voterStatsData.reduce((sum, item) => sum + (item.wasted_ballots || 0), 0);
        
        // Calculate the total using male, female and wasted ballots
        totalVoters = totalMale + totalFemale + totalWastedBallots;
      }
      
      setStats({
        totalStations,
        uploadedStations: validStationIds.size,
        maleVoters: totalMale,
        femaleVoters: totalFemale,
        totalVoters: totalVoters,
        totalVotesCounted,
        wastedBallots: totalWastedBallots
      });
      
      setLastUpdated(new Date());
      
      console.log("Stats fetched successfully:", {
        totalStations,
        uploadedStations: validStationIds.size,
        totalMale,
        totalFemale,
        totalWastedBallots,
        totalVoters,
        totalVotesCounted
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to fetch statistics");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Set up a periodic refresh (every 30 seconds)
    const refreshInterval = setInterval(() => {
      fetchStats();
    }, 30000);
      
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-muted-foreground">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
        <div className="flex gap-2">
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
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            className="flex items-center gap-2"
          >
            <Link to="/data-management">Manage Data</Link>
          </Button>
        </div>
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
              <p className="text-2xl font-bold">{stats.totalVotesCounted.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                {stats.uploadedStations > 0 
                  ? `${Math.round(stats.totalVotesCounted / stats.uploadedStations)} avg. per station`
                  : "No stations uploaded"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatsCards;
