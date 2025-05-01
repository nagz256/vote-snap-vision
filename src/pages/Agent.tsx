
import { useState, useRef, ChangeEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, X, RefreshCw } from "lucide-react";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExtractedResult } from "@/data/mockData";
import VoterStatistics from "@/components/VoterStatistics";

interface CandidateResult {
  candidateName: string;
  votes: number;
}

const Agent = () => {
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [candidateResults, setCandidateResults] = useState<CandidateResult[]>([
    { candidateName: "", votes: 0 },
    { candidateName: "", votes: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [availableStations, setAvailableStations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [resultsStep, setResultsStep] = useState<"upload" | "scanning" | "verify" | "manual">("upload");
  
  // Add voter statistics state
  const [voterStats, setVoterStats] = useState({
    maleVoters: 0,
    femaleVoters: 0,
    wastedBallots: 0,
    totalVoters: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addUpload, getAvailableStations, isAdmin, refreshAvailableStations, processDRForm } = useVoteSnap();
  const { toast } = useToast();

  // Calculate total voters whenever the individual voter counts change
  useEffect(() => {
    const total = voterStats.maleVoters + voterStats.femaleVoters;
    setVoterStats(prev => ({ ...prev, totalVoters: total }));
  }, [voterStats.maleVoters, voterStats.femaleVoters]);

  useEffect(() => {
    if (!isAdmin) {
      refreshStations();
    }
  }, [isAdmin]);

  const refreshStations = async () => {
    try {
      const stations = await getAvailableStations();
      setAvailableStations(stations);
    } catch (error) {
      console.error("Error fetching available stations:", error);
      toast({
        title: "Error",
        description: "Failed to load available stations.",
      });
    }
  };

  const handleStationSelect = (value: string) => {
    setSelectedStation(value);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImage(null);
      setImgPreview(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds the limit of 10MB.");
      return;
    }

    setImage(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImgPreview(reader.result as string);
      processImageWithOcr(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processImageWithOcr = async (imageDataUrl: string) => {
    if (!imageDataUrl) return;
    
    try {
      setIsProcessingImage(true);
      setResultsStep("scanning");
      sonnerToast.info("Analyzing form...", { duration: 2000 });
      
      // Process the image with the edge function
      const response = await processDRForm(imageDataUrl);
      
      if (response.success && response.results && response.results.length > 0) {
        setCandidateResults(response.results);
        
        // Also set voter statistics if available
        if (response.voterStats) {
          setVoterStats({
            maleVoters: response.voterStats.maleVoters || 0,
            femaleVoters: response.voterStats.femaleVoters || 0,
            wastedBallots: response.voterStats.wastedBallots || 0,
            totalVoters: response.voterStats.totalVoters || 0
          });
        }
        
        setResultsStep("verify");
        sonnerToast.success("Form analyzed successfully! Please verify the results.", { duration: 4000 });
      } else {
        setCandidateResults([
          { candidateName: "", votes: 0 },
          { candidateName: "", votes: 0 }
        ]);
        setResultsStep("manual");
        sonnerToast.warning("Couldn't extract data automatically. Please enter results manually.", { duration: 5000 });
      }
    } catch (err) {
      console.error("OCR processing error:", err);
      setCandidateResults([
        { candidateName: "", votes: 0 },
        { candidateName: "", votes: 0 }
      ]);
      setResultsStep("manual");
      sonnerToast.error("Error processing the image. Please enter results manually.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleManualInputChange = (index: number, field: string, value: string | number) => {
    const newResults = [...candidateResults];
    if (field === "candidateName") {
      newResults[index].candidateName = value as string;
    } else if (field === "votes") {
      newResults[index].votes = Number(value);
    }
    setCandidateResults(newResults);
  };

  const handleVoterStatsUpdate = (field: string, value: number) => {
    setVoterStats(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddCandidate = () => {
    setCandidateResults([...candidateResults, { candidateName: "", votes: 0 }]);
  };

  const handleRemoveCandidate = (index: number) => {
    if (candidateResults.length <= 2) {
      toast({
        title: "Error",
        description: "You need at least two candidates.",
      });
      return;
    }
    const newResults = [...candidateResults];
    newResults.splice(index, 1);
    setCandidateResults(newResults);
  };

  const handleRetakePhoto = () => {
    setImage(null);
    setImgPreview(null);
    setResultsStep("upload");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedStation) {
      toast({
        title: "Error",
        description: "Please select a polling station.",
      });
      return;
    }

    if (candidateResults.some((result) => !result.candidateName)) {
      toast({
        title: "Error",
        description: "Please fill in all candidate names.",
      });
      return;
    }

    if (candidateResults.some((result) => result.votes < 0)) {
      toast({
        title: "Error",
        description: "Vote counts cannot be negative.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use local URL for preview when available
      const uploadUrl = image 
        ? URL.createObjectURL(image)  
        : "manual-entry-no-image";
        
      // Include voter statistics in the upload
      await addUpload(
        { 
          stationId: selectedStation, 
          imagePath: uploadUrl,
          voterStatistics: {
            maleVoters: voterStats.maleVoters,
            femaleVoters: voterStats.femaleVoters,
            wastedBallots: voterStats.wastedBallots,
            totalVoters: voterStats.totalVoters
          }
        }, 
        candidateResults
      );

      toast({
        title: "Success",
        description: "Results uploaded successfully!",
      });

      resetForm();
      refreshStations(); // Refresh available stations after submission
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "There was an error uploading the results. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStation("");
    setImage(null);
    setImgPreview(null);
    setCandidateResults([
      { candidateName: "", votes: 0 },
      { candidateName: "", votes: 0 },
    ]);
    setVoterStats({
      maleVoters: 0,
      femaleVoters: 0,
      wastedBallots: 0,
      totalVoters: 0
    });
    setError(null);
    setResultsStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const switchToManualEntry = () => {
    setResultsStep("manual");
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Submit DR Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Station Selection */}
          <div className="space-y-2">
            <label htmlFor="station" className="text-sm font-medium block">
              Select Polling Station
            </label>
            <Select onValueChange={handleStationSelect} value={selectedStation}>
              <SelectTrigger className="glass-input w-full">
                <SelectValue placeholder="Select a station" />
              </SelectTrigger>
              <SelectContent>
                {availableStations.map((station: any) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name} - {station.district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label htmlFor="image-upload" className="text-sm font-medium block">
              Upload DR Form Image
            </label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              ref={fileInputRef}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-full justify-start glass-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isProcessingImage}
              >
                <Upload className="mr-2 h-4 w-4" />
                {image ? `Change Image` : "Upload Image"}
              </Button>
              {imgPreview && (
                <Button
                  variant="destructive"
                  className="glass-button"
                  onClick={handleRetakePhoto}
                  disabled={isLoading || isProcessingImage}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            {imgPreview && (
              <div className="relative w-full rounded-md overflow-hidden mt-2">
                <img
                  src={imgPreview}
                  alt="Uploaded DR Form"
                  className="aspect-video w-full object-contain border rounded-md"
                />
              </div>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          {/* Manual Entry Button */}
          {!isProcessingImage && (resultsStep === "upload" || resultsStep === "verify") && (
            <Button
              variant="secondary"
              className="w-full" 
              onClick={switchToManualEntry}
              disabled={isLoading}
            >
              Enter Results Manually
            </Button>
          )}

          {/* Results Section */}
          {resultsStep === "scanning" && (
            <div className="text-center p-4">
              <RefreshCw className="inline-block animate-spin mb-2 h-6 w-6" />
              <p>Scanning image for results...</p>
            </div>
          )}

          {(resultsStep === "manual" || resultsStep === "verify") && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Election Results</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {resultsStep === "verify" 
                  ? "Please verify and edit the extracted results if needed."
                  : "Enter the results from the DR form below."}
              </p>

              {candidateResults.map((result, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                  <div className="col-span-6">
                    <label className="text-sm font-medium mb-1 block">Candidate Name</label>
                    <Input
                      type="text"
                      placeholder="Candidate Name"
                      value={result.candidateName}
                      onChange={(e) => handleManualInputChange(index, "candidateName", e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="text-sm font-medium mb-1 block">Votes</label>
                    <Input
                      type="number"
                      placeholder="Vote Count"
                      value={result.votes}
                      onChange={(e) => handleManualInputChange(index, "votes", Number(e.target.value))}
                      className="glass-input"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => handleRemoveCandidate(index)}
                      disabled={candidateResults.length <= 2}
                      className="h-10 w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={handleAddCandidate}
                type="button"
                className="w-full mt-2"
              >
                Add Another Candidate
              </Button>
              
              {/* Voter Statistics */}
              <VoterStatistics 
                maleVoters={voterStats.maleVoters}
                femaleVoters={voterStats.femaleVoters}
                wastedBallots={voterStats.wastedBallots}
                totalVoters={voterStats.totalVoters}
                onUpdate={handleVoterStatsUpdate}
              />
            </div>
          )}

          {/* Submit Button */}
          {(resultsStep === "verify" || resultsStep === "manual") && (
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Results"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Agent;
