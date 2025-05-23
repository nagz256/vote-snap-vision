
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase, hasError, safeData } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Home = () => {
  const [stats, setStats] = useState({
    stationsSubmitted: 0,
    totalStations: 0,
    districtsCount: 0,
    candidatesCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHomeStats();
    
    // Set up a periodic refresh
    const refreshInterval = setInterval(() => {
      fetchHomeStats();
    }, 15000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchHomeStats = async () => {
    try {
      setIsLoading(true);
      
      // Get total stations from Supabase
      const { data: stationsData, error: stationsError } = await supabase
        .from('polling_stations')
        .select('id');
        
      if (stationsError) {
        console.error("Error fetching stations:", stationsError);
        throw stationsError;
      }
      
      const totalStations = stationsData ? stationsData.length : 0;
      
      // Get unique districts
      const { data: districtsData, error: districtsError } = await supabase
        .from('polling_stations')
        .select('district')
        .order('district');
        
      if (districtsError) {
        console.error("Error fetching districts:", districtsError);
        throw districtsError;
      }
      
      // Get unique districts with Set
      const uniqueDistricts = new Set();
      if (districtsData) {
        districtsData.forEach(item => {
          if (item && typeof item === 'object' && 'district' in item && item.district) {
            uniqueDistricts.add(item.district);
          }
        });
      }
      
      // Get uploads to determine submitted stations
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('uploads')
        .select('station_id');
        
      if (uploadsError) {
        console.error("Error fetching uploads:", uploadsError);
        throw uploadsError;
      }
      
      const submittedStationIds = new Set();
      if (uploadsData) {
        uploadsData.forEach(upload => {
          if (upload && typeof upload === 'object' && 'station_id' in upload && upload.station_id) {
            submittedStationIds.add(upload.station_id);
          }
        });
      }
      
      // Get candidate count
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('id');
        
      if (candidatesError) {
        console.error("Error fetching candidates:", candidatesError);
        throw candidatesError;
      }
      
      const candidatesCount = candidatesData ? candidatesData.length : 0;
      
      setStats({
        stationsSubmitted: submittedStationIds.size,
        totalStations: totalStations,
        districtsCount: uniqueDistricts.size,
        candidatesCount: candidatesCount
      });
      
      console.log("Home stats updated:", {
        stationsSubmitted: submittedStationIds.size, 
        totalStations,
        districtsCount: uniqueDistricts.size,
        candidatesCount
      });
      
    } catch (error) {
      console.error('Error fetching home stats:', error);
      toast.error("Failed to fetch statistics");
    } finally {
      setIsLoading(false);
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
            {isLoading ? (
              <div className="flex justify-center py-2">
                <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <p className="text-3xl font-bold text-purple-dark">{stats.stationsSubmitted} / {stats.totalStations}</p>
            )}
            <p className="text-sm text-foreground/70 mt-1">Results Submitted</p>
          </div>
          
          <div className="glass-container text-center">
            <h3 className="text-xl font-medium mb-2">Districts</h3>
            {isLoading ? (
              <div className="flex justify-center py-2">
                <div className="animate-pulse h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <p className="text-3xl font-bold text-purple-dark">{stats.districtsCount}</p>
            )}
            <p className="text-sm text-foreground/70 mt-1">Being Monitored</p>
          </div>
          
          <div className="glass-container text-center">
            <h3 className="text-xl font-medium mb-2">Candidates</h3>
            {isLoading ? (
              <div className="flex justify-center py-2">
                <div className="animate-pulse h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <p className="text-3xl font-bold text-purple-dark">{stats.candidatesCount}</p>
            )}
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
