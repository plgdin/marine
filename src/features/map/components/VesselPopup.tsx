import { Popup } from 'react-map-gl/mapbox';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { useMapStore } from '../stores/map.store';
import { formatSpeed, formatHeading } from '@shared/utils/format';

export function VesselPopup() {
  const selectedVesselId = useMapStore((s) => s.selectedVesselId);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);
  const vessel = useRealtimeStore((s) => 
    selectedVesselId ? s.positions.get(selectedVesselId) : undefined
  );

  if (!selectedVesselId || !vessel) return null;

  return (
    <Popup
      longitude={vessel.location.lng}
      latitude={vessel.location.lat}
      anchor="bottom"
      onClose={() => setSelectedVessel(null)}
      closeOnClick={false}
      className="z-50"
      maxWidth="300px"
    >
      <div className="p-2 space-y-2 text-sm text-gray-900">
        <div>
          <h3 className="font-bold text-base">{vessel.vesselId}</h3>
          <p className="text-gray-500 text-xs">Vessel ID: {vessel.vesselId}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-500">Speed:</span>
          <span className="font-medium">{formatSpeed(vessel.speed)}</span>
          
          <span className="text-gray-500">Heading:</span>
          <span className="font-medium">{formatHeading(vessel.heading)}</span>
          
          <span className="text-gray-500">Status:</span>
          <span className="font-medium capitalize">{vessel.navStatus}</span>
        </div>
      </div>
    </Popup>
  );
}
