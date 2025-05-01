
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createWorker } from 'https://esm.sh/tesseract.js@5.0.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Enhanced OCR text extraction with preprocessing
 * 
 * @param imageBlob - The image blob to process
 * @param options - Configuration options for OCR processing
 * @returns Recognized text from the image
 */
async function enhancedOcr(imageBlob, options = {}) {
  try {
    console.log("Starting enhanced OCR processing...");
    
    // Default options for form processing
    const opts = {
      lang: 'eng',
      charWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:.,/ ',
      tessParams: {
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
        tessedit_ocr_engine_mode: '3', // Default, based on what is available
        user_defined_dpi: '300',
      },
      ...options
    };
    
    // Initialize worker with language
    console.log("Creating Tesseract worker...");
    const worker = await createWorker(opts.lang);
    
    // Configure worker parameters
    console.log("Setting Tesseract parameters...");
    await worker.setParameters({
      tessedit_char_whitelist: opts.charWhitelist,
      ...opts.tessParams
    });
    
    console.log("Starting recognition process...");
    // Process the image with a timeout
    const recognizePromise = worker.recognize(imageBlob);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("OCR process timed out")), 45000); // 45 second timeout
    });
    
    const result = await Promise.race([recognizePromise, timeoutPromise]);
    console.log("Recognition complete");
    
    // Clean up
    await worker.terminate();
    
    // Return the recognized text
    return result.data;
  } catch (error) {
    console.error("Enhanced OCR error:", error);
    throw error;
  }
}

/**
 * Extract candidate results from OCR text
 * 
 * @param text - OCR extracted text
 * @returns Array of candidate name and vote count pairs
 */
function extractCandidateResults(text) {
  const lines = text.split('\n');
  const results = [];
  
  console.log("Extracting candidate results from text:", text);
  
  // Various patterns to match candidate names and vote counts
  const patterns = [
    // Name: 123 votes
    /([^0-9:]+)[:\s]+(\d+)(?:\s*votes?)?/i,
    
    // Name followed by number
    /^([^0-9]+?)[\s\.]+(\d+)$/i,
    
    // Name (possibly with title) followed by number
    /^([A-Za-z\s\.]+(?:\w+\.)?)[:\s\.]+(\d+)$/i,
    
    // Name with trailing dots/spaces then number
    /^([^0-9]+?)[.\s]{2,}(\d+)$/i,
  ];
  
  // First pass: Look for patterns in each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 3) continue;
    
    // Try each pattern
    let matched = false;
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const candidateName = match[1].trim();
        const votes = parseInt(match[2]);
        
        if (candidateName && !isNaN(votes) && candidateName.length > 2) {
          results.push({ candidateName, votes });
          matched = true;
          break;
        }
      }
    }
    
    // If no match, check if name and votes might be on separate lines
    if (!matched && i < lines.length - 1) {
      const nextLine = lines[i + 1].trim();
      const votesMatch = nextLine.match(/^(\d+)(?:\s*votes?)?$/i);
      
      if (votesMatch && line.length > 3) {
        const candidateName = line;
        const votes = parseInt(votesMatch[1]);
        
        if (candidateName && !isNaN(votes)) {
          results.push({ candidateName, votes });
          i++; // Skip the next line since we processed it
        }
      }
    }
  }
  
  // If few results were found, try column-based extraction
  if (results.length < 2) {
    console.log("Few results found, trying column-based extraction");
    
    // Find lines with numbers, assume they might be vote counts
    const potentialResults = [];
    for (const line of lines) {
      const parts = line.split(/\s{2,}|\t/); // Split by multiple spaces or tabs
      
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1].trim();
        if (/^\d+$/.test(lastPart)) {
          const votes = parseInt(lastPart);
          const candidateName = parts.slice(0, parts.length - 1).join(' ').trim();
          
          if (candidateName.length > 2 && !isNaN(votes)) {
            potentialResults.push({ candidateName, votes });
          }
        }
      }
    }
    
    // If we found at least 2 results, use them
    if (potentialResults.length >= 2) {
      return potentialResults;
    }
  }
  
  return results;
}

