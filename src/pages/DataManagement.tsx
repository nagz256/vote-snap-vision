
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useVoteSnap } from "@/context/VoteSnapContext";

// Define valid table names as a type for type safety
type ValidTableName = "uploads" | "results" | "voter_statistics" | "candidates" | "polling_stations";

const DataManagement = () => {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const { refreshAvailableStations } = useVoteSnap();

  const tables = [
    { id: "all", name: "All Data" },
    { id: "uploads", name: "Uploads" },
    { id: "results", name: "Results" },
    { id: "voter_statistics", name: "Voter Statistics" },
    { id: "candidates", name: "Candidates" },
    { id: "polling_stations", name: "Polling Stations" }
  ];

  const handleDeleteClick = () => {
    if (!selectedTable) {
      toast.error("Please select what data to delete");
      return;
    }
    setShowDialog(true);
  };

  const handleReset = async () => {
    try {
      setIsDeleting(true);
      setShowDialog(false);
      
      if (selectedTable === "all") {
        console.log("Deleting all data...");
        
        // Delete all results first due to foreign key constraints
        const { error: resultsError } = await supabase
          .from('results')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (resultsError) throw resultsError;
        
        // Delete all voter statistics
        const { error: statsError } = await supabase
          .from('voter_statistics')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (statsError) throw statsError;
        
        // Delete all uploads
        const { error: uploadsError } = await supabase
          .from('uploads')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (uploadsError) throw uploadsError;
          
        // Delete all candidates
        const { error: candidatesError } = await supabase
          .from('candidates')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (candidatesError) throw candidatesError;
          
        toast.success("All data has been successfully deleted");
      } else {
        // Type checking to ensure we only use valid table names
        const validTables: ValidTableName[] = ["uploads", "results", "voter_statistics", "candidates", "polling_stations"];
        if (validTables.includes(selectedTable as ValidTableName)) {
          console.log(`Deleting all ${selectedTable}...`);
          
          try {
            // Use type assertion to let TypeScript know this is a valid table name
            const { error } = await supabase
              .from(selectedTable as ValidTableName)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
              
            if (error) throw error;
            
            toast.success(`All ${selectedTable} have been successfully deleted`);
          } catch (error: any) {
            console.error(`Error deleting from ${selectedTable}:`, error);
            toast.error(`Failed to delete ${selectedTable}: The table might have dependencies`);
          }
        } else {
          throw new Error("Invalid table selected");
        }
      }
      
      // Refresh available stations after data deletion
      if (selectedTable === "all" || selectedTable === "uploads") {
        await refreshAvailableStations();
      }
    } catch (error: any) {
      console.error("Error deleting data:", error);
      toast.error(`Failed to delete: ${error.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center mb-6">
        <Link to="/admin" className="flex items-center text-sm text-muted-foreground hover:text-foreground mr-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Admin
        </Link>
        <h1 className="text-2xl font-bold">Data Management</h1>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 text-amber-500" size={18} />
            Delete Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
              <div className="flex items-start">
                <AlertCircle className="text-amber-600 mr-2 mt-0.5" size={16} />
                <p className="text-sm text-amber-800">
                  Warning: Deleting data is permanent and cannot be undone. Please proceed with caution.
                </p>
              </div>
            </div>
            
            <div className="grid gap-4">
              <div>
                <label htmlFor="table-select" className="block text-sm font-medium mb-1">
                  Select data to delete:
                </label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger id="table-select" className="w-full">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map(table => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="destructive" 
                onClick={handleDeleteClick}
                disabled={isDeleting || !selectedTable}
                className="w-full"
              >
                {isDeleting ? "Deleting..." : "Delete Selected Data"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTable === "all" ? "all data" : `all ${selectedTable}`}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReset}>
              Yes, Delete Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataManagement;
