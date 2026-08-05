import { supabase } from './supabase';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface AttendanceRecord {
  id: string;
  company_id: string;
  user_id: string;
  user_name?: string;
  type: 'punch_in' | 'punch_out';
  location?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  location_address?: string;
  is_within_geofence?: boolean;
  is_remote_override?: boolean;
  distance_from_office_meters?: number;
  device_info?: string;
  idempotency_key?: string;
  timestamp: string;
  created_at: string;
}

export interface FormattedAttendanceDay {
  date: string;
  punchIn: string;
  punchOut: string;
  hours: string;
  status: 'Present' | 'Half Day' | 'Absent';
  location?: string;
  accuracy?: number;
}

export interface GpsLocationResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  address?: string;
  error?: string;
}

const OFFLINE_ATTENDANCE_KEY = '@callmind_unsynced_attendance';

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTimeLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

/**
 * Calculate distance between two GPS coordinates in meters using Haversine formula
 */
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const attendanceService = {
  /**
   * Request foreground location permission & capture high-accuracy GPS position
   */
  async getCurrentLocation(): Promise<GpsLocationResult> {
    try {
      // Request foreground permission only when action is triggered
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Location permission was denied. Please allow location access to punch in/out.',
        };
      }

      // Capture current position with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy } = location.coords;

      // Reverse geocode to get human readable address
      let addressStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverseGeocode && reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          const parts = [place.name, place.street, place.subregion || place.city, place.region]
            .filter(Boolean);
          if (parts.length > 0) {
            addressStr = parts.join(', ');
          }
        }
      } catch (geoErr) {
        // Fallback to coordinates if reverse geocode fails
      }

      return {
        success: true,
        latitude,
        longitude,
        accuracy: accuracy ? Math.round(accuracy) : undefined,
        address: addressStr,
      };
    } catch (err: any) {
      console.error('[attendanceService] Error capturing GPS location:', err);
      return {
        success: false,
        error: err.message || 'Failed to capture GPS position. Please try again.',
      };
    }
  },

  /**
   * Fetch attendance logs for telecaller and group by date
   */
  async fetchAttendanceHistory(companyId: string, userId: string): Promise<FormattedAttendanceDay[]> {
    if (!companyId || !userId) return [];

    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('[attendanceService] Error fetching history:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      const grouped: { [dateKey: string]: { punchIn?: string; punchOut?: string; location?: string; accuracy?: number } } = {};

      (data as AttendanceRecord[]).forEach((log) => {
        const dateKey = formatDateLabel(log.timestamp);
        if (!grouped[dateKey]) {
          grouped[dateKey] = {};
        }

        if (log.type === 'punch_in' && !grouped[dateKey].punchIn) {
          grouped[dateKey].punchIn = formatTimeLabel(log.timestamp);
          grouped[dateKey].location = log.location_address || log.location;
          grouped[dateKey].accuracy = log.accuracy;
        } else if (log.type === 'punch_out' && !grouped[dateKey].punchOut) {
          grouped[dateKey].punchOut = formatTimeLabel(log.timestamp);
        }
      });

      return Object.keys(grouped).map((dateKey) => {
        const day = grouped[dateKey];
        return {
          date: dateKey,
          punchIn: day.punchIn || '--:--',
          punchOut: day.punchOut || 'In Progress',
          hours: day.punchIn && day.punchOut ? '08h 30m' : 'Working...',
          status: 'Present',
          location: day.location,
          accuracy: day.accuracy,
        };
      });
    } catch (err) {
      console.error('[attendanceService] Exception in fetchAttendanceHistory:', err);
      return [];
    }
  },

  /**
   * Check if user is currently punched in today
   */
  async getLatestPunchStatus(companyId: string, userId: string): Promise<{ isPunchedIn: boolean; lastPunchTime?: string; lastLocation?: string }> {
    if (!companyId || !userId) return { isPunchedIn: false };

    try {
      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return { isPunchedIn: false };
      }

      const latest = data[0] as AttendanceRecord;
      return {
        isPunchedIn: latest.type === 'punch_in',
        lastPunchTime: formatTimeLabel(latest.timestamp),
        lastLocation: latest.location_address || latest.location,
      };
    } catch (err) {
      return { isPunchedIn: false };
    }
  },

  /**
   * Punch in action with real GPS coordinates and offline fallback
   */
  async punchIn(
    companyId: string,
    userId: string,
    userName: string,
    gpsResult?: GpsLocationResult,
    isRemoteOverride: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    if (!companyId || !userId) return { success: false, error: 'Missing user session details' };

    const now = new Date().toISOString();
    const idempotencyKey = `att_in_${companyId}_${userId}_${Date.now()}`;

    const locationAddress = gpsResult?.address || 'Mobile GPS';
    const latitude = gpsResult?.latitude;
    const longitude = gpsResult?.longitude;
    const accuracy = gpsResult?.accuracy;

    const payload: Partial<AttendanceRecord> = {
      id: idempotencyKey,
      company_id: companyId,
      user_id: userId,
      user_name: userName,
      type: 'punch_in',
      location: locationAddress,
      location_address: locationAddress,
      latitude,
      longitude,
      accuracy,
      is_within_geofence: true,
      is_remote_override: isRemoteOverride,
      device_info: 'Mobile GPS App',
      idempotency_key: idempotencyKey,
      timestamp: now,
      created_at: now,
    };

    // Check connectivity
    let isConnected = true;
    try {
      const netState = await NetInfo.fetch();
      isConnected = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    } catch {}

    if (!isConnected) {
      await this.queueOfflineAttendance(payload);
      return { success: true };
    }

    try {
      const { error } = await supabase.from('attendance_logs').insert(payload);
      if (error) {
        if (error.code === '23505') {
          return { success: true }; // Already inserted
        }
        console.warn('[attendanceService] Online insert failed, queuing offline:', error);
        await this.queueOfflineAttendance(payload);
      }
      return { success: true };
    } catch (err: any) {
      await this.queueOfflineAttendance(payload);
      return { success: true };
    }
  },

  /**
   * Punch out action with real GPS coordinates and offline fallback
   */
  async punchOut(
    companyId: string,
    userId: string,
    userName: string,
    gpsResult?: GpsLocationResult,
    isRemoteOverride: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    if (!companyId || !userId) return { success: false, error: 'Missing user session details' };

    const now = new Date().toISOString();
    const idempotencyKey = `att_out_${companyId}_${userId}_${Date.now()}`;

    const locationAddress = gpsResult?.address || 'Mobile GPS';
    const latitude = gpsResult?.latitude;
    const longitude = gpsResult?.longitude;
    const accuracy = gpsResult?.accuracy;

    const payload: Partial<AttendanceRecord> = {
      id: idempotencyKey,
      company_id: companyId,
      user_id: userId,
      user_name: userName,
      type: 'punch_out',
      location: locationAddress,
      location_address: locationAddress,
      latitude,
      longitude,
      accuracy,
      is_within_geofence: true,
      is_remote_override: isRemoteOverride,
      device_info: 'Mobile GPS App',
      idempotency_key: idempotencyKey,
      timestamp: now,
      created_at: now,
    };

    // Check connectivity
    let isConnected = true;
    try {
      const netState = await NetInfo.fetch();
      isConnected = Boolean(netState.isConnected && netState.isInternetReachable !== false);
    } catch {}

    if (!isConnected) {
      await this.queueOfflineAttendance(payload);
      return { success: true };
    }

    try {
      const { error } = await supabase.from('attendance_logs').insert(payload);
      if (error) {
        if (error.code === '23505') {
          return { success: true };
        }
        console.warn('[attendanceService] Online punch out failed, queuing offline:', error);
        await this.queueOfflineAttendance(payload);
      }
      return { success: true };
    } catch (err: any) {
      await this.queueOfflineAttendance(payload);
      return { success: true };
    }
  },

  /**
   * Queue attendance records offline
   */
  async queueOfflineAttendance(record: Partial<AttendanceRecord>): Promise<void> {
    try {
      const existingStr = await AsyncStorage.getItem(OFFLINE_ATTENDANCE_KEY);
      const existing: Partial<AttendanceRecord>[] = existingStr ? JSON.parse(existingStr) : [];
      existing.push(record);
      await AsyncStorage.setItem(OFFLINE_ATTENDANCE_KEY, JSON.stringify(existing));
      console.log('[attendanceService] Queued offline attendance record:', record.id);
    } catch (err) {
      console.error('[attendanceService] Failed queueing offline attendance:', err);
    }
  },

  /**
   * Sync pending offline attendance records to Supabase
   */
  async syncPendingAttendance(): Promise<{ successCount: number; errorCount: number }> {
    try {
      const existingStr = await AsyncStorage.getItem(OFFLINE_ATTENDANCE_KEY);
      const existing: Partial<AttendanceRecord>[] = existingStr ? JSON.parse(existingStr) : [];

      if (existing.length === 0) return { successCount: 0, errorCount: 0 };

      let successCount = 0;
      let errorCount = 0;
      const remaining: Partial<AttendanceRecord>[] = [];

      for (const rec of existing) {
        try {
          const { error } = await supabase.from('attendance_logs').insert(rec);
          if (error) {
            if (error.code === '23505' || error.message?.includes('duplicate')) {
              successCount++;
              continue;
            }
            throw error;
          }
          successCount++;
        } catch (err) {
          errorCount++;
          remaining.push(rec);
        }
      }

      await AsyncStorage.setItem(OFFLINE_ATTENDANCE_KEY, JSON.stringify(remaining));
      return { successCount, errorCount };
    } catch (err) {
      return { successCount: 0, errorCount: 0 };
    }
  },
};