/**
 * Extract voter statistics from OCR text
 * 
 * @param text - OCR extracted text
 * @returns Object containing voter statistics
 */
function extractVoterStatistics(text) {
  const voterStats = {
    maleVoters: 0,
    femaleVoters: 0,
    wastedBallots: 0,
    totalVoters: 0
  };
  
  console.log("Extracting voter statistics from text");
  
  // Enhanced pattern matching for voter statistics
  const patterns = {
    male: [
      /male\s*[voters|voters|count|:]*\s*[:|=|\s]\s*(\d+)/i,
      /men\s*[voters|voters|count|:]*\s*[:|=|\s]\s*(\d+)/i,
      /male:?\s*(\d+)/i,
      /men:?\s*(\d+)/i
    ],
    female: [
      /female\s*[voters|voters|count|:]*\s*[:|=|\s]\s*(\d+)/i,
      /women\s*[voters|voters|count|:]*\s*[:|=|\s]\s*(\d+)/i,
      /female:?\s*(\d+)/i,
      /women:?\s*(\d+)/i
    ],
    wasted: [
      /(wasted|spoilt|rejected|invalid|void)\s*[ballots|votes|:]*\s*[:|=|\s]\s*(\d+)/i,
      /(wasted|spoilt|rejected|invalid|void):?\s*(\d+)/i
    ],
    total: [
      /total\s*[voters|votes|count|:]*\s*[:|=|\s]\s*(\d+)/i,
      /total:?\s*(\d+)/i,
      /voters\s*total:?\s*(\d+)/i
    ]
  };
  
  // Try each pattern for each statistic type
  for (const [key, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[match.length - 1]);
        if (!isNaN(value)) {
          switch (key) {
            case 'male':
              voterStats.maleVoters = value;
              break;
            case 'female':
              voterStats.femaleVoters = value;
              break;
            case 'wasted':
              voterStats.wastedBallots = value;
              break;
            case 'total':
              voterStats.totalVoters = value;
              break;
          }
          break; // Found a match for this stat, move to next
        }
      }
    }
  }
  
  // If we have male and female but no total, calculate it
  if (voterStats.maleVoters && voterStats.femaleVoters && !voterStats.totalVoters) {
    voterStats.totalVoters = voterStats.maleVoters + voterStats.femaleVoters;
  }
  
  return voterStats;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl } = await req.json()
    
    if (!imageUrl) {
      throw new Error('Image URL is required')
    }

    console.log("Processing image:", imageUrl.substring(0, 50) + "...");

    // Fetch the image data
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBlob = await imageResponse.blob();

    try {
      // Process with enhanced OCR
      console.log("Starting enhanced OCR processing");
      const ocrData = await enhancedOcr(imageBlob, {
        lang: 'eng',
        charWhitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:.,/ ',
      });
      
      console.log("OCR completed, processing results...");
      console.log("Raw text:", ocrData.text);
      
      // Check if we got meaningful text
      if (!ocrData.text || ocrData.text.trim().length < 10) {
        throw new Error('Insufficient text recognized from image');
      }
      
      // Extract candidate results
      const results = extractCandidateResults(ocrData.text);
      
      // Extract voter statistics
      const voterStats = extractVoterStatistics(ocrData.text);
      
      console.log("Final extracted results:", results);
      console.log("Extracted voter statistics:", voterStats);
      
      // If still no results, add placeholder entries for manual entry
      if (results.length === 0) {
        throw new Error('No candidate data could be extracted from the image');
      }
      
      return new Response(JSON.stringify({ 
        results, 
        voterStats, 
        success: true,
        confidence: ocrData.confidence
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } catch (ocrError) {
      console.error("OCR processing error:", ocrError);
      throw new Error(`OCR processing failed: ${ocrError.message}`);
    }
    
  } catch (error) {
    console.error("Error in process-dr-form:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        results: [{ candidateName: "", votes: 0 }, { candidateName: "", votes: 0 }],
        voterStats: {
          maleVoters: 0,
          femaleVoters: 0,
          wastedBallots: 0,
          totalVoters: 0
        }
      }),
      { 
        status: 200, // Return 200 even with error to handle it gracefully in the UI
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
