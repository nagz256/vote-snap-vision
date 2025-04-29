
import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { toast } from "sonner";
import { Loader2, Check, Camera, Upload, Edit2, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import VoterStatistics from "@/components/VoterStatistics";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  stationId: string | null;
  image: File | null;
  previewUrl: string;
  maleVoters: number;
  femaleVoters: number;
  wastedBallots: number;
  totalVoters: number;
}

interface PollingStation {
  id: string;
  name: string;
  district: string;
}

const Agent = () => {
  const { getAvailableStations, processDRForm, addUpload } = useVoteSnap();
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  
  const [formData, setFormData] = useState<FormData>({
    stationId: null,
    image: null,
    previewUrl: "",
    maleVoters: 0,
    femaleVoters: 0,
    wastedBallots: 0,
    totalVoters: 0
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedResults, setExtractedResults] = useState<{candidateName: string; votes: number}[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrCompleted, setOcrCompleted] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update total voters when individual counts change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      totalVoters: prev.maleVoters + prev.femaleVoters + prev.wastedBallots
    }));
  }, [formData.maleVoters, formData.femaleVoters, formData.wastedBallots]);

  // Fetch available stations on component mount
  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      setIsLoadingStations(true);
      const availableStations = await getAvailableStations();
      setStations(availableStations);
    } catch (error) {
      console.error("Error fetching stations:", error);
      toast.error("Failed to load polling stations");
    } finally {
      setIsLoadingStations(false);
    }
  };

  const handleStationChange = (value: string) => {
    setFormData({
      ...formData,
      stationId: value,
    });
  };

  const handleStatisticsUpdate = (field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          image: file,
          previewUrl: reader.result as string,
        });
        setExtractedResults([]);
        setOcrCompleted(false);
        setIsRetaking(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!formData.previewUrl || !formData.stationId) {
      toast.error("Please select a polling station and upload an image.");
      return;
    }

    setIsProcessing(true);
    try {
      console.log("Processing image with Tesseract.js...");
      const results = await processDRForm(formData.previewUrl);
      console.log("OCR Results:", results);
      
      if (results && results.length > 0) {
        setExtractedResults(results);
        setIsEditing(true);
        setOcrCompleted(true);
        toast.success("Image processed successfully! Please review the extracted data.");
      } else {
        toast.warning("No data could be extracted. Please try retaking the image or enter results manually.");
        setExtractedResults([
          { candidateName: "", votes: 0 },
          { candidateName: "", votes: 0 }
        ]);
        setIsEditing(true);
        setIsRetaking(true);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("There was an error extracting data from the image. Please try again or enter results manually.");
      setExtractedResults([
        { candidateName: "", votes: 0 },
        { candidateName: "", votes: 0 }
      ]);
      setIsEditing(true);
      setIsRetaking(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const retakeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null,
      previewUrl: ""
    }));
    setExtractedResults([]);
    setOcrCompleted(false);
    setIsRetaking(false);
    triggerFileInput();
  };

  const updateResult = (index: number, field: "candidateName" | "votes", value: string | number) => {
    const updatedResults = [...extractedResults];
    if (field === "votes") {
      updatedResults[index].votes = typeof value === "number" ? value : parseInt(value as string) || 0;
    } else {
      updatedResults[index].candidateName = value as string;
    }
    setExtractedResults(updatedResults);
  };

  const addCandidateField = () => {
    setExtractedResults([...extractedResults, { candidateName: "", votes: 0 }]);
  };

  const removeCandidateField = (index: number) => {
    const updatedResults = extractedResults.filter((_, i) => i !== index);
    setExtractedResults(updatedResults);
  };

  const handleSubmit = async () => {
    if (!formData.stationId || !formData.previewUrl || extractedResults.length === 0) {
      toast.error("Please complete all steps before submitting.");
      return;
    }

    // Validate voter statistics
    if (formData.totalVoters === 0) {
      toast.error("Please enter voter statistics before submitting.");
      return;
    }

    // Filter out empty candidates
    const validResults = extractedResults.filter(result => result.candidateName.trim() !== "");
    
    if (validResults.length === 0) {
      toast.error("Please add at least one candidate with votes.");
      return;
    }

    // Filter out duplicate candidates (case-insensitive)
    const uniqueResultsMap = new Map<string, {candidateName: string; votes: number}>();
    
    for (const result of validResults) {
      const lcName = result.candidateName.toLowerCase();
      if (!uniqueResultsMap.has(lcName)) {
        uniqueResultsMap.set(lcName, result);
      }
    }
    
    const uniqueResults = Array.from(uniqueResultsMap.values());

    setIsSubmitting(true);
    try {
      // First, create the upload
      const { data: uploadData, error: uploadError } = await supabase
        .from('uploads')
        .insert([{
          station_id: formData.stationId,
          image_path: formData.previewUrl,
        }])
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Add voter statistics
      await supabase
        .from('voter_statistics')
        .insert([{
          upload_id: uploadData.id,
          station_id: formData.stationId,
          male_voters: formData.maleVoters,
          female_voters: formData.femaleVoters,
          wasted_ballots: formData.wastedBallots,
          total_voters: formData.totalVoters
        }]);

      // Add results with unique candidates
      for (const result of uniqueResults) {
        const { data: candidate } = await supabase
          .from('candidates')
          .insert([{ name: result.candidateName.toLowerCase() }])
          .select()
          .maybeSingle();

        if (candidate) {
          await supabase
            .from('results')
            .insert([{
              upload_id: uploadData.id,
              candidate_id: candidate.id,
              votes: result.votes,
            }]);
        }
      }
      
      // Reset form
      setFormData({
        stationId: null,
        image: null,
        previewUrl: "",
        maleVoters: 0,
        femaleVoters: 0,
        wastedBallots: 0,
        totalVoters: 0
      });
      setExtractedResults([]);
      setIsEditing(false);
      setOcrCompleted(false);
      
      toast.success("Results submitted successfully!");
      
      // Refresh available stations
      fetchStations();
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error("There was an error submitting the results.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass-container mb-8">
        <h1 className="text-2xl font-bold mb-6">Field Agent Upload Portal</h1>
        
        <div className="space-y-6">
          {/* Step 1: Select Polling Station */}
          <div>
            <h2 className="text-lg font-medium mb-3">Step 1: Select Your Polling Station</h2>
            <Select value={formData.stationId?.toString()} onValueChange={handleStationChange}>
              <SelectTrigger className="glass-input">
                <SelectValue placeholder={isLoadingStations ? "Loading stations..." : "Select a polling station"} />
              </SelectTrigger>
              <SelectContent>
                {isLoadingStations ? (
                  <SelectItem value="loading" disabled>Loading stations...</SelectItem>
                ) : stations.length === 0 ? (
                  <SelectItem value="none" disabled>No stations available</SelectItem>
                ) : (
                  stations.map(station => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name} ({station.district})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Step 2: Upload Image */}
          <div>
            <h2 className="text-lg font-medium mb-3">Step 2: Upload DR Form Image</h2>
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="button" 
                  className="glass-button flex items-center gap-2"
                  onClick={triggerFileInput}
                >
                  <Camera size={18} />
                  Take Photo
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="bg-white/50 border-white/50"
                  onClick={triggerFileInput}
                >
                  <Upload size={18} className="mr-2" />
                  Upload Image
                </Button>
                <Input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              
              {formData.previewUrl && (
                <div className="mt-4 relative">
                  <div className="glass-container p-2">
                    <img
                      src={formData.previewUrl}
                      alt="Preview"
                      className="max-h-80 mx-auto rounded-lg"
                    />
                    {isRetaking && (
                      <Button 
                        className="absolute top-4 right-4 bg-white/80 text-black hover:bg-white"
                        size="sm"
                        onClick={retakeImage}
                      >
                        <RefreshCcw size={16} className="mr-2" />
                        Retake
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Step 3: Enter Voter Statistics */}
          {formData.previewUrl && !isProcessing && !ocrCompleted && (
            <div>
              <h2 className="text-lg font-medium mb-3">Step 3: Enter Voter Statistics</h2>
              <VoterStatistics
                maleVoters={formData.maleVoters}
                femaleVoters={formData.femaleVoters}
                wastedBallots={formData.wastedBallots}
                totalVoters={formData.totalVoters}
                onUpdate={handleStatisticsUpdate}
              />
            </div>
          )}
          
          {/* Step 3: Process Image */}
          {formData.previewUrl && (
            <div>
              <h2 className="text-lg font-medium mb-3">Step 3: Extract Results</h2>
              <Button 
                className="glass-button w-full" 
                disabled={isProcessing || ocrCompleted}
                onClick={processImage}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing with Tesseract OCR...
                  </>
                ) : ocrCompleted ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Results Extracted
                  </>
                ) : (
                  "Process Image"
                )}
              </Button>
            </div>
          )}
          
          {/* OCR Result Display */}
          {ocrCompleted && extractedResults.length > 0 && (
            <Card className="bg-purple-50/30 border-purple-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">OCR Scan Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  The system has automatically extracted the following data. Please review and edit if necessary.
                </p>
                <div className="bg-white/60 rounded-md p-3">
                  {extractedResults.map((result, idx) => (
                    <div key={idx} className="flex justify-between items-center mb-1 text-sm">
                      <span className="font-medium">{result.candidateName || "Unknown Candidate"}</span>
                      <span className="bg-purple-100 px-2 py-0.5 rounded">
                        {result.votes} votes
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Step 4: Edit Results */}
          {extractedResults.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-medium">Step 4: Verify Results</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit2 size={16} />
                  {isEditing ? "Done Editing" : "Edit"}
                </Button>
              </div>
              
              <div className="bg-white/40 backdrop-blur-sm rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-purple/20">
                      <th className="py-2 px-4 text-left">Candidate</th>
                      <th className="py-2 px-4 text-right">Votes</th>
                      {isEditing && <th className="py-2 px-2 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {extractedResults.map((result, index) => (
                      <tr key={index} className="border-t border-white/30">
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              className="glass-input"
                              value={result.candidateName}
                              onChange={(e) => updateResult(index, "candidateName", e.target.value)}
                              placeholder="Candidate name"
                            />
                          ) : (
                            result.candidateName || <span className="text-muted-foreground">Unnamed candidate</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              className="glass-input text-right"
                              type="number"
                              min="0"
                              value={result.votes}
                              onChange={(e) => updateResult(index, "votes", e.target.value)}
                            />
                          ) : (
                            <span className="block text-right">{result.votes}</span>
                          )}
                        </td>
                        {isEditing && (
                          <td className="py-3 px-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => removeCandidateField(index)}
                            >
                              <span className="sr-only">Remove</span>
                              ×
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {isEditing && (
                  <div className="p-4 border-t border-white/30">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={addCandidateField}
                    >
                      + Add Candidate
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 5: Submit */}
          {extractedResults.length > 0 && !isEditing && (
            <div>
              <h2 className="text-lg font-medium mb-3">Step 5: Submit Results</h2>
              <Button 
                className="glass-button w-full" 
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Results"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Agent;
