import { Popup } from 'react-map-gl/maplibre';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { useMapStore } from '../stores/map.store';
import { formatSpeed, formatHeading, formatCoordinates } from '@shared/utils/format';
import { getVesselMetadata } from '@shared/services/aisstream.service';
import { useEffect, useState } from 'react';
import { gfwService, type GFWVesselInfo } from '@shared/services/gfw.service';

export function VesselPopup() {
  const selectedVesselId = useMapStore((s) => s.selectedVesselId);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);
  const vessel = useRealtimeStore((s) => 
    selectedVesselId ? s.positions.get(selectedVesselId) : undefined
  );
  const [gfwData, setGfwData] = useState<GFWVesselInfo | null>(null);
  const [isLoadingGfw, setIsLoadingGfw] = useState(false);

  useEffect(() => {
    if (selectedVesselId) {
      setIsLoadingGfw(true);
      gfwService.searchByMmsi(selectedVesselId).then(data => {
        setGfwData(data);
        setIsLoadingGfw(false);
      });
    } else {
      setGfwData(null);
    }
  }, [selectedVesselId]);

  if (!selectedVesselId || !vessel) return null;

  // Enrich with AIS metadata
  const metadata = getVesselMetadata(selectedVesselId);
  const shipName = metadata?.name || vessel.name || selectedVesselId;

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

        {/* Global Fishing Watch Data */}
        {(isLoadingGfw || gfwData?.registryInfo?.extraFields) && (
          <div className="border-t border-gray-200 pt-2 text-xs">
            {isLoadingGfw ? (
              <span className="text-gray-500">Loading GFW data...</span>
            ) : (
              <div className="space-y-1">
                <div className="font-medium text-gray-700 flex justify-between items-center">
                  <span>GFW Registry Data</span>
                  {gfwData?.registryInfo?.extraFields?.flag && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                      Flag: {gfwData.registryInfo.extraFields.flag}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-gray-600">
                  {gfwData?.registryInfo?.extraFields?.length && (
                    <div>Length: <span className="font-medium text-gray-900">{gfwData.registryInfo.extraFields.length}m</span></div>
                  )}
                  {gfwData?.registryInfo?.extraFields?.tonnage && (
                    <div>Tonnage: <span className="font-medium text-gray-900">{gfwData.registryInfo.extraFields.tonnage}t</span></div>
                  )}
                  {gfwData?.registryInfo?.extraFields?.gearType && (
                    <div className="col-span-2">Gear: <span className="font-medium text-gray-900 capitalize">{gfwData.registryInfo.extraFields.gearType.replace(/_/g, ' ')}</span></div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source Badge */}
        <div className="flex items-center justify-between pt-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            vessel.source === 'ais' ? 'bg-green-100 text-green-800' : 
            vessel.source === 'transparency' ? 'bg-cyan-100 text-cyan-800' :
            vessel.source === 'globalfishing' ? 'bg-emerald-100 text-emerald-800' :
            vessel.source === 'api' ? 'bg-pink-100 text-pink-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              vessel.source === 'ais' ? 'bg-green-500' : 
              vessel.source === 'transparency' ? 'bg-cyan-500' :
              vessel.source === 'globalfishing' ? 'bg-emerald-500' :
              vessel.source === 'api' ? 'bg-pink-500' :
              'bg-gray-500'
            }`} />
            {vessel.source === 'ais' ? 'AIS Live' : 
             vessel.source === 'transparency' ? 'Transparency API' :
             vessel.source === 'globalfishing' ? 'GFW API' :
             vessel.source === 'api' ? 'VesselAPI' : 'Manual'}
          </span>
          <div className="text-gray-400 text-[10px] text-right leading-tight">
            <div>Signal Received:</div>
            <div className="font-medium text-gray-500">{vessel.timestamp ? new Date(vessel.timestamp).toLocaleString() : '—'}</div>
          </div>
        </div>
      </div>
    </Popup>
  );
}
