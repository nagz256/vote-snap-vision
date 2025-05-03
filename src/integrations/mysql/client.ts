
// Mock MySQL client for browser environments
// In a real application, this would make API calls to a backend service

// Type definitions
export interface QueryResult<T = any> {
  id?: string;
  [key: string]: any;
}

// Mock data to simulate database
const mockDatabase = {
  uploads: [],
  results: [],
  polling_stations: [],
  candidates: [],
  voter_statistics: []
};

// Helper function to execute queries (simulated)
export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  console.log('Query executed:', sql, params);
  
  // In a real app, this would be an API call to a backend service
  // For now, we'll return mock data based on the query
  
  if (sql.includes('COUNT') && sql.includes('polling_stations')) {
    return [{ count: 120 }] as unknown as T[];
  }
  
  if (sql.includes('uploads')) {
    return mockDatabase.uploads as unknown as T[];
  }
  
  if (sql.includes('results')) {
    if (sql.includes('SUM')) {
      return [{ totalVotes: 1250 }] as unknown as T[];
    }
    return mockDatabase.results as unknown as T[];
  }
  
  if (sql.includes('voter_statistics')) {
    return [{ 
      totalMale: 680, 
      totalFemale: 570, 
      totalVoters: 1250, 
      wastedBallots: 45 
    }] as unknown as T[];
  }
  
  if (sql.includes('candidates')) {
    return mockDatabase.candidates as unknown as T[];
  }
  
  // Default empty response
  return [] as unknown as T[];
}

// Specialized query for when we want to get the inserted ID
export async function insertQuery<T>(sql: string, params: any[] = []): Promise<{ id: string; affectedRows: number }> {
  console.log('Insert executed:', sql, params);
  
  // Generate a mock ID
  const mockId = Math.random().toString(36).substring(2, 15);
  
  // In a real app, this would make an API call to insert data
  return {
    id: mockId,
    affectedRows: 1
  };
}
