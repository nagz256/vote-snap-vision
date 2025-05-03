
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { toast } from "sonner";
import { query, insertQuery } from "@/integrations/mysql/client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

type PollingStation = {
  id: string;
  name: string;
  district: string;
  created_at?: string;
};

const PollingStations = () => {
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [formData, setFormData] = useState<Omit<PollingStation, 'id' | 'created_at'>>({ 
    name: "", 
    district: "" 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const { isAdmin, refreshAvailableStations } = useVoteSnap();

  const fetchStations = async () => {
    try {
      const data = await query<PollingStation>('SELECT * FROM polling_stations ORDER BY name');
      
      // If no data, use mock data for demonstration
      if (!data || data.length === 0) {
        const mockData = [
          {
            id: "1",
            name: "Central Station",
            district: "Downtown",
            created_at: new Date().toISOString()
          },
          {
            id: "2",
            name: "East Wing",
            district: "Eastside",
            created_at: new Date().toISOString()
          },
          {
            id: "3",
            name: "South County",
            district: "Rural",
            created_at: new Date().toISOString()
          }
        ];
        
        setStations(mockData);
        return;
      }
      
      setStations(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
      toast.error("Failed to load polling stations");
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStations();
    }
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!formData.name || !formData.district) {
        toast.error("Please complete all fields");
        setIsLoading(false);
        return;
      }
      
      if (isEditing && currentId) {
        await query(
          'UPDATE polling_stations SET name = ?, district = ? WHERE id = ?', 
          [formData.name, formData.district, currentId]
        );
        toast.success("Polling station updated successfully");
      } else {
        await insertQuery(
          'INSERT INTO polling_stations (name, district) VALUES (?, ?)', 
          [formData.name, formData.district]
        );
        toast.success("Polling station added successfully");
      }
      
      setFormData({ name: "", district: "" });
      setIsEditing(false);
      setCurrentId(null);
      
      await fetchStations();
      await refreshAvailableStations();
    } catch (error: any) {
      console.error("Error saving polling station:", error);
      toast.error(`Failed to save polling station: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (station: PollingStation) => {
    setFormData({
      name: station.name,
      district: station.district
    });
    setIsEditing(true);
    setCurrentId(station.id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this polling station?")) return;
    
    try {
      const uploads = await query<{id: string}>(
        'SELECT id FROM uploads WHERE station_id = ?', 
        [id]
      );
      
      if (uploads && uploads.length > 0) {
        return toast.error("Cannot delete a station with uploaded results");
      }
      
      await query('DELETE FROM polling_stations WHERE id = ?', [id]);
      toast.success("Polling station deleted successfully");
      await fetchStations();
      await refreshAvailableStations();
    } catch (error: any) {
      console.error("Error deleting polling station:", error);
      toast.error(`Failed to delete polling station: ${error.message || "Unknown error"}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-10 text-center">
        <p className="text-lg">You need to be logged in as an admin to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Polling Stations</h1>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Polling Station" : "Add New Polling Station"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Station Name</label>
                <Input 
                  id="name" 
                  placeholder="Enter station name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="glass-input"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="district" className="text-sm font-medium">District</label>
                <Input 
                  id="district" 
                  placeholder="Enter district"
                  value={formData.district}
                  onChange={(e) => setFormData({...formData, district: e.target.value})}
                  required
                  className="glass-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({ name: "", district: "" });
                    setIsEditing(false);
                    setCurrentId(null);
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex gap-2 items-center"
              >
                {isEditing ? "Update" : <><Plus size={16} /> Add</>} Station
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Polling Stations</CardTitle>
        </CardHeader>
        <CardContent>
          {stations.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No polling stations added yet</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {stations.map((station) => (
                <div 
                  key={station.id} 
                  className="flex items-center justify-between p-4 bg-white/40 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{station.name}</p>
                    <p className="text-sm text-muted-foreground">{station.district}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(station)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(station.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PollingStations;
