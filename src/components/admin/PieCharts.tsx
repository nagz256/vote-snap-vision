
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Eye, RefreshCw } from "lucide-react"; 
import { Button } from "@/components/ui/button";

// Updated colors with better contrast for visibility
const COLORS = ['#8884d8', '#82ca9d', '#ff7300', '#0088FE', '#00C49F', '#FFBB28'];

const PieCharts = () => {
  const [totalVotesData, setTotalVotesData] = useState<Array<{ name: string; votes: number }>>([]);
  const [percentageData, setPercentageData] = useState<Array<{ name: string; votes: number; percentage: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { getTotalVotes } = useVoteSnap();
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      console.log("Fetching vote data for charts...");
      
      const voteData = await getTotalVotes();
      console.log("Fetched total votes data:", voteData);
      
      if (voteData && voteData.length > 0) {
        // Sort data by votes (descending) for better visualization
        const sortedData = [...voteData].sort((a, b) => b.votes - a.votes);
        setTotalVotesData(sortedData);
        
        // Calculate percentage data
        const totalVotesSum = sortedData.reduce((sum, item) => sum + item.votes, 0);
        const percentData = sortedData.map(item => ({
          ...item,
          percentage: ((item.votes / Math.max(totalVotesSum, 1)) * 100).toFixed(1)
        }));
        
        setPercentageData(percentData);
        setLastRefresh(new Date());
        
        console.log("Chart data processed:", { sortedData, percentData });
      } else {
        console.log("No vote data returned or empty array");
        // Use placeholder data when no real data is available
        const placeholderData = [
          { name: "No Data Available", votes: 1 }
        ];
        
        setTotalVotesData(placeholderData);
        setPercentageData(placeholderData.map(item => ({
          ...item,
          percentage: "100.0"
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
      
      // Use placeholder data on error
      const errorData = [
        { name: "Error Loading Data", votes: 1 }
      ];
      
      setTotalVotesData(errorData);
      setPercentageData(errorData.map(item => ({
        ...item,
        percentage: "100.0"
      })));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up interval to refresh data every 15 seconds
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 15000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
      >
        {`${name}: ${value}`}
      </text>
    );
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
  
  const noData = totalVotesData.length === 0 || (totalVotesData.length === 1 && totalVotesData[0].name === "No Data Available");

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
        <div className="flex items-center">
          <Eye size={14} className="mr-1" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
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
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Percentage Chart */}
        <Card className="glass-card shadow-md">
          <CardHeader>
            <CardTitle>Vote Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {!noData ? (
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
              {!noData ? (
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
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No vote data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PieCharts;
