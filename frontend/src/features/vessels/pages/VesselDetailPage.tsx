import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarClock, Compass, Gauge, Info, Radio, Ship, Waypoints } from 'lucide-react';



import { useRealtimeStore } from '@shared/stores/realtime.store';
import { getVesselAisStats, getVesselMetadata } from '@shared/services/aisstream.service';
import { gfwService, type GfwEventsResponse, type GfwInsightsResponse, type GfwVesselIdentity, getRegistryRecords, getSelfReportedRecords, getRegistryExtraFields } from '@shared/services/gfw.service';
import { Badge } from '@shared/components/ui/Badge';
import { Button } from '@shared/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/components/ui/Card';
import {
  formatCoordinates,
  formatDateTime,
  formatHeading,
  formatLabel,
  formatMMSI,
  formatNavStatus,
  formatNumber,
  formatRelative,
  formatSpeed,
  formatVesselType,
} from '@shared/utils/format';

type VesselDetailTab =
  | 'overview'
  | 'port-calls'
  | 'characteristics'
  | 'ownership'
  | 'performance'
  | 'compliance'
  | 'news';

function safeText(value: unknown): string {
  if (value == null) return '—';
  const s = String(value).trim();
  return s.length ? s : '—';
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-overlay/40 p-3">
      <div className="mt-0.5 text-accent-cyan">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</div>
        <div className="mt-0.5 truncate text-sm font-semibold text-text-primary">{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-raised p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-text-tertiary"><Info size={18} /></div>
        <div>
          <div className="text-sm font-semibold text-text-primary">{title}</div>
          <div className="mt-1 text-sm text-text-secondary">{detail}</div>
        </div>
      </div>
    </div>
  );
}

