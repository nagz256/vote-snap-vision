
import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ExtractedResult } from "@/data/mockData";
import { toast } from "sonner";

interface VoterStatistics {
  maleVoters: number;
  femaleVoters: number;
  wastedBallots: number;
  totalVoters: number;
}

interface VoteSnapContextType {
  uploads: Upload[];
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUpload: (upload: Omit<Upload, "id" | "timestamp"> & { voterStatistics?: VoterStatistics }, results: ExtractedResult[]) => Promise<void>;
  getAvailableStations: () => Promise<any[]>;
  refreshAvailableStations: () => Promise<void>;
  getTotalVotes: () => Promise<Array<{ name: string; votes: number }>>;
  processDRForm: (imageUrl: string) => Promise<{
    results: ExtractedResult[];
    voterStats?: VoterStatistics;
    success: boolean;
    error?: string;
  }>;
  getVotesByGender: () => Promise<{ male: number; female: number; total: number }>;
  resetData: () => Promise<void>;
}

const VoteSnapContext = createContext<VoteSnapContextType | undefined>(undefined);

export const VoteSnapProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [availableStations, setAvailableStations] = useState<any[]>([]);

  useEffect(() => {
    // Clear any incorrect data on app start
    if (isAdmin) {
      fetchUploads();
      
      // Set up real-time subscription for uploads
      const channel = supabase
        .channel('real-time-updates')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'uploads' 
        }, () => {
          console.log("Uploads changed, refreshing data");
          fetchUploads();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'results' 
        }, () => {
          console.log("Results changed, refreshing data");
          fetchUploads();
        })
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'voter_statistics' 
        }, () => {
          console.log("Voter statistics changed, refreshing data");
          fetchUploads();
        })
        .subscribe();
      
      // Set up periodic refresh as a backup
      const refreshInterval = setInterval(() => {
        fetchUploads();
      }, 2000);
      
      return () => {
        supabase.removeChannel(channel);
        clearInterval(refreshInterval);
      };
    }
  }, [isAdmin]);

  const fetchUploads = async () => {
    try {
      const { data: uploadsData, error } = await supabase
        .from('uploads')
        .select(`
          id,
          image_path,
          station_id,
          timestamp,
          polling_stations (
            id,
            name,
            district
          )
        `);

      if (error) {
        console.error("Error fetching uploads:", error);
        return;
      }

      // Check if we have any uploads at all
      if (!uploadsData || uploadsData.length === 0) {
        setUploads([]);
        console.log("No uploads found");
        return;
      }

      const uploadsWithResults = await Promise.all(
        uploadsData.map(async (upload) => {
          const { data: resultsData } = await supabase
            .from('results')
            .select(`
              votes,
              candidates (
                id,
                name
              )
            `)
            .eq('upload_id', upload.id);

          // Only include uploads that have results
          const formattedResults = resultsData?.map(result => ({
            candidateName: result.candidates.name,
            votes: result.votes
          })) || [];

          return {
            id: upload.id,
            stationId: upload.station_id,
            imagePath: upload.image_path,
            timestamp: upload.timestamp,
            station: upload.polling_stations,
            results: formattedResults
          } as Upload;
        })
      );

      // Filter out uploads that don't have a valid station or have empty results
      const validUploads = uploadsWithResults
        .filter(upload => upload.station && upload.station.name)
        .filter(upload => upload.results && upload.results.length > 0);
      
      setUploads(validUploads);
      console.log("Valid uploads fetched:", validUploads);
    } catch (error) {
      console.error("Error in fetchUploads:", error);
      setUploads([]);
    }
  };

  const login = (username: string, password: string) => {
    if (username === "admin" && password === "password123") {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
  };

  const refreshAvailableStations = async () => {
    try {
      const stations = await getAvailableStations();
      setAvailableStations(stations);
    } catch (error) {
      console.error("Error refreshing available stations:", error);
    }
  };

  const resetData = async () => {
    try {
      console.log("Resetting all data...");
      
      // Delete all results first due to foreign key constraints
      const { error: resultsError } = await supabase
        .from('results')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (resultsError) {
        console.error("Error deleting results:", resultsError);
        throw resultsError;
      }
      
      // Delete all voter statistics
      const { error: statsError } = await supabase
        .from('voter_statistics')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (statsError) {
        console.error("Error deleting voter statistics:", statsError);
        throw statsError;
      }
      
      // Delete all uploads
      const { error: uploadsError } = await supabase
        .from('uploads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
      
      if (uploadsError) {
        console.error("Error deleting uploads:", uploadsError);
        throw uploadsError;
      }
      
      // Reset local state
      setUploads([]);
      
      // Refresh stations
      await refreshAvailableStations();
      
      toast.success("All data has been reset successfully.");
      
      return true;
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Failed to reset data. Please try again.");
      return false;
    }
  };

  const addUpload = async (
    uploadData: { 
      stationId: string; 
      imagePath: string;
      voterStatistics?: VoterStatistics;
    },
    results: ExtractedResult[]
  ) => {
    try {
      console.log("Adding upload with data:", uploadData);
      const { data: upload, error: uploadError } = await supabase
        .from('uploads')
        .insert([{
          station_id: uploadData.stationId,
          image_path: uploadData.imagePath,
        }])
        .select()
        .single();

      if (uploadError) {
        console.error("Upload insertion error:", uploadError);
        throw uploadError;
      }

      console.log("Upload created:", upload);

      // Add voter statistics if provided
      if (uploadData.voterStatistics) {
        const { error: voterStatsError } = await supabase
          .from('voter_statistics')
          .insert({
            upload_id: upload.id,
            station_id: uploadData.stationId,
            male_voters: uploadData.voterStatistics.maleVoters,
            female_voters: uploadData.voterStatistics.femaleVoters,
            wasted_ballots: uploadData.voterStatistics.wastedBallots,
            total_voters: uploadData.voterStatistics.totalVoters,
          });

        if (voterStatsError) {
          console.error("Voter statistics insertion error:", voterStatsError);
          throw voterStatsError;
        }
      }

      for (const result of results) {
        console.log("Processing result for candidate:", result.candidateName);
        const { data: candidate, error: candidateError } = await supabase
          .from('candidates')
          .upsert([{ name: result.candidateName }], { onConflict: 'name' })
          .select()
          .single();

        if (candidateError) {
          console.error("Candidate upsert error:", candidateError);
          throw candidateError;
        }

        if (candidate) {
          console.log("Inserting result for candidate:", candidate.id, "votes:", result.votes);
          const { error: resultError } = await supabase
            .from('results')
            .insert([{
              upload_id: upload.id,
              candidate_id: candidate.id,
              votes: result.votes,
            }]);

          if (resultError) {
            console.error("Result insertion error:", resultError);
            throw resultError;
          }
        }
      }

      if (isAdmin) {
        await fetchUploads();
      }
    } catch (error) {
      console.error("Error adding upload:", error);
      throw error;
    }
  };

  const getAvailableStations = async () => {
    try {
      console.log("Fetching available stations");
      const { data: submittedStations, error: submittedError } = await supabase
        .from('uploads')
        .select('station_id');

      if (submittedError) {
        console.error("Error fetching submitted stations:", submittedError);
        throw submittedError;
      }

      // Get all stations whether they've been submitted or not
      const { data: allStations, error: allError } = await supabase
        .from('polling_stations')
        .select('*')
        .order('name', { ascending: true });
        
      if (allError) {
        console.error("Error fetching all stations:", allError);
        throw allError;
      }
      
      console.log("All stations:", allStations);
      
      if (!submittedStations || submittedStations.length === 0) {
        console.log("No submitted stations found, returning all stations");
        return allStations || [];
      }

      // Get unique station IDs that have been submitted
      const submittedIds = [...new Set(submittedStations.map(s => s.station_id))];
      console.log("Submitted station IDs:", submittedIds);

      // Filter out submitted stations if specified
      const availableStations = allStations.filter(station => 
        !submittedIds.includes(station.id)
      );

      console.log("Available stations after filtering:", availableStations);
      return availableStations || [];
    } catch (error) {
      console.error("Error in getAvailableStations:", error);
      return [];
    }
  };

  const getTotalVotes = async () => {
    try {
      const { data: results, error } = await supabase
        .from('results')
        .select(`
          votes,
          candidates (
            name
          )
        `);
        
      if (error) {
        console.error("Error fetching results:", error);
        return [];
      }
      
      if (!results || results.length === 0) {
        console.log("No results found in the database");
        return [];
      }

      // Filter out any invalid results
      const validResults = results.filter(result => 
        result.candidates && 
        result.candidates.name && 
        typeof result.votes === 'number'
      );
      
      if (validResults.length === 0) {
        console.log("No valid results found");
        return [];
      }

      const totalVotes: Record<string, number> = {};
      validResults.forEach(result => {
        const candidateName = result.candidates.name;
        totalVotes[candidateName] = (totalVotes[candidateName] || 0) + result.votes;
      });

      const formattedResults = Object.entries(totalVotes).map(([name, votes]) => ({ name, votes }));
      console.log("Total votes formatted:", formattedResults);
      return formattedResults;
    } catch (error) {
      console.error("Error getting total votes:", error);
      return [];
    }
  };

  const getVotesByGender = async () => {
    try {
      // Get data directly from voter_statistics table
      const { data: voterStats, error } = await supabase
        .from('voter_statistics')
        .select(`
          male_voters,
          female_voters,
          total_voters
        `);
        
      if (error) throw error;
      
      if (!voterStats || voterStats.length === 0) {
        console.log("No voter statistics found");
        return { male: 0, female: 0, total: 0 };
      }
      
      // Sum up the values across all polling stations
      const totals = voterStats.reduce((acc, stat) => {
        return {
          male: acc.male + (stat.male_voters || 0),
          female: acc.female + (stat.female_voters || 0),
          total: acc.total + (stat.total_voters || 0)
        };
      }, { male: 0, female: 0, total: 0 });
      
      return totals;
    } catch (error) {
      console.error("Error getting votes by gender:", error);
      return { male: 0, female: 0, total: 0 };
    }
  };

  const processDRForm = async (imageUrl: string): Promise<{
    results: ExtractedResult[];
    voterStats?: VoterStatistics;
    success: boolean;
    error?: string;
  }> => {
    try {
      const { data, error } = await supabase.functions.invoke('process-dr-form', {
        body: { imageUrl },
      });

      if (error) {
        console.error("Error processing DR form:", error);
        toast.error("Failed to process the image. Please try taking a clearer photo.");
        return { 
          results: [], 
          success: false, 
          error: error.message || "Failed to process the image" 
        };
      }
      
      if (!data || !data.results || data.results.length === 0) {
        toast.error("No results could be extracted. Please take a clearer photo or enter results manually.");
        return { 
          results: [], 
          success: false, 
          error: "No results could be extracted" 
        };
      }
      
      // Filter out any results that might be voter statistics mistakenly extracted as candidates
      const filteredResults = data.results.filter(result => 
        !result.candidateName.toLowerCase().includes('male') && 
        !result.candidateName.toLowerCase().includes('female') &&
        !result.candidateName.toLowerCase().includes('waste') &&
        !result.candidateName.toLowerCase().includes('ballot') &&
        !result.candidateName.toLowerCase().includes('total')
      );
      
      console.log("Filtered OCR results:", filteredResults);
      
      return {
        results: filteredResults.length > 0 ? filteredResults : [],
        voterStats: data.voterStats,
        success: filteredResults.length > 0,
        error: filteredResults.length === 0 ? "Could not identify candidate results" : undefined
      };
    } catch (error: any) {
      console.error("Error in processDRForm:", error);
      toast.error("Error processing the image. Please try again or enter results manually.");
      return { 
        results: [],
        success: false,
        error: error.message || "Error processing the image" 
      };
    }
  };

  return (
    <VoteSnapContext.Provider
      value={{
        uploads,
        isAdmin,
        login,
        logout,
        addUpload,
        getAvailableStations,
        refreshAvailableStations,
        getTotalVotes,
        processDRForm,
        getVotesByGender,
        resetData
      }}
    >
      {children}
    </VoteSnapContext.Provider>
  );
};

export const useVoteSnap = () => {
  const context = useContext(VoteSnapContext);
  if (context === undefined) {
    throw new Error("useVoteSnap must be used within a VoteSnapProvider");
  }
  return context;
};
