const HUB_LAT = -4.0633114;
const HUB_LNG = 39.6798947;
const ALLOWED_RADIUS_METERS = 100;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Returns distance in meters between two lat/lng points
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isWithinGeofence(lat, lng) {
  const distance = getDistanceMeters(lat, lng, HUB_LAT, HUB_LNG);
  return distance <= ALLOWED_RADIUS_METERS;
}

module.exports = { isWithinGeofence, getDistanceMeters, HUB_LAT, HUB_LNG, ALLOWED_RADIUS_METERS };
