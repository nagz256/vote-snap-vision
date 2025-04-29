
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createWorker } from 'https://esm.sh/tesseract.js@5.0.5'

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

    console.log("Processing image with Tesseract.js:", imageUrl.substring(0, 50) + "...");

    // Fetch the image data
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    const imageBlob = await imageResponse.blob();

    // Initialize Tesseract worker
    const worker = await createWorker('eng');
    
    // Configure worker settings for better results with form data
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789:., ',
      preserve_interword_spaces: '1',
      tessjs_create_hocr: '1',
      tessjs_create_tsv: '1',
    });

    console.log("Recognizing text from image...");
    
    // Perform OCR on the image
    const { data } = await worker.recognize(imageBlob);
    
    console.log("OCR completed, processing results...");
    console.log("Raw text:", data.text);
    
    // Parse results to extract candidate names and vote counts
    const lines = data.text.split('\n');
    const results = [];
    
    // Process the extracted text to find candidate names and vote counts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Look for patterns like "Name: 123 votes" or "Name 123"
      const nameVotePattern = /([^0-9:]+)[:\s]+(\d+)(?:\s*votes?)?/i;
      const match = line.match(nameVotePattern);
      
      if (match) {
        const candidateName = match[1].trim();
        const votes = parseInt(match[2]);
        
        if (candidateName && !isNaN(votes)) {
          results.push({
            candidateName,
            votes
          });
        }
      } else if (i < lines.length - 1) {
        // Check if name and votes are on separate lines
        const nextLine = lines[i + 1].trim();
        const votesMatch = nextLine.match(/^(\d+)(?:\s*votes?)?$/i);
        
        if (votesMatch && line.length > 3) {
          const candidateName = line;
          const votes = parseInt(votesMatch[1]);
          
          if (candidateName && !isNaN(votes)) {
            results.push({
              candidateName,
              votes
            });
            i++; // Skip the next line since we already processed it
          }
        }
      }
    }
    
    // Second pass to find additional formats or missed patterns
    if (results.length === 0) {
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          if (/^\d+$/.test(lastPart)) {
            const votes = parseInt(lastPart);
            const candidateName = parts.slice(0, parts.length - 1).join(' ');
            
            if (candidateName.length > 3 && !isNaN(votes)) {
              results.push({
                candidateName,
                votes
              });
            }
          }
        }
      }
    }
    
    // Release the worker
    await worker.terminate();

    console.log("Final extracted results:", results);
    
    // If still no results, add placeholder entries for manual entry
    if (results.length === 0) {
      results.push({ candidateName: "", votes: 0 }, { candidateName: "", votes: 0 });
    }
    
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
