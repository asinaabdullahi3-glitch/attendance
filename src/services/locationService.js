// IP address-based access control service
// Configure your office IP addresses or ranges here

// Add your office IP addresses or CIDR ranges
const ALLOWED_IPS = [
  // Remove broad ranges - only use specific IPs below
  // '192.168.1.0/24', // Example: Office network range
  // '10.0.0.0/8',     // TOO BROAD - removed to prevent hotspot access
  // Add more IP addresses or ranges as needed
];

// Specific allowed IP addresses (exact match)
const ALLOWED_IP_ADDRESSES = [
  '196.216.66.22',
  // Add your office WiFi IP addresses here
  // '192.168.1.100',
  // '192.168.1.101',
];

/**
 * Get user's public IP address
 */
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

/**
 * Check if IP address is in CIDR range
 */
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

/**
 * Check if IP address is allowed
 */
function isIPAllowed(ip) {
  // Check exact matches first
  if (ALLOWED_IP_ADDRESSES.includes(ip)) {
    return true;
  }
  
  // Check CIDR ranges
  for (const cidr of ALLOWED_IPS) {
    if (isIPInCIDR(ip, cidr)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if user's IP address is allowed to access the portal
 */
export async function checkLocationPermission() {
  const userIP = await getUserIP();
  
  if (!userIP) {
    return {
      allowed: false,
      error: 'Unable to determine your IP address. Please check your internet connection.',
    };
  }
  
  const isAllowed = isIPAllowed(userIP);
  
  if (isAllowed) {
    return {
      allowed: true,
      ip: userIP,
    };
  }
  
  return {
    allowed: false,
    error: `Your IP address (${userIP}) is not in the allowed office network range. Please connect to the office WiFi network.`,
    ip: userIP,
  };
}

/**
 * Get current allowed IP settings
 */
export function getAllowedIPs() {
  return {
    ranges: ALLOWED_IPS,
    addresses: ALLOWED_IP_ADDRESSES,
  };
}

/**
 * Add allowed IP address or range (for admin use)
 */
export function addAllowedIP(ip) {
  if (ip.includes('/')) {
    ALLOWED_IPS.push(ip);
  } else {
    ALLOWED_IP_ADDRESSES.push(ip);
  }
}

/**
 * Remove allowed IP address or range (for admin use)
 */
export function removeAllowedIP(ip) {
  const rangeIndex = ALLOWED_IPS.indexOf(ip);
  if (rangeIndex > -1) {
    ALLOWED_IPS.splice(rangeIndex, 1);
  }
  
  const addressIndex = ALLOWED_IP_ADDRESSES.indexOf(ip);
  if (addressIndex > -1) {
    ALLOWED_IP_ADDRESSES.splice(addressIndex, 1);
  }
}
