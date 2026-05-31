import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Local In-Memory Cache (Replaces Redis to avoid 500k rate limits)
const fleetCache = new Map();
const throttleCache = new Map();

// Prevent memory leaks: Clean up old throttle timestamps every 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [mmsi, timestamp] of throttleCache.entries()) {
    if (now - timestamp > 60 * 60 * 1000) {
      throttleCache.delete(mmsi);
    }
  }
}, 60 * 60 * 1000);

// Bulk queues (Local arrays for batching before DB insert)
let positionBatch = new Map();
let newVesselsBatch = new Map();
let staticDataBatch = new Map();

// Map AIS integer statuses to our database Enums
const NAV_STATUS_MAP = {
  0: 'underway_using_engine', 1: 'at_anchor', 2: 'not_under_command',
  3: 'restricted_manoeuvrability', 4: 'constrained_by_draught', 5: 'moored',
  6: 'aground', 7: 'engaged_in_fishing', 8: 'underway_sailing', 15: 'undefined'
};

// Map AIS integer types to text
function getVesselType(code) {
  if (code >= 70 && code <= 79) return 'Cargo';
  if (code >= 80 && code <= 89) return 'Tanker';
  if (code >= 60 && code <= 69) return 'Passenger';
  if (code === 30) return 'Fishing';
  if (code >= 31 && code <= 32) return 'Towing';
  if (code >= 40 && code <= 49) return 'High Speed Craft';
  if (code >= 50 && code <= 59) return 'Special/Tug';
  return 'Other';
}

async function startEngine() {
  console.log('Connecting to Supabase...');
  
  const { data: org, error: orgErr } = await supabase
    .from('organizations').select('id').eq('slug', 'ais-ingestion-org').single();

  let targetOrgId;
  if (orgErr || !org) {
    console.log('Ingestion org not found. Creating it now...');
    const { data: newOrg, error: insertErr } = await supabase
      .from('organizations')
      .insert({ name: 'AIS Ingestion', slug: 'ais-ingestion-org' })
      .select('id')
      .single();
      
    if (insertErr || !newOrg) {
      console.error('CRITICAL: Failed to create "ais-ingestion-org".', insertErr);
      process.exit(1);
    }
    targetOrgId = newOrg.id;
  } else {
    targetOrgId = org.id;
  }
  
  console.log(`Target Org Locked: ${targetOrgId}`);

  // BULK FLUSH LOOP
  setInterval(async () => {
    // 1. Flush New Vessels & Static Data
    const uniqueVessels = new Map();
    for (const v of newVesselsBatch.values()) uniqueVessels.set(v.mmsi, v);
    for (const v of staticDataBatch.values()) uniqueVessels.set(v.mmsi, v);
    
    const vesselsToUpsert = Array.from(uniqueVessels.values());
    newVesselsBatch.clear();
    staticDataBatch.clear();

    if (vesselsToUpsert.length > 0) {
      try {
        const { data, error } = await supabase
          .from('vessels')
          .upsert(vesselsToUpsert, { onConflict: 'org_id, mmsi' })
          .select('mmsi, id');
        
        if (error) {
          console.error('[DB] Upsert error for vessels:', error);
        } else if (data) {
          // Cache UUIDs in local memory so we don't query DB
          data.forEach(v => fleetCache.set(v.mmsi, v.id));
          console.log(`[DB] Upserted & Cached ${data.length} vessel profiles`);
        }
      } catch (e) {
        console.error("[DB] Profile Bulk Upsert Exception:", e);
      }
    }

    // 2. Flush Positions
    const posToUpsert = Array.from(positionBatch.values());
    positionBatch.clear(); 

    if (posToUpsert.length > 0) {
      try {
        const { error } = await supabase
          .from('vessel_latest_positions')
          .upsert(posToUpsert);
        
        if (error) {
          console.error('[DB] Upsert error for positions:', error);
        } else {
          console.log(`[DB] Flushed ${posToUpsert.length} live positions globally`);
        }
      } catch (e) {
        console.error("[DB] Position Bulk Upsert Exception:", e);
      }
    }
  }, 10000);

  const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.on('open', () => {
    console.log('Connected to AISStream Firehose...');
    const subscription = {
      Apikey: process.env.AISSTREAM_API_KEY || process.env.VITE_AISSTREAM_API_KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]], 
      FilterMessageTypes: ["PositionReport", "ShipStaticData"]
    };
    ws.send(JSON.stringify(subscription));
  });

  ws.on('message', async (data) => {
    const msg = JSON.parse(data.toString());
    const metadata = msg.MetaData;
    const mmsi = metadata?.MMSI?.toString();
    if (!mmsi) return;

    if (msg.MessageType === 'ShipStaticData') {
      const staticData = msg.Message.ShipStaticData;
      const length = staticData.DimensionToBow + staticData.DimensionToStern;
      const beam = staticData.DimensionToPort + staticData.DimensionToStarboard;
      
      staticDataBatch.set(mmsi, {
        org_id: targetOrgId,
        mmsi: mmsi,
        imo: staticData.ImoNumber === 0 ? null : staticData.ImoNumber.toString(),
        name: staticData.Name ? staticData.Name.trim() : metadata.ShipName?.trim(),
        call_sign: staticData.CallSign?.trim(),
        vessel_type: getVesselType(staticData.Type),
        length_overall: length > 0 ? length : null,
        beam: beam > 0 ? beam : null,
        draught: staticData.Draught,
      });
      return; 
    }

    if (msg.MessageType === 'PositionReport') {
      const report = msg.Message.PositionReport;
      const navStatus = NAV_STATUS_MAP[report.NavigationalStatus] || 'undefined';
      const speed = report.Sog || 0;
      
      // Distributed Throttle using local memory cache logic
      const isStationary = navStatus === 'at_anchor' || navStatus === 'moored' || speed < 0.5;
      const throttleMs = isStationary ? 15 * 60 * 1000 : 5 * 60 * 1000; 

      const now = Date.now();
      const lastPing = throttleCache.get(mmsi) || 0;
      if (now - lastPing < throttleMs) return; // Ship hasn't moved enough or timer hasn't expired
      
      throttleCache.set(mmsi, now);

      const vesselId = fleetCache.get(mmsi);
      if (!vesselId) {
        if (!newVesselsBatch.has(mmsi)) {
          newVesselsBatch.set(mmsi, {
            org_id: targetOrgId,
            mmsi: mmsi,
            name: metadata.ShipName ? metadata.ShipName.trim() : `Unknown-${mmsi}`,
            vessel_type: 'Unknown'
          });
        }
        return; 
      }

      positionBatch.set(mmsi, {
        vessel_id: vesselId,
        org_id: targetOrgId,
        location: `POINT(${report.Longitude} ${report.Latitude})`,
        heading: report.TrueHeading === 511 ? null : report.TrueHeading,
        course: report.Cog,
        speed: report.Sog,
        nav_status: navStatus,
        source: 'aisstream',
        timestamp: new Date().toISOString()
      });
    }
  });

  ws.on('error', (err) => console.error('WebSocket Error:', err));
  ws.on('close', () => {
    console.log('WebSocket Closed. Reconnecting in 5s...');
    setTimeout(startEngine, 5000);
  });
}

// Start the Keep-Alive Web Server for Render
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  if (req.url === '/ping' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Keep-Alive Web Server running on port ${PORT}`);
  // Start the AIS engine once the web server is up
  startEngine();
});