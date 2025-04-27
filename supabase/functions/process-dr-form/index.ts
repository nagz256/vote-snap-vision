
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Call OCR.space API
    const response = await fetch('https://api.ocr.space/parse/imageurl', {
      method: 'POST',
      headers: {
        'apikey': Deno.env.get('OCR_SPACE_API_KEY') || '',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        url: imageUrl,
        language: 'eng',
        isOverlayRequired: 'false',
        scale: 'true',
        detectOrientation: 'true',
      }),
    })

    const data = await response.json()
    console.log("OCR response status:", response.status);
    
    if (!response.ok) {
      console.error("OCR processing failed:", data);
      throw new Error('OCR processing failed: ' + (data.ErrorMessage || 'Unknown error'))
    }

    // Parse the OCR results to extract candidate names and votes
    const lines = data.ParsedResults?.[0]?.ParsedText?.split('\n') || []
    const results = []
    
    console.log("OCR extracted lines:", lines.length);
    
    // More robust parsing logic
    for (const line of lines) {
      console.log("Processing line:", line);
      
      // Try multiple regex patterns to match different formats
      let match = line.match(/([^:]+):\s*(\d+)\s*votes?/)
      
      if (!match) {
        match = line.match(/([^0-9]+)(\d+)\s*votes?/)
      }
      
      if (!match) {
        // Try to find any name followed by numbers
        match = line.match(/([a-zA-Z\s]+)[^\w]?(\d+)/)
      }
      
      if (match) {
        const candidateName = match[1].trim();
        const votes = parseInt(match[2], 10);
        
        console.log(`Found candidate: "${candidateName}" with ${votes} votes`);
        
        // Only add if we have both a name and votes
        if (candidateName && !isNaN(votes)) {
          results.push({
            candidateName,
            votes
          });
        }
      }
    }
    
    // If we found no results via regex, try a more aggressive approach
    if (results.length === 0) {
      console.log("No results found via regex, trying alternative approach");
      
      let currentCandidate = null;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) continue;
        
        // Check if the line contains mostly letters (likely a name)
        const letterCount = (trimmedLine.match(/[a-zA-Z]/g) || []).length;
        const digitCount = (trimmedLine.match(/[0-9]/g) || []).length;
        
        if (letterCount > digitCount && letterCount > 3) {
          currentCandidate = trimmedLine;
        } 
        // If we have a current candidate and find a line with mostly digits
        else if (currentCandidate && digitCount > 0 && digitCount > letterCount) {
          // Extract the first number found
          const voteMatch = trimmedLine.match(/\d+/);
          if (voteMatch) {
            const votes = parseInt(voteMatch[0], 10);
            if (!isNaN(votes)) {
              results.push({
                candidateName: currentCandidate,
                votes
              });
              currentCandidate = null;
            }
          }
        }
      }
    }
    
    console.log("Extracted results:", results);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error("Error in process-dr-form:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
