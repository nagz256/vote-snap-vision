
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface StationResult {
  id: string;
  station: {
    name: string;
    district: string;
  };
  results: Array<{
    candidateName: string;
    votes: number;
  }>;
}

const StationResultCard = ({ stationResult }: { stationResult: StationResult }) => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Card className="bg-white/40 border-white/30 shadow-md hover:shadow-lg transition-all cursor-pointer">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{stationResult.station?.name}</CardTitle>
            <p className="text-xs text-foreground/70">{stationResult.station?.district}</p>
          </CardHeader>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <CardTitle className="text-base mb-2">{stationResult.station?.name} Results</CardTitle>
        <div className="space-y-2">
          {stationResult.results?.map((result, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>{result.candidateName}</span>
              <span className="font-medium">{result.votes}</span>
            </div>
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default StationResultCard;
