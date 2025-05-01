
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const COLORS = ['#9b87f5', '#7E69AB', '#D6BCFA', '#6357b5', '#b380ff', '#8c44ff'];

const PieCharts = () => {
  const [totalVotesData, setTotalVotesData] = useState<Array<{ name: string; votes: number }>>([]);
  const [percentageData, setPercentageData] = useState<Array<{ name: string; votes: number; percentage: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getTotalVotes } = useVoteSnap();
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
    
    // Set up interval to refresh data every 10 seconds
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 10000);
    
    return () => clearInterval(refreshInterval);
  }, []);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const voteData = await getTotalVotes();
      console.log("Fetched total votes data:", voteData);
      
      if (voteData && voteData.length > 0) {
        setTotalVotesData(voteData);
        
        // Calculate percentage data
        const totalVotesSum = voteData.reduce((sum, item) => sum + item.votes, 0);
        const percentData = voteData.map(item => ({
          ...item,
          percentage: ((item.votes / Math.max(totalVotesSum, 1)) * 100).toFixed(1)
        }));
        
        setPercentageData(percentData);
      } else {
        console.log("No vote data returned or empty array");
        // Use placeholder data when no real data is available
        const placeholderData = [
          { name: "Candidate A", votes: 0 },
          { name: "Candidate B", votes: 0 }
        ];
        
        setTotalVotesData(placeholderData);
        setPercentageData(placeholderData.map(item => ({
          ...item,
          percentage: "0.0"
        })));
        
        toast({
          title: "No vote data available",
          description: "There are no voting results to display yet.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error("Error fetching vote data:", error);
      toast({
        title: "Error loading data",
        description: "Failed to load voting results. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-card shadow-md">
          <CardHeader>
            <CardTitle>Vote Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card shadow-md">
          <CardHeader>
            <CardTitle>Total Votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Percentage Chart */}
      <Card className="glass-card shadow-md">
        <CardHeader>
          <CardTitle>Vote Percentage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {percentageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={percentageData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="votes"
                    nameKey="name"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {percentageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} votes`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No vote data available</p>
              </div>
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
            {totalVotesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={totalVotesData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="votes"
                    nameKey="name"
                    label={({ name, votes }) => `${name}: ${votes}`}
                  >
                    {totalVotesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} votes`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No vote data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PieCharts;
