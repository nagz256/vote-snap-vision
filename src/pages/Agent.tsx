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
  const [resultsStep, setResultsStep] = useState<"upload" | "scanning" | "verify" | "manual">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addUpload, getAvailableStations, isAdmin, refreshAvailableStations, processDRForm } = useVoteSnap();
  const { toast } = useToast();

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

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds the limit of 5MB.");
      return;
    }

    setImage(file);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImgPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setResultsStep("upload");
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      setImage(null);
      setImgPreview(null);
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds the limit of 5MB.");
      return;
    }
    
    setImage(file);
    setError(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      setImgPreview(reader.result as string);
      
      const imageName = `${Date.now()}-${file.name}`;
      const imagePath = `uploads/${imageName}`;
      
      try {
        setIsLoading(true);
        setResultsStep("scanning");
        
        const { data, error: uploadError } = await supabase
          .storage
          .from('images')
          .upload(imagePath, file, {
            cacheControl: '3600',
            upsert: false
          });
          
        if (uploadError) {
          console.error("Image upload error:", uploadError);
          setError("Failed to upload image. Please try again.");
          setIsLoading(false);
          setResultsStep("upload");
          return;
        }
        
        const uploadUrl = `https://dhxrnvnawtviozxnvqks.supabase.co/storage/v1/object/public/images/${imagePath}`;
        
        if (uploadUrl) {
          setIsLoading(true);
          setResultsStep("scanning");
          
          try {
            const processResult = await processDRForm(uploadUrl);
            
            if (processResult.success && processResult.results.length > 0) {
              setCandidateResults(processResult.results);
              setResultsStep("verify");
              sonnerToast.success("Successfully extracted results from image");
            } else {
              setCandidateResults([
                { candidateName: "", votes: 0 },
                { candidateName: "", votes: 0 }
              ]);
              setResultsStep("manual");
              if (processResult.error) {
                sonnerToast.error(processResult.error);
              }
            }
          } catch (ocrError) {
            console.error("OCR processing failed:", ocrError);
            setCandidateResults([
              { candidateName: "", votes: 0 },
              { candidateName: "", votes: 0 }
            ]);
            setResultsStep("manual");
            sonnerToast.error("There was an error extracting data from the image. Please enter results manually");
          } finally {
            setIsLoading(false);
          }
        }
      } catch (error) {
        setIsLoading(false);
        console.error("Image upload error:", error);
        setError("Failed to upload image. Please try again.");
      }
    };
    reader.readAsDataURL(file);
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

  const handleSubmit = async () => {
    if (!selectedStation) {
      toast({
        title: "Error",
        description: "Please select a polling station.",
      });
      return;
    }

    if (candidateResults.some((result) => !result.candidateName || result.votes === null)) {
      toast({
        title: "Error",
        description: "Please fill in all candidate names and vote counts.",
      });
      return;
    }

    if (!image) {
      toast({
        title: "Error",
        description: "Please upload an image.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const imageName = `${Date.now()}-${image.name}`;
      const imagePath = `uploads/${imageName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('images')
        .upload(imagePath, image, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
        toast({
          title: "Upload Error",
          description: "Failed to upload image. Please try again.",
        });
        setIsLoading(false);
        return;
      }

      const uploadUrl = `https://dhxrnvnawtviozxnvqks.supabase.co/storage/v1/object/public/images/${imagePath}`;

      await addUpload({ stationId: selectedStation, imagePath: uploadUrl }, candidateResults);

      toast({
        title: "Success",
        description: "Results uploaded successfully!",
      });

      resetForm();
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
    setError(null);
    setResultsStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
            <Select onValueChange={handleStationSelect}>
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
              onChange={handleImageUpload}
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              variant="outline"
              className="w-full justify-start glass-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {image ? `Change Image` : "Upload Image"}
            </Button>
            {imgPreview && (
              <div className="relative w-full rounded-md overflow-hidden">
                <img
                  src={imgPreview}
                  alt="Uploaded DR Form"
                  className="aspect-video w-full object-cover"
                />
              </div>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          {/* Results Section */}
          {resultsStep !== "upload" && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Enter Results</h3>
              {resultsStep === "scanning" && (
                <div className="text-center">
                  <RefreshCw className="inline-block animate-spin" />
                  <p>Scanning image for results...</p>
                </div>
              )}
              {resultsStep === "verify" && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Please verify the extracted results.
                  </p>
                  {candidateResults.map((result, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 py-2">
                      <Input
                        type="text"
                        placeholder="Candidate Name"
                        value={result.candidateName}
                        readOnly
                        className="glass-input"
                      />
                      <Input
                        type="number"
                        placeholder="Votes"
                        value={result.votes}
                        readOnly
                        className="glass-input"
                      />
                    </div>
                  ))}
                </div>
              )}
              {resultsStep === "manual" && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Automatic extraction failed. Please enter the results manually.
                  </p>
                  {candidateResults.map((result, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 py-2">
                      <Input
                        type="text"
                        placeholder="Candidate Name"
                        value={result.candidateName}
                        onChange={(e) =>
                          handleManualInputChange(index, "candidateName", e.target.value)
                        }
                        className="glass-input"
                      />
                      <Input
                        type="number"
                        placeholder="Votes"
                        value={result.votes}
                        onChange={(e) =>
                          handleManualInputChange(index, "votes", Number(e.target.value))
                        }
                        className="glass-input"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          {resultsStep !== "upload" && (
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isLoading || resultsStep === "scanning"}
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
