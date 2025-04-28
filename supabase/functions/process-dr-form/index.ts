
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

    // Enhanced OCR processing with multiple attempts and configurations
    const ocrConfigs = [
      { scale: 'true', detectOrientation: 'true', language: 'eng' },
      { scale: 'true', detectOrientation: 'true', language: 'eng', OCREngine: '2' },
      { preprocessParams: '{\"resize\":\"2000\"}', scale: 'true', language: 'eng' }
    ];

    let bestResult = null;
    let maxConfidence = -1;

    for (const config of ocrConfigs) {
      try {
        const response = await fetch('https://api.ocr.space/parse/imageurl', {
          method: 'POST',
          headers: {
            'apikey': Deno.env.get('OCR_SPACE_API_KEY') || '',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            url: imageUrl,
            ...config
          }),
        });

        const data = await response.json();
        console.log("OCR attempt response:", data);
        
        if (response.ok && data.ParsedResults?.[0]?.ParsedText) {
          const confidence = data.ParsedResults[0].TextOverlay?.Lines?.length || 0;
          if (confidence > maxConfidence) {
            maxConfidence = confidence;
            bestResult = data;
          }
        }
      } catch (error) {
        console.error("OCR attempt failed:", error);
      }
    }

    if (!bestResult) {
      throw new Error('OCR processing failed with all configurations');
    }

    // Enhanced parsing logic for better accuracy
    const lines = bestResult.ParsedResults[0].ParsedText.split('\n');
    console.log("Processing lines:", lines);
    
    const results = [];
    let currentCandidate = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Multiple regex patterns for different formats
      const patterns = [
        /([^:]+):\s*(\d+)\s*votes?/i,
        /([^0-9]+)(\d+)\s*votes?/i,
        /([a-zA-Z\s]+)[^\w]?(\d+)/,
        /(\d+)\s*votes?\s*(?:for|to)?\s*([a-zA-Z\s]+)/i
      ];

      let matched = false;
      for (const pattern of patterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const [candidateName, votes] = pattern === patterns[3] ? 
            [match[2], match[1]] : [match[1], match[2]];
          
          if (candidateName && !isNaN(parseInt(votes))) {
            results.push({
              candidateName: candidateName.trim(),
              votes: parseInt(votes)
            });
            matched = true;
            break;
          }
        }
      }

      if (!matched && trimmedLine.length > 3) {
        const hasLetters = /[a-zA-Z]{3,}/.test(trimmedLine);
        const hasNumbers = /\d+/.test(trimmedLine);
        
        if (hasLetters && !hasNumbers) {
          currentCandidate = trimmedLine;
        } else if (currentCandidate && hasNumbers) {
          const votes = parseInt(trimmedLine.match(/\d+/)?.[0] || '0');
          if (votes > 0) {
            results.push({
              candidateName: currentCandidate.trim(),
              votes
            });
            currentCandidate = null;
          }
        }
      }
    }

    console.log("Final extracted results:", results);
    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in process-dr-form:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
