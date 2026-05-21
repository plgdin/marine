// ═══════════════════════════════════════
// Domain Types — Core Platform Models
// ═══════════════════════════════════════

import type { OrgRole } from '@config/permissions';

// ── Utility ─────────────────────────────
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = string; // UUID

// ── Geo ─────────────────────────────────
export interface GeoPoint {
  lng: number;
  lat: number;
}

// ── Vessel ──────────────────────────────
export type VesselStatus = 'active' | 'inactive' | 'maintenance';

export type NavStatus =
  | 'underway'
  | 'anchored'
  | 'not-under-command'
  | 'restricted'
  | 'moored'
  | 'aground'
  | 'fishing'
  | 'sailing'
  | 'unknown';

export type VesselType =
  | 'cargo'
  | 'tanker'
  | 'passenger'
  | 'fishing'
  | 'tug'
  | 'pleasure'
  | 'military'
  | 'sailing'
  | 'other';

export interface Vessel {
  id:           ID;
  orgId:        ID;
  mmsi:         Nullable<string>;
  imo:          Nullable<string>;
  name:         string;
  callSign:     Nullable<string>;
  flagCountry:  Nullable<string>;
  vesselType:   VesselType;
  grossTonnage: Nullable<number>;
  deadweight:   Nullable<number>;
  lengthOverall: Nullable<number>;
  beam:         Nullable<number>;
  yearBuilt:    Nullable<number>;
  status:       VesselStatus;
  metadata:     Record<string, unknown>;
  createdAt:    string;
  updatedAt:    string;
}

export interface VesselPosition {
  id:        ID;
  vesselId:  ID;
  orgId:     ID;
  location:  GeoPoint;
  heading:   Nullable<number>;  // 0–360 degrees
  course:    Nullable<number>;  // COG
  speed:     Nullable<number>;  // knots
  navStatus: NavStatus;
  rot:       Nullable<number>;  // rate of turn
  timestamp: string;
  source:    'ais' | 'manual' | 'api';
}

export interface VesselWithPosition extends Vessel {
  latestPosition: Nullable<VesselPosition>;
}

// ── Fleet ───────────────────────────────
export interface Fleet {
  id:          ID;
  orgId:       ID;
  name:        string;
  description: Nullable<string>;
  color:       Nullable<string>;
  icon:        Nullable<string>;
  vesselCount: number;
  createdAt:   string;
}

// ── Voyage ──────────────────────────────
export type VoyageStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface Voyage {
  id:             ID;
  orgId:          ID;
  vesselId:       ID;
  name:           Nullable<string>;
  originPort:     Nullable<string>;
  originLocation: Nullable<GeoPoint>;
  destPort:       Nullable<string>;
  destLocation:   Nullable<GeoPoint>;
  departureTime:  Nullable<string>;
  eta:            Nullable<string>;
  ata:            Nullable<string>;
  status:         VoyageStatus;
  distanceNm:     Nullable<number>;
  metadata:       Record<string, unknown>;
  createdAt:      string;
}

// ── Alerts ──────────────────────────────
export type AlertType =
  | 'geofence_entry'
  | 'geofence_exit'
  | 'speed'
  | 'proximity'
  | 'ais_gap'
  | 'zone'
  | 'custom';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertEvent {
  id:              ID;
  orgId:           ID;
  ruleId:          Nullable<ID>;
  vesselId:        Nullable<ID>;
  type:            AlertType;
  severity:        AlertSeverity;
  title:           string;
  description:     Nullable<string>;
  location:        Nullable<GeoPoint>;
  data:            Record<string, unknown>;
  acknowledged:    boolean;
  acknowledgedBy:  Nullable<ID>;
  acknowledgedAt:  Nullable<string>;
  createdAt:       string;
}

export interface AlertRule {
  id:             ID;
  orgId:          ID;
  name:           string;
  type:           AlertType;
  config:         Record<string, unknown>;
  severity:       AlertSeverity;
  isActive:       boolean;
  vesselIds:      Nullable<ID[]>;
  fleetIds:       Nullable<ID[]>;
  notifyChannels: string[];
  createdBy:      ID;
  createdAt:      string;
}

// ── Geofence ────────────────────────────
export type GeofenceType = 'port' | 'anchorage' | 'eca' | 'custom' | 'restricted';

export interface Geofence {
  id:          ID;
  orgId:       ID;
  name:        string;
  description: Nullable<string>;
  type:        GeofenceType;
  color:       string;
  isActive:    boolean;
  metadata:    Record<string, unknown>;
  createdAt:   string;
}

// ── Organization ────────────────────────
export interface Organization {
  id:        ID;
  name:      string;
  slug:      string;
  logoUrl:   Nullable<string>;
  planId:    Nullable<ID>;
  settings:  Record<string, unknown>;
  isActive:  boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  id:         ID;
  orgId:      ID;
  userId:     ID;
  role:       OrgRole;
  joinedAt:   string;
  // Joined profile fields
  email?:     string;
  fullName?:  string;
  avatarUrl?: Nullable<string>;
}

// ── Auth ────────────────────────────────
export interface UserProfile {
  id:        ID;
  email:     string;
  fullName:  Nullable<string>;
  avatarUrl: Nullable<string>;
  createdAt: string;
}

export interface AuthSession {
  user:        UserProfile;
  accessToken: string;
  orgId:       Nullable<ID>;
  orgRole:     Nullable<OrgRole>;
}
