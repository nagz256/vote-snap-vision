
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVoteSnap } from "@/context/VoteSnapContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Eye, LogOut } from "lucide-react";

const Admin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [totalVotesData, setTotalVotesData] = useState<Array<{ name: string; votes: number }>>([]);
  const [percentageData, setPercentageData] = useState<Array<{ name: string; votes: number; percentage: string }>>([]);
  
  const { isAdmin, login, logout, uploads, getTotalVotes } = useVoteSnap();

  // Fetch total votes data when admin logs in
  useEffect(() => {
    if (isAdmin) {
      fetchTotalVotes();
    }
  }, [isAdmin]);

  const fetchTotalVotes = async () => {
    try {
      const data = await getTotalVotes();
      setTotalVotesData(data);
      
      // Calculate percentage data
      const totalVotes = data.reduce((sum, item) => sum + item.votes, 0);
      const percentData = data.map(item => ({
        ...item,
        percentage: ((item.votes / totalVotes) * 100).toFixed(1)
      }));
      setPercentageData(percentData);
    } catch (error) {
      console.error("Error fetching vote data:", error);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      setLoginError("");
    } else {
      setLoginError("Invalid username or password");
    }
  };

  const COLORS = ['#9b87f5', '#7E69AB', '#D6BCFA', '#6357b5'];
  
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-10">
        <div className="glass-container">
          <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">
                Username
              </label>
              <Input
                id="username"
                className="glass-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
            
            <div className="pt-2">
              <Button className="glass-button w-full" type="submit">
                Login
              </Button>
            </div>
            
            <p className="text-xs text-foreground/70 text-center pt-2">
              Demo credentials: username "admin" / password "password123"
            </p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={logout}>
          <LogOut size={16} />
          Logout
        </Button>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Percentage Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Vote Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
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
            </div>
          </CardContent>
        </Card>
        
        {/* Total Votes Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Total Votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
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
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Live Feed */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Live Submission Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto pr-2">
            {uploads.length === 0 ? (
              <p className="text-center text-foreground/70 py-6">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {uploads.map(upload => (
                  <div key={upload.id} className="flex items-center justify-between p-3 bg-white/40 rounded-lg">
                    <div>
                      <p className="font-medium">{upload.station?.name}</p>
                      <p className="text-sm text-foreground/70">
                        {formatDistanceToNow(parseISO(upload.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <Eye size={16} />
                      View
                    </Button>
                  </div>
                )).reverse()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Polling Stations */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Polling Station Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uploads.map(upload => (
              <Card key={upload.id} className="bg-white/40 border-white/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{upload.station?.name}</CardTitle>
                  <p className="text-xs text-foreground/70">{upload.station?.district}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {upload.results?.map((result, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{result.candidateName}</span>
                        <span className="font-medium">{result.votes}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
