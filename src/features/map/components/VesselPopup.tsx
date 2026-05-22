import { Popup } from 'react-map-gl/maplibre';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { useMapStore } from '../stores/map.store';
import { formatSpeed, formatHeading, formatCoordinates } from '@shared/utils/format';
import { getVesselMetadata } from '@shared/services/aisstream.service';

export function VesselPopup() {
  const selectedVesselId = useMapStore((s) => s.selectedVesselId);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);
  const vessel = useRealtimeStore((s) => 
    selectedVesselId ? s.positions.get(selectedVesselId) : undefined
  );

  if (!selectedVesselId || !vessel) return null;

  // Enrich with AIS metadata
  const metadata = getVesselMetadata(selectedVesselId);
  const shipName = metadata?.name || selectedVesselId;

  return (
    <Popup
      longitude={vessel.location.lng}
      latitude={vessel.location.lat}
      anchor="bottom"
      onClose={() => setSelectedVessel(null)}
      closeOnClick={false}
      className="z-50"
      maxWidth="320px"
    >
      <div className="p-3 space-y-3 text-sm text-gray-900">
        {/* Vessel Identity */}
        <div className="border-b border-gray-200 pb-2">
          <h3 className="font-bold text-base text-gray-900 truncate">
            {shipName}
          </h3>
          <p className="text-gray-500 text-xs font-mono mt-0.5">
            MMSI: {selectedVesselId}
            {metadata?.imo && <> · IMO: {metadata.imo}</>}
          </p>
          {metadata?.callSign && (
            <p className="text-gray-500 text-xs">
              Call Sign: {metadata.callSign}
            </p>
          )}
        </div>
        
        {/* Navigation Data */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <span className="text-gray-500">Speed:</span>
          <span className="font-medium">{formatSpeed(vessel.speed)}</span>
          
          <span className="text-gray-500">Heading:</span>
          <span className="font-medium">{formatHeading(vessel.heading)}</span>
          
          <span className="text-gray-500">Course:</span>
          <span className="font-medium">{formatHeading(vessel.course)}</span>
          
          <span className="text-gray-500">Status:</span>
          <span className="font-medium capitalize">{vessel.navStatus}</span>
          
          <span className="text-gray-500">Position:</span>
          <span className="font-medium text-xs">
            {formatCoordinates(vessel.location.lat, vessel.location.lng)}
          </span>
        </div>

        {/* Destination */}
        {metadata?.destination && (
          <div className="border-t border-gray-200 pt-2">
            <span className="text-gray-500 text-xs">Destination: </span>
            <span className="font-medium text-xs">{metadata.destination}</span>
          </div>
        )}

        {/* Source Badge */}
        <div className="flex items-center justify-between pt-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            AIS Live
          </span>
          <span className="text-gray-400 text-xs">
            {vessel.timestamp ? new Date(vessel.timestamp).toLocaleTimeString() : '—'}
          </span>
        </div>
      </div>
    </Popup>
  );
}