export default function VesselDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<VesselDetailTab>('overview');

  // Live AIS subscription is now handled by the local ingestion engine

  const _positionVersion = useRealtimeStore((s) => s._positionVersion);
  const pos = useRealtimeStore((s) => (id ? s.positions.get(id) : undefined));

  const meta = useMemo(() => {
    void _positionVersion;
    return id ? getVesselMetadata(id) : undefined;
  }, [id, _positionVersion]);
  const stats = useMemo(() => {
    void _positionVersion;
    return id ? getVesselAisStats(id) : null;
  }, [id, _positionVersion]);

  const [gfwVessel, setGfwVessel] = useState<GfwVesselIdentity | null>(null);
  const [gfwPortEvents, setGfwPortEvents] = useState<GfwEventsResponse | null>(null);
  const [gfwInsights, setGfwInsights] = useState<GfwInsightsResponse | null>(null);
  const [gfwLoading, setGfwLoading] = useState(false);
  const [gfwLoadingMorePorts, setGfwLoadingMorePorts] = useState(false);
  const [gfwEndDate, setGfwEndDate] = useState<string | null>(null);

  const [fourwingsFishingByYear, setFourwingsFishingByYear] = useState<Array<{ year: string; hours: number }> | null>(null);
  const [fourwingsLoading, setFourwingsLoading] = useState(false);
  const [fourwingsError, setFourwingsError] = useState<string | null>(null);

  // ── Extract identity from GFW data ──────────────────────────
  const gfwName = useMemo(() => {
    if (!gfwVessel) return null;
    if (gfwVessel.name) return gfwVessel.name;
    const records = getRegistryRecords(gfwVessel);
    if (records[0]?.shipname) return records[0].shipname;
    const combined = gfwVessel.combinedSourcesInfo?.[0];
    if (combined?.name) return combined.name;
    const selfReported = getSelfReportedRecords(gfwVessel);
    if (selfReported[0]?.shipname) return selfReported[0].shipname;
    return null;
  }, [gfwVessel]);

  const gfwImo = useMemo(() => {
    if (!gfwVessel) return null;
    const records = getRegistryRecords(gfwVessel);
    if (records[0]?.imo) return records[0].imo;
    const combined = gfwVessel.combinedSourcesInfo?.[0];
    if (combined?.imo) return combined.imo;
    const selfReported = getSelfReportedRecords(gfwVessel);
    if (selfReported[0]?.imo) return selfReported[0].imo;
    return null;
  }, [gfwVessel]);

  const gfwCallSign = useMemo(() => {
    if (!gfwVessel) return null;
    const records = getRegistryRecords(gfwVessel);
    if (records[0]?.callsign) return records[0].callsign;
    const combined = gfwVessel.combinedSourcesInfo?.[0];
    if (combined?.callsign) return combined.callsign;
    const selfReported = getSelfReportedRecords(gfwVessel);
    if (selfReported[0]?.callsign) return selfReported[0].callsign;
    return null;
  }, [gfwVessel]);

  const gfwFlag = useMemo(() => {
    if (!gfwVessel) return null;
    const records = getRegistryRecords(gfwVessel);
    if (records[0]?.flag) return records[0].flag;
    const combined = gfwVessel.combinedSourcesInfo?.[0];
    if (combined?.flag) return combined.flag;
    return getRegistryExtraFields(gfwVessel)?.flag ?? null;
  }, [gfwVessel]);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;

    Promise.resolve().then(() => {
      if (!cancelled) setGfwLoading(true);
    });
    void (async () => {
      // GFW datasets commonly lag up to ~96 hours; use exclusive YYYY-MM-DD end-date.
      const endDate = new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString().slice(0, 10);
      setGfwEndDate(endDate);
      let searched = await gfwService.searchByMmsi(id);
      if (cancelled) return;

      // If MMSI search found nothing and we have a name from AIS metadata, try name search
      if (!searched?.id) {
        const cachedMeta = getVesselMetadata(id);
        if (cachedMeta?.name && cachedMeta.name.length >= 3) {
          searched = await gfwService.searchByName(cachedMeta.name);
          if (cancelled) return;
        }
      }

      const vessel = searched?.id
        ? await gfwService.getVesselById(searched.id)
        : searched;

      if (cancelled) return;
      setGfwVessel(vessel ?? null);
      setGfwPortEvents(null);
      setGfwInsights(null);
      setFourwingsFishingByYear(null);
      setFourwingsError(null);
      setFourwingsLoading(false);

      if (!vessel?.id) {
        setGfwLoading(false);
        return;
      }

      const [portEvents, insights] = await Promise.all([
        gfwService.listEvents({
          vesselIds: [vessel.id],
          datasets: ['public-global-port-visits-events:latest'],
          startDate: '2012-01-01',
          endDate,
          types: ['PORT_VISIT'],
          limit: 200,
          offset: 0,
        }),
        gfwService.getInsightsByVessels({
          vesselIds: [vessel.id],
          insights: ['AIS_COVERAGE', 'AIS_OFF', 'FISHING_IN_NO_TAKE_MPA', 'FISHING_WITHOUT_RFMO_AUTHORIZATION'],
        }),
      ]);

      if (cancelled) return;
      setGfwPortEvents(portEvents);
      setGfwInsights(insights);
      setGfwLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadMorePortCalls = async () => {
    if (!gfwVessel?.id) return;
    if (!gfwEndDate) return;
    if (gfwLoadingMorePorts) return;

    const nextOffset = gfwPortEvents?.nextOffset;
    if (nextOffset == null) return;

    setGfwLoadingMorePorts(true);
    try {
      const next = await gfwService.listEvents({
        vesselIds: [gfwVessel.id],
        datasets: ['public-global-port-visits-events:latest'],
        startDate: '2012-01-01',
        endDate: gfwEndDate,
        types: ['PORT_VISIT'],
        limit: 200,
        offset: nextOffset,
      });

      if (!next?.entries?.length) return;
      setGfwPortEvents((prev) => {
        const mergedEntries = [...(prev?.entries ?? []), ...next.entries!];
        const seen = new Set<string>();
        const deduped = mergedEntries.filter((e) => {
          if (!e?.id) return false;
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });
        return {
          ...next,
          entries: deduped,
          total: prev?.total ?? next.total,
          offset: prev?.offset ?? next.offset,
        };
      });
    } finally {
      setGfwLoadingMorePorts(false);
    }
  };

  const generateFishingEffortReport = async () => {
    if (!id) return;
    if (!gfwEndDate) return;
    if (fourwingsLoading) return;

    const endYear = Number(gfwEndDate.slice(0, 4));
    if (!Number.isFinite(endYear) || endYear < 2012) return;

    setFourwingsError(null);
    setFourwingsFishingByYear(null);
    setFourwingsLoading(true);

    try {
      const rows: Array<{ year: string; hours: number }> = [];

      for (let year = 2012; year <= endYear; year++) {
        const start = `${year}-01-01`;
        const end = year === endYear ? gfwEndDate : `${year + 1}-01-01`;

        const report = await gfwService.fourwingsReport({
          dataset: 'public-global-fishing-effort:latest',
          dateRange: { start, end },
          temporalResolution: 'ENTIRE',
          spatialAggregation: true,
          groupBy: 'MMSI',
          format: 'JSON',
          filters: [`vessel_id in ('${id}')`],
        });

        let hours = 0;
        const entry = report?.entries?.[0];
        if (entry) {
          for (const k of Object.keys(entry)) {
            const arr = (entry as any)[k];
            if (!Array.isArray(arr)) continue;
            for (const r of arr) {
              const h = Number((r as any)?.hours);
              if (Number.isFinite(h)) hours += h;
            }
          }
        }

        rows.push({ year: String(year), hours });
      }

      setFourwingsFishingByYear(rows);
    } catch {
      setFourwingsError('Failed to generate 4Wings report. Please try again.');
    } finally {
      setFourwingsLoading(false);
    }
  };

  // Resolve vessel name: basic fallback since utils are missing
  const specs = useMemo(() => {
    return {
      name: meta?.name || 'Unknown Vessel',
      imo: meta?.imo,
      callSign: meta?.callSign,
      vesselTypeName: meta?.vesselType,
    };
  }, [meta, id]);

  const shipName = pos?.name || gfwName || specs.name || 'Unknown Vessel';
  const vesselType = specs.vesselTypeName ? formatVesselType(specs.vesselTypeName) : '—';
  const imoNumber = specs.imo || gfwImo;
  const callSign = specs.callSign || gfwCallSign;
  const flagState = gfwFlag;

  const lastSeen = pos?.timestamp ? formatRelative(pos.timestamp) : '—';
  const lastSeenExact = pos?.timestamp ? formatDateTime(pos.timestamp) : '—';

  const tabs: Array<{ id: VesselDetailTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'port-calls', label: 'Port call log' },
    { id: 'characteristics', label: 'Vessel characteristics' },
    { id: 'ownership', label: 'Ownership' },
    { id: 'performance', label: 'Performance insights' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'news', label: 'In the news' },
  ];

  if (!id) {
    return (
      <div className="p-6">
        <EmptyState
          title="Missing vessel id"
          detail="Open a vessel details page using a valid MMSI in the URL."
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold text-text-primary">
                  {shipName}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                  <span className="truncate">{vesselType}</span>
                  <span className="text-text-tertiary">•</span>
                  <span>MMSI: {formatMMSI(pos?.mmsi || id)}</span>
                  {imoNumber && (
                    <>
                      <span className="text-text-tertiary">•</span>
                      <span>IMO: {imoNumber}</span>
                    </>
                  )}
                  {callSign && (
                    <>
                      <span className="text-text-tertiary">•</span>
                      <span>Call sign: {callSign}</span>
                    </>
                  )}
                  {flagState && (
                    <>
                      <span className="text-text-tertiary">•</span>
                      <span>Flag: {flagState}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant={pos?.navStatus === 'underway' ? 'success' : pos?.navStatus === 'anchored' ? 'warning' : 'neutral'}>
              {formatNavStatus(pos?.navStatus)}
            </Badge>
            <div className="text-right text-xs text-text-tertiary">
              <div>Last AIS: <span className="text-text-secondary">{lastSeen}</span></div>
              <div className="mt-0.5">{lastSeenExact}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-border-subtle bg-surface-raised p-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-colors',
                tab === t.id
                  ? 'bg-surface-overlay text-text-primary shadow-sm border border-border-default'
                  : 'text-text-secondary hover:bg-surface-hover',
              ].join(' ')}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waypoints size={18} className="text-accent-cyan" />
                  Summary
                </CardTitle>
                <CardDescription>
                  Live position and voyage-related fields reported over AIS.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Metric
                    label="Position"
                    value={formatCoordinates(pos?.location.lat ?? null, pos?.location.lng ?? null)}
                    icon={<Compass size={18} />}
                  />
                  <Metric
                    label="Speed"
                    value={formatSpeed(pos?.speed ?? null)}
                    icon={<Gauge size={18} />}
                  />
                  <Metric
                    label="Course / Heading"
                    value={`${formatHeading(pos?.course ?? null)} / ${formatHeading(pos?.heading ?? null)}`}
                    icon={<Ship size={18} />}
                  />
                  <Metric
                    label="Rate of turn"
                    value={pos?.rot == null ? '—' : `${formatNumber(pos.rot, 0)}/min`}
                    icon={<Radio size={18} />}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border-subtle bg-surface-overlay/30 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                      Reported destination
                    </div>
                    <div className="mt-1 text-sm font-semibold text-text-primary">
                      {safeText(meta?.destination)}
                    </div>
                    <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                      Reported ETA
                    </div>
                    <div className="mt-1 text-sm font-semibold text-text-primary">
                      {meta?.etaIso ? formatDateTime(meta.etaIso) : '—'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border-subtle bg-surface-overlay/30 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                      AIS static details
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[11px] text-text-tertiary">Draught</div>
                        <div className="font-semibold text-text-primary">
                          {meta?.draughtM == null ? '—' : `${formatNumber(meta.draughtM, 1)} m`}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-text-tertiary">Length / Beam</div>
                        <div className="font-semibold text-text-primary">
                          {meta?.lengthOverallM == null ? '—' : `${formatNumber(meta.lengthOverallM, 0)} m`} / {meta?.beamM == null ? '—' : `${formatNumber(meta.beamM, 0)} m`}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-text-tertiary">
                      {meta?.lastStaticUpdateIso ? `Static updated ${formatRelative(meta.lastStaticUpdateIso)}` : 'Static not received yet'}
                    </div>
                  </div>
                </div>

                {/* GFW Registry Data — always show when available */}
                {gfwVessel && (() => {
                  const records = getRegistryRecords(gfwVessel);
                  const reg = records[0];
                  const combined = gfwVessel.combinedSourcesInfo?.[0];
                  const extra = getRegistryExtraFields(gfwVessel);
                  const hasData = reg || combined || extra;
                  if (!hasData) return null;

                  return (
                    <div className="rounded-2xl border border-accent-cyan/20 bg-accent-cyan/5 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-accent-cyan">
                        ✦ Enriched From GFW Registries
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <div>
                          <div className="text-[11px] text-text-tertiary">Flag</div>
                          <div className="font-semibold text-text-primary">{safeText(flagState)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-tertiary">IMO</div>
                          <div className="font-semibold text-text-primary">{safeText(imoNumber)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-tertiary">Vessel type</div>
                          <div className="font-semibold text-text-primary">{safeText(combined?.shiptypes?.[0]?.name ?? reg?.vesselType)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-tertiary">Gear type</div>
                          <div className="font-semibold text-text-primary">{safeText(reg?.geartypes?.[0] ?? combined?.geartypes?.[0]?.name ?? extra?.gearType)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-tertiary">Length</div>
                          <div className="font-semibold text-text-primary">
                            {(() => {
                              const l = reg?.lengthM ?? combined?.lengthM ?? extra?.length;
                              return l == null ? '—' : `${formatNumber(l, 1)} m`;
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-tertiary">Tonnage (GT)</div>
                          <div className="font-semibold text-text-primary">
                            {(() => {
                              const t = reg?.grossTonnage ?? reg?.tonnageGt ?? combined?.tonnageGt ?? extra?.tonnage;
                              return t == null ? '—' : formatNumber(t, 0);
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-tertiary">Call sign</div>
                          <div className="font-semibold text-text-primary">{safeText(callSign)}</div>
                        </div>
                        <div>
                          <div className="text-[11px] text-text-tertiary">Year built</div>
                          <div className="font-semibold text-text-primary">{safeText(reg?.yearBuilt)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card glass>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock size={18} className="text-accent-cyan" />
                  Latest AIS Information
                </CardTitle>
                <CardDescription>Live + static signals we last received.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-tertiary">Navigational status</div>
                    <div className="mt-0.5 font-semibold text-text-primary">{formatNavStatus(pos?.navStatus)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-tertiary">Position received</div>
                    <div className="mt-0.5 font-semibold text-text-primary">{pos?.timestamp ? formatRelative(pos.timestamp) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-tertiary">Latitude/Longitude</div>
                    <div className="mt-0.5 font-semibold text-text-primary">
                      {pos ? `${formatNumber(pos.location.lat, 5)} / ${formatNumber(pos.location.lng, 5)}` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-tertiary">Speed</div>
                    <div className="mt-0.5 font-semibold text-text-primary">{formatSpeed(pos?.speed ?? null)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-tertiary">Course</div>
                    <div className="mt-0.5 font-semibold text-text-primary">{formatHeading(pos?.course ?? null)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-text-tertiary">True heading</div>
                    <div className="mt-0.5 font-semibold text-text-primary">{formatHeading(pos?.heading ?? null)}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-border-subtle bg-surface-overlay/25 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">AIS transmission quality</div>
                    <Badge size="sm" variant={stats?.avgIntervalSec != null && stats.avgIntervalSec < 30 ? 'success' : 'neutral'}>
                      {stats?.avgIntervalSec == null ? 'Unknown' : stats.avgIntervalSec < 30 ? 'Good' : 'Sparse'}
                    </Badge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-[11px] text-text-tertiary">Positions received</div>
                      <div className="font-semibold text-text-primary">{stats?.positionCount?.toLocaleString?.() ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-tertiary">Avg interval</div>
                      <div className="font-semibold text-text-primary">{stats?.avgIntervalSec == null ? '—' : `${formatNumber(stats.avgIntervalSec, 0)}s`}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-tertiary">Last interval</div>
                      <div className="font-semibold text-text-primary">{stats?.lastIntervalSec == null ? '—' : `${formatNumber(stats.lastIntervalSec, 0)}s`}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-tertiary">Last position</div>
                      <div className="font-semibold text-text-primary">{stats?.lastPositionIso ? formatRelative(stats.lastPositionIso) : '—'}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'characteristics' && (
        <div className="p-4 text-center text-text-secondary border border-border-subtle rounded-xl">
          Characteristics data not available.
        </div>
      )}

      {tab === 'port-calls' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Waypoints size={18} className="text-accent-cyan" />
              Port Call Log (GFW Events)
            </CardTitle>
            <CardDescription>
              Port visits and related events from GFW (historical back to 2012, with dataset latency).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gfwLoading && <div className="text-sm text-text-secondary">Loading…</div>}
            {!gfwLoading && (!gfwPortEvents?.entries || gfwPortEvents.entries.length === 0) && (
              <div className="text-sm text-text-secondary">No events found for this vessel.</div>
            )}
            {!gfwLoading && gfwPortEvents?.entries && gfwPortEvents.entries.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border-subtle">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase" style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-tertiary)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Start</th>
                      <th className="px-4 py-3 text-left">End</th>
                      <th className="px-4 py-3 text-left">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ '--tw-divide-color': 'var(--color-border-subtle)' } as React.CSSProperties}>
                    {gfwPortEvents.entries.map((e) => (
                      <tr key={e.id} className="hover:bg-surface-hover">
                        <td className="px-4 py-3 font-semibold text-text-primary">{formatLabel(e.type || 'event')}</td>
                        <td className="px-4 py-3 text-text-secondary">{e.start ? formatDateTime(e.start) : '—'}</td>
                        <td className="px-4 py-3 text-text-secondary">{e.end ? formatDateTime(e.end) : '—'}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {e.position ? formatCoordinates(e.position.lat, e.position.lon) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {gfwPortEvents?.nextOffset != null && (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={loadMorePortCalls} disabled={gfwLoadingMorePorts}>
                  {gfwLoadingMorePorts ? 'Loading…' : 'Load more port calls'}
                </Button>
              </div>
            )}
            <div className="text-xs text-text-tertiary">
              Tip: GFW 4Wings reports have a maximum 366-day date range per request; for full 2012→present exports we chunk by year.
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'ownership' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship size={18} className="text-accent-cyan" />
              Ownership (GFW)
            </CardTitle>
            <CardDescription>
              Raw ownership and authorization payloads from the GFW Vessels API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gfwLoading && <div className="text-sm text-text-secondary">Loading…</div>}
            {!gfwLoading && !gfwVessel?.ownership && !gfwVessel?.authorizations && (
              <div className="text-sm text-text-secondary">No ownership/authorization payload returned for this vessel.</div>
            )}
            {!gfwLoading && (!!gfwVessel?.ownership || !!gfwVessel?.authorizations) && (
              <pre className="text-xs overflow-auto rounded-xl border border-border-subtle bg-surface-overlay/30 p-3 text-text-secondary">
                {JSON.stringify({ ownership: gfwVessel?.ownership, authorizations: gfwVessel?.authorizations }, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'performance' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge size={18} className="text-accent-cyan" />
              Fishing Effort (GFW 4Wings)
            </CardTitle>
            <CardDescription>
              Apparent fishing effort hours (fishing vessels only). Data is available from 2012 to ~96 hours ago.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={generateFishingEffortReport} disabled={!gfwEndDate || fourwingsLoading}>
                {fourwingsLoading ? 'Generating…' : 'Generate 2012→latest report'}
              </Button>
              <div className="text-xs text-text-tertiary">
                4Wings `date-range` is limited to 366 days, so we request one year at a time.
              </div>
            </div>

            {fourwingsError && <div className="text-sm text-red-400">{fourwingsError}</div>}

            {fourwingsFishingByYear && (
              <div className="overflow-x-auto rounded-xl border border-border-subtle">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase" style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-tertiary)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left">Year</th>
                      <th className="px-4 py-3 text-left">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ '--tw-divide-color': 'var(--color-border-subtle)' } as React.CSSProperties}>
                    {fourwingsFishingByYear.map((r) => (
                      <tr key={r.year}>
                        <td className="px-4 py-3 font-semibold text-text-primary">{r.year}</td>
                        <td className="px-4 py-3 text-text-secondary">{formatNumber(r.hours, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!fourwingsLoading && !fourwingsFishingByYear && (
              <div className="text-sm text-text-secondary">
                Generate the report to see yearly totals (if this vessel exists in the fishing-effort dataset).
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'compliance' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio size={18} className="text-accent-cyan" />
              Compliance (GFW Insights)
            </CardTitle>
            <CardDescription>
              Risk-style indicators derived from AIS activity + authorizations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {gfwLoading && <div className="text-sm text-text-secondary">Loading…</div>}
            {!gfwLoading && !gfwInsights && (
              <div className="text-sm text-text-secondary">No insights returned for this vessel.</div>
            )}
            {!gfwLoading && gfwInsights && (
              <pre className="text-xs overflow-auto rounded-xl border border-border-subtle bg-surface-overlay/30 p-3 text-text-secondary">
                {JSON.stringify(gfwInsights, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'news' && (
        <EmptyState
          title="News requires external feeds"
          detail="AIS doesn’t provide news. We can integrate RSS/news APIs keyed by vessel name/IMO to populate this."
        />
      )}
    </div>
  );
}
