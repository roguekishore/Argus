/**
 * CitizenLeaderboard Component
 * 
 * Displays the public leaderboard of responsible citizens.
 * Shows rank, name (masked), points, tier, and stats.
 * 
 * Usage:
 * <CitizenLeaderboard limit={10} />
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import gamificationService from '../../services/api/gamificationService';
import { maskPhoneNumber } from '../../lib/utils';

// Tier colors and icons
const TIER_CONFIG = {
  PLATINUM: { color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: Trophy, text: 'text-purple-600' },
  GOLD: { color: 'bg-gradient-to-r from-yellow-400 to-orange-500', icon: Medal, text: 'text-yellow-600' },
  SILVER: { color: 'bg-gradient-to-r from-gray-300 to-gray-400', icon: Award, text: 'text-gray-600' },
  BRONZE: { color: 'bg-gradient-to-r from-orange-300 to-orange-400', icon: Star, text: 'text-orange-600' },
};

const CitizenLeaderboard = ({ limit = 10, showTitle = true, compact = false }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await gamificationService.getCitizenLeaderboard(limit);
        console.log('[CitizenLeaderboard] API Response:', data);
        // Handle both array and object with data property
        const leaderboardData = Array.isArray(data) ? data : (data?.data || data?.content || []);
        setLeaderboard(leaderboardData);
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error('Leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  const getRankDisplay = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const TierIcon = ({ tier }) => {
    const config = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.text}`} />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No leaders yet! File complaints to earn points.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Responsible Citizens
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? 'p-3' : 'p-6'}>
        <div className="space-y-3">
          {leaderboard.map((citizen) => {
            const tierConfig = TIER_CONFIG[citizen.tier] || TIER_CONFIG.BRONZE;
            
            return (
              <div
                key={citizen.userId}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border ${
                  citizen.rank <= 3 ? 'bg-muted/50' : ''
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Rank */}
                  <div className="text-lg font-bold w-8 sm:w-10 text-center">
                    {getRankDisplay(citizen.rank)}
                  </div>

                  {/* Tier Badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tierConfig.color}`}>
                    <TierIcon tier={citizen.tier} />
                  </div>

                  {/* Name & Mobile */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{citizen.name}</p>
                    <p className="text-xs text-muted-foreground">{maskPhoneNumber(citizen.mobile)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pl-11 sm:pl-0">
                  {/* Stats */}
                  {!compact && (
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{citizen.totalComplaints} filed</p>
                      <p>{citizen.resolvedComplaints} resolved</p>
                    </div>
                  )}

                  {/* Points */}
                  <div className="text-right">
                    <Badge variant="secondary" className="font-bold">
                      {citizen.points} pts
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CitizenLeaderboard;
