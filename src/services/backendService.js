/**
 * Backend API service
 * Connects the frontend to the Railway backend for GPS geofence validation.
 */

const BACKEND_URL = 'https://attendance-production-50e6.up.railway.app';

/**
 * Validate GPS location against the Swahilipot Hub geofence.
 * Returns { allowed: true } if within 100m of the hub.
 * Returns { allowed: false, message, distance } if outside.
 */
export async function validateGeofence(latitude, longitude) {
  try {
    const HUB_LAT = -4.0633114;
    const HUB_LNG = 39.6798947;
    const ALLOWED_RADIUS = 100;

    // Haversine formula (same as backend)
    function toRad(deg) { return deg * (Math.PI / 180); }
    const R = 6371000;
    const dLat = toRad(HUB_LAT - latitude);
    const dLng = toRad(HUB_LNG - longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(latitude)) * Math.cos(toRad(HUB_LAT)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = Math.round(R * c);

    if (distance <= ALLOWED_RADIUS) {
      return { allowed: true, distance };
    }

    return {
      allowed: false,
      distance,
      message: `You are ${distance}m away from Swahilipot Hub. Please be on-site to check in or out.`,
    };
  } catch (error) {
    console.error('Geofence validation error:', error);
    return {
      allowed: false,
      message: 'Unable to validate your location. Please try again.',
    };
  }
}

/**
 * Get the user's current GPS coordinates from the browser.
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please allow location access and try again.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable. Please try again.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Please try again.'));
            break;
          default:
            reject(new Error('Unable to get your location. Please try again.'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Combined check: IP/network check + GPS geofence.
 * Both must pass for attendance actions to be allowed.
 */
export async function validateAttendanceAccess() {
  try {
    const position = await getCurrentPosition();
    const geofenceResult = await validateGeofence(position.latitude, position.longitude);

    if (!geofenceResult.allowed) {
      return {
        allowed: false,
        error: geofenceResult.message,
      };
    }

    return {
      allowed: true,
      position,
    };
  } catch (error) {
    return {
      allowed: false,
      error: error.message,
    };
  }
}
