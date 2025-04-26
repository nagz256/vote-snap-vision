
import { createContext, useState, useContext, ReactNode } from "react";
import { 
  pollingStations, 
  candidates, 
  completeUploads, 
  Upload, 
  ExtractedResult,
  getUploadedStationIds,
  getTotalVotesPerCandidate,
  simulateOCR
} from "@/data/mockData";

interface VoteSnapContextType {
  uploads: Upload[];
  isAdmin: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  addUpload: (upload: Omit<Upload, "id" | "timestamp">, results: ExtractedResult[]) => void;
  getAvailableStations: () => typeof pollingStations;
  getTotalVotes: () => Array<{ name: string; votes: number }>;
  processDRForm: (imageUrl: string) => Promise<ExtractedResult[]>;
}

const VoteSnapContext = createContext<VoteSnapContextType | undefined>(undefined);

export const VoteSnapProvider = ({ children }: { children: ReactNode }) => {
  const [uploads, setUploads] = useState<Upload[]>(completeUploads);
  const [isAdmin, setIsAdmin] = useState(false);

  const login = (username: string, password: string) => {
    // In a real app, this would validate against the backend
    if (username === "admin" && password === "password123") {
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
  };

  const addUpload = (
    uploadData: Omit<Upload, "id" | "timestamp">,
    results: ExtractedResult[]
  ) => {
    const newUpload: Upload = {
      ...uploadData,
      id: uploads.length + 1,
      timestamp: new Date().toISOString(),
      results: results,
      station: pollingStations.find(station => station.id === uploadData.stationId)
    };

    setUploads(prev => [...prev, newUpload]);
  };

  const getAvailableStations = () => {
    const uploadedStationIds = getUploadedStationIds();
    return pollingStations.filter(station => !uploadedStationIds.includes(station.id));
  };

  const getTotalVotes = () => {
    return getTotalVotesPerCandidate();
  };

  const processDRForm = async (imageUrl: string) => {
    return await simulateOCR(imageUrl);
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
        processDRForm
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
