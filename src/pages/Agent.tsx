
import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { toast } from "@/components/ui/sonner";
import { Loader2, Check, Camera, Upload, Edit2 } from "lucide-react";

interface FormData {
  stationId: string | null;
  image: File | null;
  previewUrl: string;
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
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedResults, setExtractedResults] = useState<{candidateName: string; votes: number}[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast({
        title: "Error",
        description: "Failed to load polling stations",
        variant: "destructive",
      });
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
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!formData.previewUrl || !formData.stationId) {
      toast({
        title: "Missing information",
        description: "Please select a polling station and upload an image.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log("Processing image...");
      const results = await processDRForm(formData.previewUrl);
      console.log("OCR Results:", results);
      setExtractedResults(results);
      setIsEditing(true);
    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "Error processing image",
        description: "There was an error extracting data from the image. Please try again or enter results manually.",
        variant: "destructive",
      });
      // If OCR fails, allow manual data entry with empty results
      setExtractedResults([
        { candidateName: "", votes: 0 },
        { candidateName: "", votes: 0 }
      ]);
      setIsEditing(true);
    } finally {
      setIsProcessing(false);
    }
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
      toast({
        title: "Missing information",
        description: "Please complete all steps before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Filter out empty candidates
    const validResults = extractedResults.filter(
      result => result.candidateName.trim() !== "" && result.votes >= 0
    );

    if (validResults.length === 0) {
      toast({
        title: "Invalid data",
        description: "Please enter at least one candidate with votes.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addUpload(
        {
          stationId: formData.stationId,
          imagePath: formData.previewUrl,
        },
        validResults
      );
      
      // Reset form
      setFormData({
        stationId: null,
        image: null,
        previewUrl: "",
      });
      setExtractedResults([]);
      setIsEditing(false);
      
      toast({
        title: "Success!",
        description: "Results submitted successfully. The admin dashboard has been updated with your data.",
        variant: "default",
      });
      
      // Refresh available stations
      fetchStations();
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting the results.",
        variant: "destructive",
      });
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
                <div className="mt-4">
                  <div className="glass-container p-2">
                    <img
                      src={formData.previewUrl}
                      alt="Preview"
                      className="max-h-80 mx-auto rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Step 3: Process Image */}
          {formData.previewUrl && (
            <div>
              <h2 className="text-lg font-medium mb-3">Step 3: Extract Results</h2>
              <Button 
                className="glass-button w-full" 
                disabled={isProcessing || extractedResults.length > 0}
                onClick={processImage}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : extractedResults.length > 0 ? (
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
