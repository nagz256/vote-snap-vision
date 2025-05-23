
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Eye, Download } from "lucide-react";
import { supabase, hasError, safeData, createMatchFilter } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageUpload {
  id: string;
  imagePath: string;
  timestamp: string;
  stationName: string;
  district: string;
}

interface UploadData {
  id: string;
  image_path: string;
  timestamp: string;
  polling_stations?: { 
    name?: string;
    district?: string; 
  };
}

const Uploads = () => {
  const [uploads, setUploads] = useState<ImageUpload[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageUpload | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUploads();
    
    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      fetchUploads();
    }, 30000);
      
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchUploads = async () => {
    try {
      setIsLoading(true);
      
      const response = await supabase
        .from('uploads')
        .select(`
          id,
          image_path,
          timestamp,
          polling_stations (
            name,
            district
          )
        `)
        .order('timestamp', { ascending: false });
        
      if (hasError(response)) {
        console.error("Error fetching uploads:", response.error);
        toast.error("Failed to load uploads");
        setIsLoading(false);
        return;
      }
      
      const data = safeData<UploadData>(response);
      
      if (!data || data.length === 0) {
        console.log("No uploads found in database");
        setUploads([]);
        setIsLoading(false);
        return;
      }
      
      const formattedData = data.map(item => ({
        id: item.id,
        imagePath: item.image_path,
        timestamp: item.timestamp,
        stationName: item.polling_stations?.name || "Unknown Station",
        district: item.polling_stations?.district || "Unknown District"
      }));
      
      setUploads(formattedData);
      console.log("Fetched uploads:", formattedData);
    } catch (error) {
      console.error("Error in fetchUploads:", error);
      toast.error("Failed to load uploads");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">DR Form Uploads</h1>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>All Uploaded Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
            </div>
          ) : uploads.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No forms have been uploaded yet
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploads.map((upload) => (
                <div key={upload.id} className="bg-white/40 rounded-lg overflow-hidden">
                  <div className="relative h-48">
                    <img 
                      src={upload.imagePath} 
                      alt={`Form from ${upload.stationName}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <h3 className="font-medium">{upload.stationName}</h3>
                      <p className="text-sm opacity-90">{upload.district}</p>
                    </div>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(upload.timestamp), { addSuffix: true })}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => {
                          setSelectedImage(upload);
                          setIsModalOpen(true);
                        }}
                      >
                        <Eye size={14} />
                        View
                      </Button>
                      <a 
                        href={upload.imagePath}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <Download size={14} />
                          Download
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {isModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-bold">{selectedImage.stationName}</h3>
                <p className="text-sm text-muted-foreground">{selectedImage.district}</p>
              </div>
              <Button 
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <img
                src={selectedImage.imagePath}
                alt={`Form from ${selectedImage.stationName}`}
                className="max-w-full h-auto mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Uploads;
