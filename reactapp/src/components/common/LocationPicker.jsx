/**
 * LocationPicker - Interactive map component for precise location capture
 * 
 * Features:
 * - Draggable pin for precise location selection
 * - Click to place marker
 * - Shows current coordinates
 * - Uses Leaflet (free, no API key required)
 * - Defaults to user's current location if available
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

// Fix for default marker icon not showing in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom red marker for complaint location
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Default center (India - can be changed to your city)
const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 16;

// =============================================================================
// MAP EVENT HANDLER COMPONENT
// =============================================================================
const MapEventHandler = ({ onLocationSelect, markerPosition }) => {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      onLocationSelect({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    },
  });

  // Center map on marker when it changes
  useEffect(() => {
    if (markerPosition) {
      map.flyTo([markerPosition.lat, markerPosition.lng], SELECTED_ZOOM, {
        duration: 0.5
      });
    }
  }, [markerPosition, map]);

  return null;
};

// =============================================================================
// DRAGGABLE MARKER COMPONENT
// =============================================================================
const DraggableMarker = ({ position, onDragEnd }) => {
  const eventHandlers = {
    dragend(e) {
      const marker = e.target;
      const pos = marker.getLatLng();
      onDragEnd({ lat: pos.lat, lng: pos.lng });
    },
  };

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={redIcon}
      draggable={true}
      eventHandlers={eventHandlers}
    />
  );
};

// =============================================================================
// LOCATION PICKER COMPONENT
// =============================================================================
const LocationPicker = ({ 
  value, 
  onChange, 
  onClear,
  className,
  disabled = false 
}) => {
  const [markerPosition, setMarkerPosition] = useState(value);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Update marker when value prop changes
  useEffect(() => {
    if (value) {
      setMarkerPosition(value);
    }
  }, [value]);

  const handleLocationSelect = useCallback((position) => {
    if (disabled) return;
    setMarkerPosition(position);
    onChange?.(position);
  }, [disabled, onChange]);

  const handleMarkerDrag = useCallback((position) => {
    if (disabled) return;
    setMarkerPosition(position);
    onChange?.(position);
  }, [disabled, onChange]);

  const handleClearLocation = useCallback(() => {
    setMarkerPosition(null);
    onChange?.(null);
    onClear?.();
  }, [onChange, onClear]);

  // Get user's current location
  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setMarkerPosition(newPos);
        onChange?.(newPos);
        setIsLocating(false);
      },
      (error) => {
        setLocationError('Unable to get your location. Please place the pin manually.');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [onChange]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          disabled={disabled || isLocating}
        >
          <Navigation className={cn("h-4 w-4 mr-1", isLocating && "animate-pulse")} />
          {isLocating ? 'Locating...' : 'Use My Location'}
        </Button>
        
        {markerPosition && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearLocation}
            disabled={disabled}
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        
        {markerPosition && (
          <span className="text-xs text-muted-foreground">
            📍 {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
          </span>
        )}
      </div>

      {locationError && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">{locationError}</p>
      )}

      {/* Map */}
      <div className={cn(
        "h-64 rounded-lg overflow-hidden border",
        disabled && "opacity-50 pointer-events-none"
      )}>
        <MapContainer
          center={markerPosition ? [markerPosition.lat, markerPosition.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          zoom={markerPosition ? SELECTED_ZOOM : DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapEventHandler 
            onLocationSelect={handleLocationSelect}
            markerPosition={markerPosition}
          />
          
          {markerPosition && (
            <DraggableMarker 
              position={markerPosition}
              onDragEnd={handleMarkerDrag}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 inline mr-1" />
        Click on the map or drag the pin to set the exact location of the issue
      </p>
    </div>
  );
};

export default LocationPicker;
