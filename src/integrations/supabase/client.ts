
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://dhxrnvnawtviozxnvqks.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoeHJudm5hd3R2aW96eG52cWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NjgxNTMsImV4cCI6MjA2MTI0NDE1M30.ViVzlcSSj3a_bpxy7lEJeqaE5OA2kMuK7x-kM0nBKs8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    autoRefreshToken: true, // Auto refresh token for better persistence
    storageKey: 'supabase_auth' // Use storage key instead of deprecated persistSession
  },
});

// Valid table names for type-safety
export type ValidTableName = keyof Database['public']['Tables'];

// Helper function to check if Supabase response has error
export const hasError = (response: any): boolean => {
  return response && 'error' in response && response.error !== null;
};

// Helper function to safely access Supabase data
export const safeData = <T>(response: any): T[] => {
  if (hasError(response) || !response || !response.data) {
    return [];
  }
  return response.data as T[];
};

// Type-safe access to a single data item from response
export const safeDataSingle = <T>(response: any): T | null => {
  if (hasError(response) || !response || !response.data) {
    return null;
  }
  
  // Handle both single object and array responses
  if (Array.isArray(response.data) && response.data.length > 0) {
    return response.data[0] as T;
  }
  
  return response.data as T;
};

// Helper to safely get a property from a potentially erroneous response
export const safeProperty = <T, K extends keyof T>(obj: any, property: K, defaultValue?: T[K]): T[K] | undefined => {
  if (!obj || hasError(obj)) {
    return defaultValue;
  }
  
  // Handle both direct object and response with data property
  const target = obj.data ? obj.data : obj;
  
  if (typeof target === 'object' && property in target) {
    return target[property as string] as T[K];
  }
  
  return defaultValue;
};

// Get an ID safely from a response
export const safeId = (response: any): string | null => {
  if (hasError(response) || !response || !response.data) {
    return null;
  }
  
  if (Array.isArray(response.data) && response.data.length > 0) {
    return response.data[0]?.id || null;
  }
  
  return response.data?.id || null;
};

// Type-safe database insert functions
// Format data with the correct types for database inserts
export const formatUploadData = (data: { 
  station_id: string;
  image_path: string;
}): Database['public']['Tables']['uploads']['Insert'] => {
  return {
    station_id: data.station_id,
    image_path: data.image_path,
  };
};

export const formatVoterStatisticsData = (data: {
  upload_id: string;
  station_id: string;
  male_voters?: number;
  female_voters?: number;
  wasted_ballots?: number;
  total_voters?: number;
}): Database['public']['Tables']['voter_statistics']['Insert'] => {
  return {
    upload_id: data.upload_id,
    station_id: data.station_id,
    male_voters: data.male_voters ?? 0,
    female_voters: data.female_voters ?? 0,
    wasted_ballots: data.wasted_ballots ?? 0,
    total_voters: data.total_voters ?? 0,
  };
};

export const formatCandidateData = (name: string): Database['public']['Tables']['candidates']['Insert'] => {
  return { name };
};

export const formatResultData = (data: {
  upload_id: string;
  candidate_id: string;
  votes: number;
}): Database['public']['Tables']['results']['Insert'] => {
  return {
    upload_id: data.upload_id,
    candidate_id: data.candidate_id,
    votes: data.votes,
  };
};

// Better table column filter helpers (with proper typing)
export const createFilter = (column: string, operator: string, value: any) => {
  return { [column]: { [operator]: value } };
};

export const createEqFilter = (column: string, value: any) => {
  return createFilter(column, 'eq', value);
};

export const createMatchFilter = (obj: Record<string, any>) => {
  return obj;
};

// Safe insert helper for Supabase
export const safeInsert = async <T>(
  table: ValidTableName, 
  data: any,
  returnData = true
): Promise<{ data: T | null; error: any }> => {
  try {
    let query = supabase.from(table).insert(data);
    const response = returnData ? await query.select() : await query;
    
    if (hasError(response)) {
      console.error(`Error inserting into ${table}:`, response.error);
      return { data: null, error: response.error };
    }
    
    return { 
      data: returnData && response.data?.[0] ? response.data[0] as T : null, 
      error: null 
    };
  } catch (error) {
    console.error(`Exception inserting into ${table}:`, error);
    return { data: null, error };
  }
};

// These helpers solve the TypeScript string filter issues
export const filterOut = {
  eq: (column: string, value: any) => ({ [column]: value }),
  neq: (column: string, value: any) => ({ [column]: { neq: value } }),
  is: (column: string, value: any) => ({ [column]: { is: value } }),
  in: (column: string, values: any[]) => ({ [column]: { in: values } }),
  gt: (column: string, value: any) => ({ [column]: { gt: value } }),
  lt: (column: string, value: any) => ({ [column]: { lt: value } }),
  gte: (column: string, value: any) => ({ [column]: { gte: value } }),
  lte: (column: string, value: any) => ({ [column]: { lte: value } }),
  like: (column: string, value: string) => ({ [column]: { like: value } }),
  ilike: (column: string, value: string) => ({ [column]: { ilike: value } }),
  match: (obj: Record<string, any>) => obj
};
