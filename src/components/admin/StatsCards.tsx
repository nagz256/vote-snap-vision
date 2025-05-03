import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { query } from "@/integrations/mysql/client";
import { ChartBarIcon, UsersIcon, MapPin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "react-router-dom";

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
      const totalStationsResult = await query('SELECT COUNT(*) as count FROM polling_stations');
      const totalStations = totalStationsResult[0]?.count || 0;
      
      // Get uploads with valid results
      const uploadsData = await query('SELECT id, station_id FROM uploads');
      
      // For uploads with valid results, we need to check the results table
      const validStationIds = new Set<string>();
      
      if (uploadsData && uploadsData.length > 0) {
        for (const upload of uploadsData) {
          if (!upload.station_id) continue;
          
          const resultsCount = await query(
            'SELECT COUNT(*) as count FROM results WHERE upload_id = ?', 
            [upload.id]
          );
          
          if (resultsCount[0]?.count > 0) {
            validStationIds.add(upload.station_id);
          }
        }
      }

      // Get total votes from results
      const resultsData = await query('SELECT SUM(votes) as totalVotes FROM results');
      const totalVotesCounted = resultsData[0]?.totalVotes || 0;
      
      // Get voter statistics from the table
      const voterStats = validStationIds.size > 0 
        ? await query(
            'SELECT SUM(male_voters) as totalMale, SUM(female_voters) as totalFemale, SUM(total_voters) as totalVoters, SUM(wasted_ballots) as wastedBallots FROM voter_statistics WHERE station_id IN (?)', 
            [Array.from(validStationIds)]
          )
        : [{ totalMale: 0, totalFemale: 0, totalVoters: 0, wastedBallots: 0 }];
      
      const totalMale = voterStats[0]?.totalMale || 0;
      const totalFemale = voterStats[0]?.totalFemale || 0;
      const wastedBallots = voterStats[0]?.wastedBallots || 0;
      
      setStats({
        totalStations,
        uploadedStations: validStationIds.size,
        maleVoters: totalMale,
        femaleVoters: totalFemale,
        totalVoters: totalVotesCounted,
        totalVotesCounted,
        wastedBallots
      });
      
      setLastUpdated(new Date());
      
      console.log("Stats fetched successfully:", {
        totalStations,
        uploadedStations: validStationIds.size,
        totalMale,
        totalFemale,
        totalVotesCounted,
        wastedBallots
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
