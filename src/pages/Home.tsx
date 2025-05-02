
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const [stats, setStats] = useState({
    stationsSubmitted: 0,
    totalStations: 0,
    districtsCount: 0,
    candidatesCount: 0
  });

  useEffect(() => {
    fetchHomeStats();

    // Set up subscription for real-time updates
    const channel = supabase
      .channel('home-stats-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'uploads' 
      }, () => {
        fetchHomeStats();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'polling_stations' 
      }, () => {
        fetchHomeStats();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'candidates' 
      }, () => {
        fetchHomeStats();
      })
      .subscribe();
      
    // Also set up a periodic refresh as backup
    const refreshInterval = setInterval(() => {
      fetchHomeStats();
    }, 15000);
    
    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchHomeStats = async () => {
    try {
      // Get total number of polling stations
      const { count: totalStations } = await supabase
        .from('polling_stations')
        .select('*', { count: 'exact', head: true });
      
      // Get uploads that have results associated with them
      const { data: uploads } = await supabase
        .from('uploads')
        .select('id, station_id');
      
      // Filter to get unique station IDs with valid results
      const validStationIds = new Set();
      
      if (uploads && uploads.length > 0) {
        // For each upload, check if it has any results
        for (const upload of uploads) {
          const { count } = await supabase
            .from('results')
            .select('*', { count: 'exact', head: true })
            .eq('upload_id', upload.id);
            
          if (count && count > 0 && upload.station_id) {
            validStationIds.add(upload.station_id);
          }
        }
      }
      
      // Get distinct district counts
      const { data: districtsData } = await supabase
        .from('polling_stations')
        .select('district');
      
      const uniqueDistricts = new Set();
      if (districtsData) {
        districtsData.forEach(station => {
          if (station.district) uniqueDistricts.add(station.district);
        });
      }
      
      // Get candidate count
      const { data: candidates } = await supabase
        .from('candidates')
        .select('id');
      
      const candidateCount = candidates ? candidates.length : 0;
      
      setStats({
        stationsSubmitted: validStationIds.size,
        totalStations: totalStations || 10,
        districtsCount: uniqueDistricts.size || 5,
        candidatesCount: candidateCount
      });
      
      console.log("Home stats updated:", {
        stationsSubmitted: validStationIds.size, 
        totalStations,
        districtsCount: uniqueDistricts.size,
        candidatesCount: candidateCount
      });
    } catch (error) {
      console.error('Error fetching home stats:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-10 py-10">
      {/* Hero section */}
      <div className="glass-container max-w-3xl w-full text-center space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold">
          Welcome to <span className="text-purple-dark">VoteSnap</span>
        </h1>
        <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
          A lightweight, mobile-friendly platform for capturing, verifying, 
          and analyzing election results in real-time.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button className="glass-button" size="lg" asChild>
            <Link to="/agent">Field Agent Portal</Link>
          </Button>
          <Button variant="outline" size="lg" className="bg-white/50 backdrop-blur-sm border-white/50" asChild>
            <Link to="/admin">Admin Dashboard</Link>
          </Button>
        </div>
      </div>
      
      {/* Stats overview */}
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-container text-center">
            <h3 className="text-xl font-medium mb-2">Stations</h3>
            <p className="text-3xl font-bold text-purple-dark">{stats.stationsSubmitted} / {stats.totalStations}</p>
            <p className="text-sm text-foreground/70 mt-1">Results Submitted</p>
          </div>
          
          <div className="glass-container text-center">
            <h3 className="text-xl font-medium mb-2">Districts</h3>
            <p className="text-3xl font-bold text-purple-dark">{stats.districtsCount}</p>
            <p className="text-sm text-foreground/70 mt-1">Being Monitored</p>
          </div>
          
          <div className="glass-container text-center">
            <h3 className="text-xl font-medium mb-2">Candidates</h3>
            <p className="text-3xl font-bold text-purple-dark">{stats.candidatesCount}</p>
            <p className="text-sm text-foreground/70 mt-1">In Current Election</p>
          </div>
        </div>
      </div>
      
      {/* How it works */}
      <div className="glass-container max-w-4xl w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-purple flex items-center justify-center mb-4">
              <span className="font-bold text-white text-lg">1</span>
            </div>
            <h3 className="text-lg font-medium mb-2">Upload DR Form</h3>
            <p className="text-foreground/80">Field agents capture and upload images of Declaration of Results forms.</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-purple flex items-center justify-center mb-4">
              <span className="font-bold text-white text-lg">2</span>
            </div>
            <h3 className="text-lg font-medium mb-2">Verify Results</h3>
            <p className="text-foreground/80">OCR extracts data, agents verify and correct it before submission.</p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-purple flex items-center justify-center mb-4">
              <span className="font-bold text-white text-lg">3</span>
            </div>
            <h3 className="text-lg font-medium mb-2">Real-time Analysis</h3>
            <p className="text-foreground/80">Admins view live results, charts, and detailed reporting.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
