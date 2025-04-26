
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
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error('OCR processing failed')
    }

    // Parse the OCR results to extract candidate names and votes
    const lines = data.ParsedResults?.[0]?.ParsedText?.split('\n') || []
    const results = []
    
    for (const line of lines) {
      // Assuming format: "Candidate Name: XX votes"
      const match = line.match(/([^:]+):\s*(\d+)\s*votes?/)
      if (match) {
        results.push({
          candidateName: match[1].trim(),
          votes: parseInt(match[2], 10)
        })
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
