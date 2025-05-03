
import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { query, insertQuery } from "@/integrations/mysql/client";
import { Upload, ExtractedResult } from "@/data/mockData";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

<lov-add-dependency>uuid@latest</lov-add-dependency>

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
      
      // Set up periodic refresh as a backup
      const refreshInterval = setInterval(() => {
        fetchUploads();
      }, 2000);
      
      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [isAdmin]);

  const fetchUploads = async () => {
    try {
      const uploadsData = await query(`
        SELECT u.id, u.image_path, u.station_id, u.timestamp, 
               p.id as polling_station_id, p.name as polling_station_name, p.district
        FROM uploads u
        JOIN polling_stations p ON u.station_id = p.id
      `);

      // Check if we have any uploads at all
      if (!uploadsData || uploadsData.length === 0) {
        setUploads([]);
        console.log("No uploads found");
        return;
      }

      const uploadsWithResults = await Promise.all(
        uploadsData.map(async (upload: any) => {
          const resultsData = await query(`
            SELECT r.votes, c.id as candidate_id, c.name as candidate_name
            FROM results r
            JOIN candidates c ON r.candidate_id = c.id
            WHERE r.upload_id = ?
          `, [upload.id]);

          // Only include uploads that have results
          const formattedResults = resultsData?.map((result: any) => ({
            candidateName: result.candidate_name,
            votes: result.votes
          })) || [];

          return {
            id: upload.id,
            stationId: upload.station_id,
            imagePath: upload.image_path,
            timestamp: upload.timestamp,
            station: {
              id: upload.polling_station_id,
              name: upload.polling_station_name,
              district: upload.district
            },
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

  const resetData = async (): Promise<void> => {
    try {
      console.log("Resetting all data...");
      
      // Delete all results first due to foreign key constraints
      await query('DELETE FROM results WHERE 1=1');
      
      // Delete all voter statistics
      await query('DELETE FROM voter_statistics WHERE 1=1');
      
      // Delete all uploads
      await query('DELETE FROM uploads WHERE 1=1');
      
      // Reset local state
      setUploads([]);
      
      // Refresh stations
      await refreshAvailableStations();
      
      toast.success("All data has been reset successfully.");
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Failed to reset data. Please try again.");
      throw error;
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

      // Insert the upload
      const { id: uploadId } = await insertQuery(
        'INSERT INTO uploads (id, station_id, image_path) VALUES (?, ?, ?)',
        [uuidv4(), uploadData.stationId, uploadData.imagePath]
      );

      console.log("Upload created with ID:", uploadId);

      // Add voter statistics if provided
      if (uploadData.voterStatistics) {
        await query(
          'INSERT INTO voter_statistics (id, upload_id, station_id, male_voters, female_voters, wasted_ballots, total_voters) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            uuidv4(),
            uploadId,
            uploadData.stationId,
            uploadData.voterStatistics.maleVoters,
            uploadData.voterStatistics.femaleVoters,
            uploadData.voterStatistics.wastedBallots,
            uploadData.voterStatistics.totalVoters
          ]
        );
      }

      for (const result of results) {
        console.log("Processing result for candidate:", result.candidateName);
        
        // Check if candidate exists, if not create it
        const candidateResults = await query('SELECT id FROM candidates WHERE name = ?', [result.candidateName]);
        
        let candidateId;
        if (candidateResults.length === 0) {
          const { id } = await insertQuery('INSERT INTO candidates (id, name) VALUES (?, ?)', [uuidv4(), result.candidateName]);
          candidateId = id;
        } else {
          candidateId = candidateResults[0].id;
        }

        console.log("Inserting result for candidate:", candidateId, "votes:", result.votes);
        await query(
          'INSERT INTO results (id, upload_id, candidate_id, votes) VALUES (?, ?, ?, ?)',
          [uuidv4(), uploadId, candidateId, result.votes]
        );
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
      
      // Get IDs of stations that have already been submitted
      const submittedStations = await query('SELECT DISTINCT station_id FROM uploads');
      
      // Get all stations whether they've been submitted or not
      const allStations = await query('SELECT * FROM polling_stations ORDER BY name ASC');
        
      console.log("All stations:", allStations);
      
      if (!submittedStations || submittedStations.length === 0) {
        console.log("No submitted stations found, returning all stations");
        return allStations || [];
      }

      // Get unique station IDs that have been submitted
      const submittedIds = [...new Set(submittedStations.map((s: any) => s.station_id))];
      console.log("Submitted station IDs:", submittedIds);

      // Filter out submitted stations if specified
      const availableStations = allStations.filter((station: any) => 
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
      const results = await query(`
        SELECT r.votes, c.name
        FROM results r
        JOIN candidates c ON r.candidate_id = c.id
      `);
        
      if (!results || results.length === 0) {
        console.log("No results found in the database");
        return [];
      }

      // Filter out any invalid results
      const validResults = results.filter((result: any) => 
        result.name && 
        typeof result.votes === 'number'
      );
      
      if (validResults.length === 0) {
        console.log("No valid results found");
        return [];
      }

      const totalVotes: Record<string, number> = {};
      validResults.forEach((result: any) => {
        const candidateName = result.name;
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
      const voterStats = await query(`
        SELECT male_voters, female_voters, total_voters
        FROM voter_statistics
      `);
        
      if (!voterStats || voterStats.length === 0) {
        console.log("No voter statistics found");
        return { male: 0, female: 0, total: 0 };
      }
      
      // Sum up the values across all polling stations
      const totals = voterStats.reduce((acc: any, stat: any) => {
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
      // This would normally call an API to process the image
      // For now, we'll return mock data
      const mockResults = [
        { candidateName: "John Doe", votes: 120 },
        { candidateName: "Jane Smith", votes: 85 },
        { candidateName: "Michael Johnson", votes: 95 }
      ];
      
      const mockVoterStats = {
        maleVoters: 150,
        femaleVoters: 170,
        wastedBallots: 20,
        totalVoters: 340
      };
      
      return {
        results: mockResults,
        voterStats: mockVoterStats,
        success: true
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
