/**
 * PointsBadge Component
 * 
 * Displays a citizen's current points, tier, and benefits.
 * Can be used in header, profile, or dashboard.
 * 
 * Usage:
 * <PointsBadge citizenId={userId} />
 * <PointsBadge citizenId={userId} compact />
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Star, ArrowUp, Zap, Eye } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import gamificationService from '../../services/api/gamificationService';

// Tier styling
const TIER_STYLES = {
  PLATINUM: { bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'text-white', border: 'border-purple-400' },
  GOLD: { bg: 'bg-gradient-to-r from-yellow-400 to-orange-500', text: 'text-white', border: 'border-yellow-400' },
  SILVER: { bg: 'bg-gradient-to-r from-gray-300 to-gray-400', text: 'text-gray-800', border: 'border-gray-400' },
  BRONZE: { bg: 'bg-gradient-to-r from-orange-300 to-orange-400', text: 'text-white', border: 'border-orange-400' },
};

const PointsBadge = ({ citizenId, compact = false, showProgress = true }) => {
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!citizenId) return;
      try {
        const data = await gamificationService.getCitizenPoints(citizenId);
        console.log('[PointsBadge] API Response:', data);
        setPointsData(data);
      } catch (err) {
        console.error('Failed to fetch points:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPoints();
  }, [citizenId]);

  if (loading || !pointsData) {
    return null; // Silent fail - don't show anything if loading or no data
  }

  const tierStyle = TIER_STYLES[pointsData.tier] || TIER_STYLES.BRONZE;

  // Compact version for headers/sidebars
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${tierStyle.bg} ${tierStyle.text} text-xs font-medium cursor-help`}>
              <Star className="h-3 w-3" />
              <span>{pointsData.currentPoints}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p className="font-medium">{pointsData.tier} Tier</p>
              <p>{pointsData.currentPoints} points • Rank #{pointsData.rank}</p>
              {pointsData.priorityBoost && (
                <p className="text-green-500 flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" /> Priority Boost Active
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full version for dashboard/profile
  return (
    <Card className={`border-2 ${tierStyle.border}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tierStyle.bg}`}>
              <Trophy className={`h-5 w-5 ${tierStyle.text}`} />
            </div>
            <div>
              <p className="font-bold text-lg">{pointsData.currentPoints} Points</p>
              <p className="text-sm text-muted-foreground">Rank #{pointsData.rank}</p>
            </div>
          </div>
          <Badge className={`${tierStyle.bg} ${tierStyle.text} border-0`}>
            {pointsData.tier}
          </Badge>
        </div>

        {/* Benefits */}
        <div className="flex gap-2 mb-3">
          {pointsData.priorityBoost && (
            <Badge variant="outline" className="text-xs flex items-center gap-1 text-green-600 border-green-600">
              <Zap className="h-3 w-3" />
              Priority Boost
            </Badge>
          )}
          {pointsData.visibleOnLeaderboard && (
            <Badge variant="outline" className="text-xs flex items-center gap-1 text-blue-600 border-blue-600">
              <Eye className="h-3 w-3" />
              On Leaderboard
            </Badge>
          )}
        </div>

        {/* Progress to next tier */}
        {showProgress && pointsData.nextTier && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to {pointsData.nextTier}</span>
              <span>{pointsData.pointsToNextTier} pts to go</span>
            </div>
            <Progress 
              value={100 - (pointsData.pointsToNextTier / getTierRange(pointsData.tier) * 100)} 
              className="h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper to get tier range for progress calculation
const getTierRange = (tier) => {
  switch (tier) {
    case 'BRONZE': return 100;
    case 'SILVER': return 100;
    case 'GOLD': return 300;
    default: return 100;
  }
};

export default PointsBadge;
