import { validateAttendanceAccess } from './backendService';

const ALLOWED_IPS = [];

const ALLOWED_IP_ADDRESSES = [
  '196.216.66.22',
];

async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP address:', error);
    return null;
  }
}

function isIPInCIDR(ip, cidr) {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);
  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);
  const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
  const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];
  const maskNum = -1 << (32 - mask);
  return (ipNum & maskNum) === (rangeNum & maskNum);
}

function isIPAllowed(ip) {
  if (ALLOWED_IP_ADDRESSES.includes(ip)) return true;
  for (const cidr of ALLOWED_IPS) {
    if (isIPInCIDR(ip, cidr)) return true;
  }
  return false;
}

export async function checkLocationPermission() {
  const userIP = await getUserIP();

  if (!userIP) {
    return {
      allowed: false,
      error: 'Unable to determine your IP address. Please check your internet connection.',
    };
  }

  const isAllowed = isIPAllowed(userIP);

  if (!isAllowed) {
    return {
      allowed: false,
      error: `Your IP address (${userIP}) is not in the allowed office network range. Please connect to the office WiFi network.`,
      ip: userIP,
    };
  }

  const gpsResult = await validateAttendanceAccess();

  if (!gpsResult.allowed) {
    return {
      allowed: false,
      error: gpsResult.error,
      ip: userIP,
    };
  }

  return {
    allowed: true,
    ip: userIP,
    position: gpsResult.position,
  };
}

export function getAllowedIPs() {
  return { ranges: ALLOWED_IPS, addresses: ALLOWED_IP_ADDRESSES };
}

export function addAllowedIP(ip) {
  if (ip.includes('/')) {
    ALLOWED_IPS.push(ip);
  } else {
    ALLOWED_IP_ADDRESSES.push(ip);
  }
}

export function removeAllowedIP(ip) {
  const rangeIndex = ALLOWED_IPS.indexOf(ip);
  if (rangeIndex > -1) ALLOWED_IPS.splice(rangeIndex, 1);
  const addressIndex = ALLOWED_IP_ADDRESSES.indexOf(ip);
  if (addressIndex > -1) ALLOWED_IP_ADDRESSES.splice(addressIndex, 1);
}
