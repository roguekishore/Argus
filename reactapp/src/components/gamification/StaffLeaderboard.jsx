/**
 * StaffLeaderboard Component
 * 
 * Displays the staff performance leaderboard.
 * Shows rank, name, department, composite score, and metrics breakdown.
 * 
 * Usage:
 * <StaffLeaderboard limit={10} departmentId={null} />
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Award, Timer, Star, CheckCircle2, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import gamificationService from '../../services/api/gamificationService';

const StaffLeaderboard = ({ 
  limit = 10, 
  departmentId = null, 
  showTitle = true, 
  compact = false,
  showDepartment = true 
}) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const data = await gamificationService.getStaffLeaderboard(limit, departmentId);
        console.log('[StaffLeaderboard] API Response:', data);
        const leaderboardData = Array.isArray(data) ? data : (data?.data || data?.content || []);
        setLeaderboard(leaderboardData);
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error('Staff leaderboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit, departmentId]);

  const getRankDisplay = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 40) return 'text-blue-600';
    if (score >= 20) return 'text-yellow-600';
    return 'text-gray-600';
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
            <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No staff rankings yet.</p>
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
            Staff Performance
            {departmentId && <Badge variant="outline">Filtered</Badge>}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? 'p-3' : 'p-6'}>
        <div className="space-y-4">
          {leaderboard.map((staff) => (
            <div
              key={staff.userId}
              className={`p-4 rounded-lg border ${
                staff.rank <= 3 ? 'bg-muted/50 border-primary/20' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="text-xl font-bold w-12 text-center">
                  {getRankDisplay(staff.rank)}
                </div>

                {/* Name & Department */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{staff.name}</p>
                  {showDepartment && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {staff.departmentName}
                    </p>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <CheckCircle2 className="h-4 w-4 mx-auto text-green-500" />
                    <span className="text-xs">{staff.complaintsResolved} closed</span>
                  </div>
                  <div className="text-center">
                    <Timer className="h-4 w-4 mx-auto text-blue-500" />
                    <span className="text-xs">+{Math.round(staff.speedScore || 0)} deadline</span>
                  </div>
                  <div className="text-center">
                    <Star className="h-4 w-4 mx-auto text-yellow-500" />
                    <span className="text-xs">+{Math.round(staff.satisfactionScore || 0)} rating</span>
                  </div>
                </div>

                {/* Total Points */}
                <div className="text-right">
                  <span className={`text-2xl font-bold ${getScoreColor(staff.compositeScore)}`}>
                    {Math.round(staff.compositeScore)}
                  </span>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>

              {/* Score Breakdown (non-compact) */}
              {!compact && (
                <div className="mt-3 flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">⏱️ Before deadline:</span>
                    <span className="font-medium">{Math.round(staff.resolvedScore || 0)} × +10pts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">⭐ Avg rating:</span>
                    <span className="font-medium">{(staff.avgResolutionHours || 0).toFixed(1)}/5</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StaffLeaderboard;
