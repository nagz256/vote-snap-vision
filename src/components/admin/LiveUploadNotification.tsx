
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";

const LiveUploadNotification = () => {
  // Set up a subscription for real-time notifications
  useEffect(() => {
    const channel = supabase
      .channel('upload-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'uploads' 
      }, async (payload) => {
        // Get station info
        const { data: stationData } = await supabase
          .from('polling_stations')
          .select('name')
          .eq('id', payload.new.station_id)
          .single();
          
        const stationName = stationData?.name || 'Unknown station';
        
        // Show notification
        toast((t) => (
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-blue-500" />
            <div className="flex-1">
              <p className="font-medium">New Results Uploaded</p>
              <p className="text-sm text-muted-foreground">
                {stationName} has submitted new results
              </p>
            </div>
          </div>
        ), {
          duration: 5000,
          action: {
            label: "View",
            onClick: () => {
              // Redirect to admin dashboard or direct to the upload
              // This is a placeholder functionality
              window.location.href = '/admin';
            }
          }
        });
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default LiveUploadNotification;
