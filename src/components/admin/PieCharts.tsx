import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Eye, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { query } from "@/integrations/mysql/client";
import { Link } from "react-router-dom";

// Updated colors with better contrast for visibility
const COLORS = ['#8884d8', '#82ca9d', '#ff7300', '#0088FE', '#00C49F', '#FFBB28'];

const EmptyDataDisplay = () => (
  <div className="flex flex-col items-center justify-center h-full py-8">
    <AlertCircle className="text-amber-500 mb-2" size={32} />
    <h3 className="text-lg font-medium">No Data Available</h3>
    <p className="text-sm text-muted-foreground text-center mt-1">
      Submit form data from the Agent Portal to see results here.
    </p>
  </div>
);

const PieCharts = () => {
  const [totalVotesData, setTotalVotesData] = useState<Array<{ name: string; votes: number }>>([]);
  const [percentageData, setPercentageData] = useState<Array<{ name: string; votes: number; percentage: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [hasData, setHasData] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      console.log("Fetching vote data for charts...");
      
      // Get all results with candidate info
      const resultsData = await query(`
        SELECT r.votes, c.id, c.name
        FROM results r
        JOIN candidates c ON r.candidate_id = c.id
        WHERE r.votes > 0
      `);
      
      if (!resultsData || resultsData.length === 0) {
        console.log("No vote data found");
        setHasData(false);
        setTotalVotesData([]);
        setPercentageData([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }
      
      // Aggregate votes by candidate name
      const votesByCandidate: Record<string, number> = {};
      
      resultsData.forEach((result: any) => {
        if (result.name && result.votes > 0) {
          const candidateName = result.name;
          votesByCandidate[candidateName] = (votesByCandidate[candidateName] || 0) + result.votes;
        }
      });
      
      // Convert to array format for the charts
      const voteData = Object.entries(votesByCandidate)
        .map(([name, votes]) => ({ name, votes }))
        .sort((a, b) => b.votes - a.votes); // Sort by votes descending
      
      console.log("Processed vote data:", voteData);
      
      if (voteData.length > 0) {
        setTotalVotesData(voteData);
        setHasData(true);
        
        // Calculate percentage data
        const totalVotesSum = voteData.reduce((sum, item) => sum + item.votes, 0);
        const percentData = voteData.map(item => ({
          ...item,
          percentage: ((item.votes / Math.max(totalVotesSum, 1)) * 100).toFixed(1)
        }));
        
        setPercentageData(percentData);
      } else {
        setHasData(false);
        setTotalVotesData([]);
        setPercentageData([]);
      }
      
      setLastRefresh(new Date());
      
    } catch (error) {
      console.error("Error fetching vote data:", error);
      toast({
        title: "Error loading data",
        description: "Failed to load voting results. Please try again later.",
        variant: "destructive"
      });
      
      setHasData(false);
      setTotalVotesData([]);
      setPercentageData([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up a periodic refresh (every 30 seconds)
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
        <div className="flex items-center">
          <Eye size={14} className="mr-1" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={fetchData}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="flex items-center gap-1"
          >
            <Link to="/data-management">Manage Data</Link>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Percentage Chart */}
        <Card className="glass-card shadow-md">
          <CardHeader>
            <CardTitle>Vote Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {hasData && percentageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={percentageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="votes"
                      nameKey="name"
                      label={({name, percentage}) => `${name}: ${percentage}%`}
                    >
                      {percentageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${props.payload.percentage}%`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyDataDisplay />
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Total Votes Chart */}
        <Card className="glass-card shadow-md">
          <CardHeader>
            <CardTitle>Total Votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {hasData && totalVotesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={totalVotesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="votes"
                      nameKey="name"
                      label={({name, value}) => `${name}: ${value}`}
                    >
                      {totalVotesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyDataDisplay />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PieCharts;
