
import React from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { InfoIcon } from "lucide-react";

interface VoterStatisticsProps {
  maleVoters: number;
  femaleVoters: number;
  wastedBallots: number;
  totalVoters: number;
  onUpdate: (field: string, value: number) => void;
}

const VoterStatistics = ({ maleVoters, femaleVoters, wastedBallots, totalVoters, onUpdate }: VoterStatisticsProps) => {
  return (
    <Card className="glass-card shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Voter Statistics</CardTitle>
        <HoverCard>
          <HoverCardTrigger asChild>
            <InfoIcon size={16} className="text-muted-foreground cursor-help" />
          </HoverCardTrigger>
          <HoverCardContent className="w-80 text-sm">
            <p>Enter the number of male and female voters along with wasted ballots from this polling station. 
            The total will be calculated automatically.</p>
          </HoverCardContent>
        </HoverCard>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="male-voters" className="text-sm font-medium">
              Male Voters
            </label>
            <Input
              id="male-voters"
              type="number"
              min="0"
              value={maleVoters}
              onChange={(e) => onUpdate('maleVoters', parseInt(e.target.value) || 0)}
              className="glass-input"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="female-voters" className="text-sm font-medium">
              Female Voters
            </label>
            <Input
              id="female-voters"
              type="number"
              min="0"
              value={femaleVoters}
              onChange={(e) => onUpdate('femaleVoters', parseInt(e.target.value) || 0)}
              className="glass-input"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="wasted-ballots" className="text-sm font-medium">
              Wasted Ballots
            </label>
            <Input
              id="wasted-ballots"
              type="number"
              min="0"
              value={wastedBallots}
              onChange={(e) => onUpdate('wastedBallots', parseInt(e.target.value) || 0)}
              className="glass-input"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="total-voters" className="text-sm font-medium">
              Total Voters
            </label>
            <Input
              id="total-voters"
              type="number"
              min="0"
              value={totalVoters}
              readOnly
              className="glass-input bg-gray-50 font-medium"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoterStatistics;
