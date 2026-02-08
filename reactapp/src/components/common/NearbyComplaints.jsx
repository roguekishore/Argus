/**
 * NearbyComplaints - Community complaints view
 * 
 * Shows complaints near the user's location that they can upvote ("Me Too").
 * Helps prevent duplicate complaints by showing existing issues.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '../ui/card';
import { Button } from '../ui/button';
import { 
  MapPin, 
  ThumbsUp, 
  Users, 
  Navigation, 
  Loader2,
  AlertCircle,
  Clock,
  Tag,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import communityService from '../../services/api/communityService';

// Status badge colors
const STATUS_COLORS = {
  FILED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  PENDING_SIGNOFF: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const NearbyComplaints = ({ userId, className }) => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [upvotingIds, setUpvotingIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('nearby'); // 'nearby' | 'trending'

  // Get user's location
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (err) => {
        setError('Unable to get your location. Please enable location access.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Fetch nearby complaints
  const fetchNearbyComplaints = useCallback(async () => {
    if (!userLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await communityService.getNearby(
        userLocation.lat,
        userLocation.lng,
        2000, // 2km radius
        userId
      );
      setComplaints(data || []);
    } catch (err) {
      console.error('Failed to fetch nearby complaints:', err);
      setError('Failed to load nearby complaints');
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, userId]);

  // Fetch trending complaints
  const fetchTrendingComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await communityService.getTrending(userId, 10);
      setComplaints(data || []);
    } catch (err) {
      console.error('Failed to fetch trending complaints:', err);
      setError('Failed to load trending complaints');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Auto-get location on mount
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  // Fetch complaints when location changes or view mode changes
  useEffect(() => {
    if (viewMode === 'nearby' && userLocation) {
      fetchNearbyComplaints();
    } else if (viewMode === 'trending') {
      fetchTrendingComplaints();
    }
  }, [viewMode, userLocation, fetchNearbyComplaints, fetchTrendingComplaints]);

  // Handle upvote
  const handleUpvote = async (complaintId) => {
    if (!userId) {
      setError('Please log in to upvote');
      return;
    }

    setUpvotingIds(prev => new Set([...prev, complaintId]));

    try {
      const updated = await communityService.upvote(
        complaintId, 
        userId,
        userLocation?.lat,
        userLocation?.lng
      );
      
      // Update local state
      setComplaints(prev => prev.map(c => 
        c.complaintId === complaintId ? updated : c
      ));
    } catch (err) {
      console.error('Upvote failed:', err);
      if (err.message?.includes('Already upvoted')) {
        // Already upvoted, just update UI
      } else if (err.message?.includes('own complaint')) {
        setError("You can't upvote your own complaint");
      } else {
        setError('Failed to upvote');
      }
    } finally {
      setUpvotingIds(prev => {
        const next = new Set(prev);
        next.delete(complaintId);
        return next;
      });
    }
  };

  // Handle remove upvote
  const handleRemoveUpvote = async (complaintId) => {
    setUpvotingIds(prev => new Set([...prev, complaintId]));

    try {
      const updated = await communityService.removeUpvote(complaintId, userId);
      setComplaints(prev => prev.map(c => 
        c.complaintId === complaintId ? updated : c
      ));
    } catch (err) {
      console.error('Remove upvote failed:', err);
    } finally {
      setUpvotingIds(prev => {
        const next = new Set(prev);
        next.delete(complaintId);
        return next;
      });
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community Complaints
            </CardTitle>
            <CardDescription className="mt-1">
              See issues in your area and show support with "Me Too"
            </CardDescription>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={viewMode === 'nearby' ? fetchNearbyComplaints : fetchTrendingComplaints}
            disabled={isLoading}
            className="self-start sm:self-auto"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={viewMode === 'nearby' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('nearby')}
            className="flex-1 sm:flex-none"
          >
            <MapPin className="h-4 w-4 mr-1" />
            Nearby
          </Button>
          <Button
            variant={viewMode === 'trending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('trending')}
            className="flex-1 sm:flex-none"
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Trending
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location Status */}
        {viewMode === 'nearby' && !userLocation && (
          <div className="text-center py-6">
            <Button
              onClick={getUserLocation}
              disabled={isLocating}
              variant="outline"
            >
              <Navigation className={cn("h-4 w-4 mr-2", isLocating && "animate-pulse")} />
              {isLocating ? 'Getting location...' : 'Enable Location'}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              We need your location to show nearby complaints
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && complaints.length === 0 && (viewMode === 'trending' || userLocation) && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No complaints found {viewMode === 'nearby' ? 'in your area' : ''}</p>
            <p className="text-sm">Be the first to report an issue!</p>
          </div>
        )}

        {/* Complaints List */}
        {!isLoading && complaints.length > 0 && (
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <div
                key={complaint.complaintId}
                className="p-3 sm:p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title and Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        #{complaint.complaintId}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        STATUS_COLORS[complaint.status] || 'bg-gray-100 text-gray-700'
                      )}>
                        {complaint.status?.replace('_', ' ')}
                      </span>
                      {complaint.upvoteCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                          <ThumbsUp className="h-3 w-3" />
                          {complaint.upvoteCount} affected
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="font-medium mt-1 line-clamp-1">
                      {complaint.title}
                    </h4>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {complaint.description}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-muted-foreground">
                      {complaint.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {complaint.location.length > 30 
                            ? complaint.location.substring(0, 30) + '...'
                            : complaint.location
                          }
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {complaint.categoryName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(complaint.createdTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Upvote Button */}
                  <div className="flex-shrink-0">
                    {complaint.citizenId === userId ? (
                      <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
                        Your complaint
                      </span>
                    ) : complaint.hasUserUpvoted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveUpvote(complaint.complaintId)}
                        disabled={upvotingIds.has(complaint.complaintId)}
                        className="text-green-600 border-green-300"
                      >
                        {upvotingIds.has(complaint.complaintId) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ThumbsUp className="h-4 w-4 mr-1 fill-current" />
                            Supported
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpvote(complaint.complaintId)}
                        disabled={upvotingIds.has(complaint.complaintId)}
                      >
                        {upvotingIds.has(complaint.complaintId) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Me Too
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NearbyComplaints;
