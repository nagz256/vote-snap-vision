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
import { supabase, filterOut } from "@/integrations/supabase/client";

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
      setIsLoading(true);
      
      // Always try to get from Supabase first
      const { data: stationsData, error } = await supabase
        .from('polling_stations')
        .select('*')
        .order('name');
        
      if (error) {
        console.error("Error fetching from Supabase:", error);
        throw error;
      }
      
      console.log("Fetched stations from Supabase:", stationsData?.length);
      
      if (stationsData && stationsData.length > 0) {
        // Filter out the demo data with IDs 1, 2, 3
        const filteredStations = stationsData.filter(
          station => !['1', '2', '3'].includes(station.id)
        );
        setStations(filteredStations);
        setIsLoading(false);
        return;
      }
      
      // If no Supabase data, fall back to MySQL
      try {
        const mysqlData = await query<PollingStation>('SELECT * FROM polling_stations ORDER BY name');
        
        if (mysqlData && mysqlData.length > 0) {
          // Filter out the demo data with IDs 1, 2, 3
          const filteredMysqlData = mysqlData.filter(
            station => !['1', '2', '3'].includes(station.id)
          );
          setStations(filteredMysqlData);
          setIsLoading(false);
          return;
        }
      } catch (mysqlError) {
        console.error("Error fetching from MySQL:", mysqlError);
      }
      
      // If we get here, show empty state
      setStations([]);
    } catch (error) {
      console.error("Error fetching stations:", error);
      toast.error("Failed to load polling stations");
    } finally {
      setIsLoading(false);
    }
  };

  // Run once when component mounts to clear out any demo data
  useEffect(() => {
    const clearDemoData = async () => {
      try {
        const mockIds = ["1", "2", "3"];
        
        // Try removing from Supabase first
        for (const id of mockIds) {
          await supabase.from('polling_stations').delete().eq('id', id);
        }
        
        // Try removing from MySQL as fallback
        for (const id of mockIds) {
          try {
            await query('DELETE FROM polling_stations WHERE id = ?', [id]);
          } catch (err) {
            console.log(`MySQL delete for mock ID ${id} failed, might not exist`);
          }
        }
        
        // Refresh available stations in context to sync with agent view
        await refreshAvailableStations();
      } catch (error) {
        console.error("Error clearing demo data:", error);
      }
    };
    
    if (isAdmin) {
      clearDemoData();
      fetchStations(); // Fetch once when component mounts
    }
  }, [isAdmin, refreshAvailableStations]);

  // Removed the automatic refresh interval that was causing constant refreshes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (!formData.name || !formData.district) {
        toast.error("Please complete all fields");
        setIsLoading(false);
        return;
      }
      
      // Try with Supabase first
      try {
        if (isEditing && currentId) {
          const { error } = await supabase
            .from('polling_stations')
            .update({ 
              name: formData.name, 
              district: formData.district 
            })
            .eq('id', currentId);
            
          if (error) throw error;
          toast.success("Polling station updated successfully");
        } else {
          const { error } = await supabase
            .from('polling_stations')
            .insert({ 
              name: formData.name, 
              district: formData.district 
            });
            
          if (error) throw error;
          toast.success("Polling station added successfully");
        }
        
        // Immediately update the local state to reflect changes
        if (isEditing && currentId) {
          setStations(prev => prev.map(station => 
            station.id === currentId ? 
              {...station, name: formData.name, district: formData.district} : 
              station
          ));
        } else {
          // For new stations, we need to fetch to get the new ID
          await fetchStations();
        }
      } catch (supabaseError) {
        console.error("Error saving via Supabase:", supabaseError);
        console.log("Falling back to MySQL for save operation");
        
        // Fallback to MySQL
        if (isEditing && currentId) {
          await query(
            'UPDATE polling_stations SET name = ?, district = ? WHERE id = ?', 
            [formData.name, formData.district, currentId]
          );
          
          // Update local state
          setStations(prev => prev.map(station => 
            station.id === currentId ? 
              {...station, name: formData.name, district: formData.district} : 
              station
          ));
          
          toast.success("Polling station updated successfully");
        } else {
          const result = await insertQuery(
            'INSERT INTO polling_stations (name, district) VALUES (?, ?)', 
            [formData.name, formData.district]
          );
          
          if (result && result.id) {
            // Add to local state with the new ID
            setStations(prev => [...prev, {
              id: result.id,
              name: formData.name,
              district: formData.district
            }]);
          }
          
          toast.success("Polling station added successfully");
        }
      }
      
      setFormData({ name: "", district: "" });
      setIsEditing(false);
      setCurrentId(null);
      
      // Refresh available stations in the context
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
    setIsLoading(true);
    try {
      // Check if station has uploads first
      try {
        const { data: uploads, error: uploadsError } = await supabase
          .from('uploads')
          .select('id')
          .eq('station_id', id);
          
        if (uploadsError) throw uploadsError;
        
        if (uploads && uploads.length > 0) {
          toast.error("Cannot delete a station with uploaded results");
          setIsLoading(false);
          return;
        }
        
        // Proceed with deletion
        const { error: deleteError } = await supabase
          .from('polling_stations')
          .delete()
          .eq('id', id);
          
        if (deleteError) throw deleteError;
        
        // Remove from local state immediately
        setStations(prev => prev.filter(station => station.id !== id));
        
        toast.success("Polling station deleted successfully");
        
        // Refresh available stations in context to sync with agent view
        await refreshAvailableStations();
      } catch (supabaseError) {
        console.error("Error with Supabase deletion:", supabaseError);
        console.log("Falling back to MySQL for deletion");
        
        // Fallback to MySQL
        const uploads = await query<{id: string}>(
          'SELECT id FROM uploads WHERE station_id = ?', 
          [id]
        );
        
        if (uploads && uploads.length > 0) {
          toast.error("Cannot delete a station with uploaded results");
          return;
        }
        
        await query('DELETE FROM polling_stations WHERE id = ?', [id]);
        
        // Remove from local state
        setStations(prev => prev.filter(station => station.id !== id));
        
        toast.success("Polling station deleted successfully");
        
        // Refresh available stations in context to sync with agent view
        await refreshAvailableStations();
      }
    } catch (error: any) {
      console.error("Error deleting polling station:", error);
      toast.error(`Failed to delete polling station: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
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
        <Button onClick={fetchStations} variant="outline" disabled={isLoading}>
          Refresh
        </Button>
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
                  disabled={isLoading}
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
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : stations.length === 0 ? (
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
                      disabled={isLoading}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(station.id)}
                      disabled={isLoading}
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
