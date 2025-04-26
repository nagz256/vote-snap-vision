
import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ExtractedResult } from "@/data/mockData";

interface VoteSnapContextType {
  uploads: Upload[];
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUpload: (upload: Omit<Upload, "id" | "timestamp">, results: ExtractedResult[]) => Promise<void>;
  getAvailableStations: () => Promise<any[]>;
  getTotalVotes: () => Promise<Array<{ name: string; votes: number }>>;
  processDRForm: (imageUrl: string) => Promise<ExtractedResult[]>;
  getVotesByGender: () => Promise<{ male: number; female: number; total: number }>;
}

const VoteSnapContext = createContext<VoteSnapContextType | undefined>(undefined);

export const VoteSnapProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);

  // Fetch uploads when admin logs in
  useEffect(() => {
    if (isAdmin) {
      fetchUploads();
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

      // For each upload, fetch its results
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

      setUploads(uploadsWithResults);
    } catch (error) {
      console.error("Error in fetchUploads:", error);
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

  const addUpload = async (
    uploadData: { stationId: string; imagePath: string },
    results: ExtractedResult[]
  ) => {
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert([{
        station_id: uploadData.stationId,
        image_path: uploadData.imagePath,
      }])
      .select()
      .single();

    if (uploadError) throw uploadError;

    // Insert or get candidates
    for (const result of results) {
      // Try to insert candidate, ignore if already exists
      const { data: candidate } = await supabase
        .from('candidates')
        .upsert([{ name: result.candidateName }], { onConflict: 'name' })
        .select()
        .single();

      if (candidate) {
        // Insert results
        await supabase
          .from('results')
          .insert([{
            upload_id: upload.id,
            candidate_id: candidate.id,
            votes: result.votes,
          }]);
      }
    }

    // Refresh uploads if admin is logged in
    if (isAdmin) {
      fetchUploads();
    }
  };

  const getAvailableStations = async () => {
    try {
      const { data: submittedStations } = await supabase
        .from('uploads')
        .select('station_id');

      // Handle case where no stations have been submitted yet
      if (!submittedStations || submittedStations.length === 0) {
        const { data: allStations } = await supabase
          .from('polling_stations')
          .select('*');
        return allStations || [];
      }

      const submittedIds = submittedStations.map(s => s.station_id);

      const { data: stations } = await supabase
        .from('polling_stations')
        .select('*')
        .not('id', 'in', `(${submittedIds.join(',')})`);

      return stations || [];
    } catch (error) {
      console.error("Error fetching available stations:", error);
      return [];
    }
  };

  const getTotalVotes = async () => {
    try {
      const { data: results } = await supabase
        .from('results')
        .select(`
          votes,
          candidates (
            name
          )
        `);

      const totalVotes: Record<string, number> = {};
      results?.forEach(result => {
        const candidateName = result.candidates.name;
        totalVotes[candidateName] = (totalVotes[candidateName] || 0) + result.votes;
      });

      return Object.entries(totalVotes).map(([name, votes]) => ({ name, votes }));
    } catch (error) {
      console.error("Error getting total votes:", error);
      return [];
    }
  };

  const getVotesByGender = async () => {
    try {
      // This is a simplified approach. In a real app, you'd have gender info in your database
      // For demo purposes, we'll use a naming convention
      const { data: results } = await supabase
        .from('results')
        .select(`
          votes,
          candidates (
            name
          )
        `);
        
      let maleVotes = 0;
      let femaleVotes = 0;
      
      results?.forEach(result => {
        const candidateName = result.candidates?.name.toLowerCase() || "";
        // Mock logic: names with 'john' or 'michael' are counted as male voters
        if (candidateName.includes('john') || candidateName.includes('michael')) {
          maleVotes += result.votes;
        } 
        // Mock logic: names with 'jane' or 'emily' are counted as female voters
        else if (candidateName.includes('jane') || candidateName.includes('emily')) {
          femaleVotes += result.votes;
        }
        // For other names, distribute evenly
        else {
          maleVotes += Math.round(result.votes / 2);
          femaleVotes += result.votes - Math.round(result.votes / 2);
        }
      });
      
      return {
        male: maleVotes,
        female: femaleVotes,
        total: maleVotes + femaleVotes
      };
    } catch (error) {
      console.error("Error getting votes by gender:", error);
      return { male: 0, female: 0, total: 0 };
    }
  };

  const processDRForm = async (imageUrl: string): Promise<ExtractedResult[]> => {
    const { data, error } = await supabase.functions.invoke('process-dr-form', {
      body: { imageUrl },
    });

    if (error) throw error;
    return data.results;
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
        getTotalVotes,
        processDRForm,
        getVotesByGender
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
