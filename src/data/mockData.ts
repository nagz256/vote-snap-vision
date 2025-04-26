
export interface PollingStation {
  id: string;
  name: string;
  district: string;
}

export interface Candidate {
  id: string;
  name: string;
}

export interface Result {
  id: string;
  uploadId: string;
  candidateId: string;
  votes: number;
}

export interface Upload {
  id: string;
  stationId: string;
  imagePath: string;
  timestamp: string;
  station?: PollingStation;
  results?: ExtractedResult[];
}

export interface ExtractedResult {
  candidateName: string;
  votes: number;
}

// The remaining mock data matches the original format but with string IDs instead of numbers
export const pollingStations: PollingStation[] = [
  { id: "1", name: "Central Primary School", district: "Eastern District" },
  { id: "2", name: "Grace Community Center", district: "Western District" },
  { id: "3", name: "St. Mary's Church Hall", district: "Northern District" },
  { id: "4", name: "Oakwood High School", district: "Southern District" },
  { id: "5", name: "Riverside Community Hall", district: "Eastern District" },
  { id: "6", name: "Hill View Academy", district: "Western District" },
  { id: "7", name: "Liberty Town Hall", district: "Central District" },
  { id: "8", name: "Sunset Village Center", district: "Northern District" },
  { id: "9", name: "Greenmount Library", district: "Southern District" },
  { id: "10", name: "Victory Sports Center", district: "Central District" },
];

export const candidates: Candidate[] = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Smith" },
  { id: "3", name: "Michael Johnson" },
  { id: "4", name: "Emily Williams" },
];

export const results: Result[] = [
  { id: "1", uploadId: "1", candidateId: "1", votes: 234 },
  { id: "2", uploadId: "1", candidateId: "2", votes: 189 },
  { id: "3", uploadId: "1", candidateId: "3", votes: 167 },
  { id: "4", uploadId: "1", candidateId: "4", votes: 122 },
  { id: "5", uploadId: "2", candidateId: "1", votes: 112 },
  { id: "6", uploadId: "2", candidateId: "2", votes: 145 },
  { id: "7", uploadId: "2", candidateId: "3", votes: 98 },
  { id: "8", uploadId: "2", candidateId: "4", votes: 78 },
  { id: "9", uploadId: "3", candidateId: "1", votes: 178 },
  { id: "10", uploadId: "3", candidateId: "2", votes: 166 },
  { id: "11", uploadId: "3", candidateId: "3", votes: 143 },
  { id: "12", uploadId: "3", candidateId: "4", votes: 101 },
];

export const uploads: Upload[] = [
  { 
    id: "1", 
    stationId: "1", 
    imagePath: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800", 
    timestamp: "2025-04-26T09:15:32Z"
  },
  { 
    id: "2", 
    stationId: "2", 
    imagePath: "https://images.unsplash.com/photo-1602341589261-2c38dc0b4dda?w=800", 
    timestamp: "2025-04-26T10:23:18Z"
  },
  { 
    id: "3", 
    stationId: "5", 
    imagePath: "https://images.unsplash.com/photo-1587393855524-087f83d95bc9?w=800", 
    timestamp: "2025-04-26T11:42:05Z"
  },
];

// Add station info to uploads
export const uploadsWithStations = uploads.map(upload => {
  const station = pollingStations.find(station => station.id === upload.stationId);
  return {
    ...upload,
    station
  };
});

// Add results to uploads
export const completeUploads = uploadsWithStations.map(upload => {
  const uploadResults = results
    .filter(result => result.uploadId === upload.id)
    .map(result => {
      const candidate = candidates.find(c => c.id === result.candidateId);
      return {
        candidateName: candidate?.name || "Unknown",
        votes: result.votes
      };
    });
  
  return {
    ...upload,
    results: uploadResults
  };
});

// Authentication data
export const adminUser = {
  username: "admin",
  password: "password123"
};

// Function to simulate OCR processing
export const simulateOCR = (imageUrl: string): Promise<ExtractedResult[]> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      // Randomly generate results
      const extractedResults = candidates.map(candidate => ({
        candidateName: candidate.name,
        votes: Math.floor(Math.random() * 300) + 50
      }));
      
      resolve(extractedResults);
    }, 2000);
  });
};

// Function to get total votes per candidate across all stations
export const getTotalVotesPerCandidate = () => {
  return candidates.map(candidate => {
    const candidateResults = results.filter(result => result.candidateId === candidate.id);
    const totalVotes = candidateResults.reduce((sum, result) => sum + result.votes, 0);
    
    return {
      name: candidate.name,
      votes: totalVotes
    };
  });
};

// Get uploaded stations IDs
export const getUploadedStationIds = () => {
  return uploads.map(upload => upload.stationId);
};
