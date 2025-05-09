
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Eye, Download } from "lucide-react";
import { supabase, hasError, safeData } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImageItem {
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

const UploadedImages = () => {
  const [uploads, setUploads] = useState<ImageItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUploads();
    
    // Set up a periodic refresh
    const refreshInterval = setInterval(() => {
      fetchUploads();
    }, 10000);
    
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
      
      const formattedData = data.map(item => {
        if (!item) return null;
        return {
          id: item.id,
          imagePath: item.image_path,
          timestamp: item.timestamp,
          stationName: item.polling_stations?.name || "Unknown Station",
          district: item.polling_stations?.district || "Unknown District"
        };
      }).filter(Boolean) as ImageItem[];
      
      setUploads(formattedData);
    } catch (error) {
      console.error("Error in fetchUploads:", error);
      toast.error("Failed to load uploads");
    } finally {
      setIsLoading(false);
    }
  };

  const viewImage = (image: ImageItem) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Uploaded DR Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-purple-500 rounded-full border-t-transparent"></div>
            </div>
          ) : uploads.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No forms have been uploaded yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploads.map((upload) => (
                <div key={upload.id} className="bg-white/40 rounded-lg overflow-hidden">
                  <div className="h-44 overflow-hidden">
                    <img 
                      src={upload.imagePath} 
                      alt={`Form from ${upload.stationName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium">{upload.stationName}</h3>
                    <p className="text-xs text-muted-foreground">{upload.district}</p>
                    <p className="text-xs mt-1">
                      {formatDistanceToNow(parseISO(upload.timestamp), { addSuffix: true })}
                    </p>
                    <div className="flex justify-end mt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex gap-1 items-center"
                        onClick={() => viewImage(upload)}
                      >
                        <Eye size={14} />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold">
                {selectedImage.stationName} - {selectedImage.district}
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
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
            <div className="p-4 border-t flex justify-between">
              <p className="text-sm text-muted-foreground">
                Uploaded {formatDistanceToNow(parseISO(selectedImage.timestamp), { addSuffix: true })}
              </p>
              <a 
                href={selectedImage.imagePath} 
                download 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="flex gap-1 items-center">
                  <Download size={14} />
                  Download
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UploadedImages;
