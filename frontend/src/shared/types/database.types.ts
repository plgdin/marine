export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan_id: string | null
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          plan_id?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          plan_id?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          joined_at?: string
        }
      }
      vessels: {
        Row: {
          id: string
          org_id: string
          mmsi: string | null
          imo: string | null
          name: string
          call_sign: string | null
          flag_country: string | null
          vessel_type: string
          status: 'active' | 'inactive' | 'maintenance'
          metadata: Json
          created_at: string
          updated_at: string
        }
      }
      vessel_positions: {
        Row: {
          id: string
          vessel_id: string
          org_id: string
          location: string // WKT representation or GeoJSON depending on driver
          heading: number | null
          course: number | null
          speed: number | null
          nav_status: string
          rot: number | null
          timestamp: string
          source: string
        }
      }
      api_tokens: {
        Row: {
          id: string
          org_id: string
          name: string
          token_hash: string
          scopes: string[]
          expires_at: string | null
          created_at: string
          last_used_at: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      org_role: 'owner' | 'admin' | 'member' | 'viewer'
      vessel_status: 'active' | 'inactive' | 'maintenance'
    }
  }
}
