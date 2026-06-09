import { Popup, useMap } from 'react-map-gl/maplibre';
import { useRealtimeStore } from '@shared/stores/realtime.store';
import { useMapStore } from '../stores/map.store';
import { useEffect, useState } from 'react';
import { gfwService, type GFWVesselInfo, getRegistryExtraFields } from '@shared/services/gfw.service';
import { useFleetStore } from '../stores/fleet.store';
import { useNavigate } from 'react-router-dom';
import { Droplet, LayoutGrid, Menu, ChevronDown, Info, Route, Navigation, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/config/supabase';

export function VesselPopup() {
  const navigate = useNavigate();
  const { current: map } = useMap();
  const selectedVesselId = useMapStore((s) => s.selectedVesselId);
  const setSelectedVessel = useMapStore((s) => s.setSelectedVessel);
  const vessel = useRealtimeStore((s) => {
    void s._positionVersion;
    return selectedVesselId ? s.positions.get(selectedVesselId) : undefined;
  });
  
  const [gfwData, setGfwData] = useState<GFWVesselInfo | null>(null);
  const { fleets, fetchFleets, addVesselToFleet } = useFleetStore();
  const [isFleetMenuOpen, setIsFleetMenuOpen] = useState(false);
  const [popupAnchor, setPopupAnchor] = useState<'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom');

  useEffect(() => {
    fetchFleets();
  }, [fetchFleets]);

  const [dbVessel, setDbVessel] = useState<{ name?: string; mmsi?: string; vessel_type?: string; metadata?: any } | null>(null);

  useEffect(() => {
    if (selectedVesselId) {
      supabase.from('vessels').select('name, mmsi, vessel_type, metadata').eq('id', selectedVesselId).single()
        .then(({ data }) => setDbVessel(data as any));
    } else {
      setDbVessel(null);
    }
  }, [selectedVesselId]);

  useEffect(() => {
    if (dbVessel?.mmsi) {
      gfwService.searchByMmsi(dbVessel.mmsi).then(data => {
        setGfwData(data);
      });
    } else {
      setGfwData(null);
    }
  }, [dbVessel?.mmsi]);

  // Calculate dynamic anchor so it never overflows
  useEffect(() => {
    if (map && vessel) {
      const point = map.project([vessel.location.lng, vessel.location.lat]);
      const canvas = map.getCanvas();
      
      const height = canvas.clientHeight;
      const width = canvas.clientWidth;
      
      // Divide the screen into 4 exact quadrants
      const isTopHalf = point.y < height / 2;
      const isLeftHalf = point.x < width / 2;
      
      let anchorStr: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      
      if (isTopHalf && isLeftHalf) {
        anchorStr = 'top-left';
      } else if (isTopHalf && !isLeftHalf) {
        anchorStr = 'top-right';
      } else if (!isTopHalf && isLeftHalf) {
        anchorStr = 'bottom-left';
      } else {
        anchorStr = 'bottom-right';
      }
      
      setPopupAnchor(anchorStr as any);
    }
  }, [map, vessel]);

  if (!selectedVesselId || !vessel) return null;

  // Enrich with AIS metadata from the database
  const metadata = dbVessel?.metadata;
  const shipName = metadata?.name || vessel.name || dbVessel?.name || selectedVesselId;
  const extraFields = getRegistryExtraFields(gfwData);
  const shipType = dbVessel?.vessel_type || extraFields?.gearType?.replace(/_/g, ' ') || 'Cargo Vessel';
  const flag = extraFields?.flag || 'MT'; // MT = Malta for mockup
  
  // Use real ETA and Destination from AIS if available
  const eta = metadata?.etaIso 
    ? new Date(metadata.etaIso).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) 
    : '—';
  const destination = metadata?.destination?.trim() || 'UNKNOWN';

  const handleAddToFleet = async (fleetId: string) => {
    await addVesselToFleet(fleetId, selectedVesselId);
    setIsFleetMenuOpen(false);
  };

  const minutesAgo = Math.max(0, Math.floor((Date.now() - new Date(vessel.timestamp).getTime()) / 60000));

  return (
    <Popup
      longitude={vessel.location.lng}
      latitude={vessel.location.lat}
      anchor={popupAnchor}
      onClose={() => setSelectedVessel(null)}
      closeButton={false}
      className="z-50 vessel-popup"
      maxWidth="350px"
    >
      <div className="w-[280px] max-h-[75vh] overflow-y-auto bg-[#0B1221]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl flex flex-col text-slate-200 font-sans [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Header */}
        <div className="flex items-start justify-between p-2 pb-1.5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex gap-2 items-start">
            <div className="mt-1 flex gap-1">
              <div className="bg-gradient-to-br from-red-500 to-rose-700 rounded p-0.5 text-white flex items-center justify-center h-[16px] w-[16px] shadow-[0_0_8px_rgba(225,29,72,0.4)]">
                <Droplet size={10} fill="currentColor" />
              </div>
              <div className="bg-slate-800/80 border border-slate-600 rounded overflow-hidden h-[16px] w-[20px] flex items-center justify-center text-[9px] font-bold text-slate-200">
                {flag}
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-[15px] leading-none uppercase tracking-tight truncate w-[160px] text-white mt-0.5">
                {shipName}
              </h3>
              <p className="text-cyan-400/80 text-[10px] capitalize mt-1 font-medium">{shipType}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-slate-400 mt-0.5">
            <button className="hover:text-white p-1 transition-colors"><LayoutGrid size={14} strokeWidth={2.5} /></button>
            <button className="hover:text-white p-1 transition-colors" onClick={() => setSelectedVessel(null)}><X size={16} strokeWidth={2.5} /></button>
          </div>
        </div>

        {/* Image */}
        <div className="w-full h-[100px] bg-slate-900 relative shrink-0 border-y border-white/5">
          <img 
            src="https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=400&h=200&auto=format&fit=crop"
            className="w-full h-full object-cover opacity-80 mix-blend-luminosity"
            alt={shipName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1221] via-transparent to-transparent opacity-90"></div>
          <div className="absolute bottom-2 left-2 text-white text-[12px] font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex flex-col">
            <span className="text-[14px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">See-Port Intel</span>
            <span className="text-[9px] text-slate-300 opacity-90 mt-[-2px]">Sat-Imagery Verified</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-1.5 p-2 border-b border-white/5 bg-white/5">
          <button className="p-[5px] bg-white/5 border border-white/10 rounded hover:bg-white/10 text-slate-300 transition-colors">
            <Menu size={14} />
          </button>
          
          <div className="relative flex-1">
            <div className="flex w-full rounded">
              <button 
                onClick={() => fleets.length > 0 && handleAddToFleet(fleets[0].id)}
                className="flex-1 py-[4px] px-2 bg-white/5 border border-white/10 border-r-0 rounded-l hover:bg-white/10 text-[11px] font-semibold text-slate-200 transition-colors"
              >
                Add to fleet
              </button>
              <button 
                onClick={() => setIsFleetMenuOpen(!isFleetMenuOpen)}
                className="py-[4px] px-1.5 bg-white/5 border border-white/10 rounded-r hover:bg-white/10 text-slate-300 transition-colors"
              >
                <ChevronDown size={12} strokeWidth={3} />
              </button>
            </div>
            
            <AnimatePresence>
              {isFleetMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 mt-1 w-full bg-[#1e293b] border border-slate-700 shadow-xl rounded z-10 py-1"
                >
                  {fleets.length === 0 ? (
                    <div className="px-2 py-1 text-[10px] text-slate-400">No fleets found.</div>
                  ) : (
                    fleets.map(f => (
                      <button 
                        key={f.id} 
                        onClick={() => handleAddToFleet(f.id)}
                        className="w-full text-left px-2 py-1 text-[11px] font-medium hover:bg-cyan-900/30 hover:text-cyan-400 text-slate-300 transition-colors"
                      >
                        {f.name}
                      </button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => navigate(`/app/vessels/${selectedVesselId}`)}
            className="flex-1 py-[4.5px] px-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded text-[11px] font-bold shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all"
          >
            Vessel details
          </button>
        </div>

        {/* Identifiers */}
        <div className="grid grid-cols-2 px-3 py-1.5 pb-1 border-b border-white/5">
          <div>
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">Call Sign</span>
            <div className="font-bold text-[14px] text-white tracking-wide">{metadata?.callSign || '—'}</div>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">IMO</span>
            <div className="font-bold text-[14px] text-white tracking-wide">{metadata?.imo || '—'}</div>
          </div>
        </div>

        {/* Voyage Info */}
        <div className="px-3 py-2 space-y-2">
          <div className="flex justify-between items-baseline">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">DEST</span>
              <span className="text-[15px] font-bold text-white tracking-tight truncate max-w-[140px]" title={destination}>{destination}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase flex items-center gap-1 justify-end">
                Reported ETA <Info size={10} className="text-slate-500" />
              </span>
              <span className="text-[11px] font-medium text-slate-300">{eta}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-3 py-1.5 space-y-2">
          <div className="relative w-full h-6 flex items-center">
            <div className="w-full h-[2px] bg-slate-700/50 rounded-full relative">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 w-[60%] absolute top-0 left-0 shadow-[0_0_5px_rgba(6,182,212,0.5)]"></div>
            </div>
            <div className="absolute left-0 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(34,211,238,0.8)]"></div>
            <div className="absolute left-[60%] w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[9px] border-l-blue-400 -translate-y-0.5 -ml-1 filter drop-shadow-[0_0_3px_rgba(96,165,250,0.8)]"></div>
          </div>

          <div className="flex gap-2 pt-0.5">
            <button className="flex-1 flex items-center justify-center gap-1 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-slate-200 rounded text-[11px] font-medium transition-colors">
              <Route size={12} className="text-cyan-400" /> Past track
            </button>
            <button className="flex-1 flex items-center justify-center gap-1 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-slate-200 rounded text-[11px] font-medium transition-colors">
              <Navigation size={12} fill="currentColor" className="-rotate-45 mb-0.5 text-blue-400" /> Route forecast
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-black/20 border-t border-b border-white/5">
          <div className="bg-slate-800/40 rounded p-1.5 border border-white/5">
            <div className="text-slate-400 text-[9px] leading-none uppercase tracking-wider font-semibold">Navigational status</div>
            <div className="font-bold text-white text-[11px] leading-tight mt-1 capitalize pr-1">
              {vessel.navStatus.replace(/-/g, ' ')}
            </div>
          </div>
          <div className="bg-slate-800/40 rounded p-1.5 border border-white/5">
            <div className="text-slate-400 text-[9px] leading-none uppercase tracking-wider font-semibold">Speed/Course</div>
            <div className="font-bold text-white text-[11px] leading-tight mt-1">
              <span className="text-cyan-400">{vessel.speed !== null ? `${vessel.speed.toFixed(1)}kn` : '-'}</span> <span className="text-slate-500">/</span> {vessel.course !== null ? `${vessel.course.toFixed(0)}°` : '-'}
            </div>
          </div>
          <div className="bg-slate-800/40 rounded p-1.5 border border-white/5">
            <div className="text-slate-400 text-[9px] leading-none uppercase tracking-wider font-semibold">Position</div>
            <div className="font-bold text-slate-200 text-[11px] leading-tight mt-1 tracking-tight">
              {`${Math.abs(vessel.location.lat).toFixed(4)}°${vessel.location.lat >= 0 ? 'N' : 'S'}, ${Math.abs(vessel.location.lng).toFixed(4)}°${vessel.location.lng >= 0 ? 'E' : 'W'}`}
            </div>
          </div>
          <div className="bg-slate-800/40 rounded p-1.5 border border-white/5">
            <div className="text-slate-400 text-[9px] leading-none uppercase tracking-wider font-semibold">Draught</div>
            <div className="font-bold text-slate-200 text-[11px] leading-tight mt-1">
              {metadata?.draughtM != null ? `${metadata.draughtM.toFixed(1)} m` : '—'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 text-[9px] bg-white/5 rounded-b-xl">
          <span className="text-slate-400">Received: <span className="font-bold text-cyan-400">{minutesAgo} mins ago</span> </span>
          <span className="text-slate-500">(AIS source: <span className="capitalize text-slate-400">{
            vessel.source === 'ais' ? 'Live' : 
            vessel.source === 'transparency' ? 'API' :
            vessel.source === 'globalfishing' ? 'GFW' :
            vessel.source === 'api' ? 'Roaming' : 'Manual'
          }</span>)</span>
        </div>

      </div>
    </Popup>
  );
}
