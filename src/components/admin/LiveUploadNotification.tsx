
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase, hasError, safeDataSingle } from "@/integrations/supabase/client";
import { Bell, ChartBar, Users } from "lucide-react";

const LiveUploadNotification = () => {
  // Set up a subscription for real-time notifications
  useEffect(() => {
    // Channel for upload notifications
    const uploadsChannel = supabase
      .channel('upload-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'uploads' 
      }, async (payload) => {
        try {
          if (!payload.new || !payload.new.station_id) {
            console.error("Invalid payload received:", payload);
            return;
          }

          // Get station info
          const { data: stationData, error } = await supabase
            .from('polling_stations')
            .select('name')
            .eq('id', payload.new.station_id)
            .single();
            
          // Check if there's an error or no data
          if (error || !stationData) {
            console.error("Error fetching station data:", error);
            return;
          }
          
          const stationName = stationData?.name || 'Unknown station';
          
          // Show notification
          toast(
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="font-medium">New Results Uploaded</p>
                <p className="text-sm text-muted-foreground">
                  {stationName} has submitted new results
                </p>
              </div>
            </div>,
            {
              duration: 5000,
              action: {
                label: "View",
                onClick: () => {
                  // Redirect to admin dashboard or direct to the upload
                  window.location.href = '/admin';
                }
              }
            }
          );
        } catch (error) {
          console.error("Error processing upload notification:", error);
        }
      })
      .subscribe();
    
    // Channel for voter statistics notifications
    const statsChannel = supabase
      .channel('stats-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'voter_statistics' 
      }, async () => {
        toast(
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <p className="font-medium">Voter Statistics Updated</p>
              <p className="text-sm text-muted-foreground">
                New voter statistics have been recorded
              </p>
            </div>
          </div>,
          { duration: 4000 }
        );
      })
      .subscribe();
      
    // Channel for results notifications
    const resultsChannel = supabase
      .channel('results-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'results' 
      }, async () => {
        toast(
          <div className="flex items-center gap-3">
            <ChartBar className="h-5 w-5 text-purple-500" />
            <div className="flex-1">
              <p className="font-medium">Election Results Updated</p>
              <p className="text-sm text-muted-foreground">
                New voting results have been recorded
              </p>
            </div>
          </div>,
          { duration: 4000 }
        );
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(uploadsChannel);
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(resultsChannel);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default LiveUploadNotification;
