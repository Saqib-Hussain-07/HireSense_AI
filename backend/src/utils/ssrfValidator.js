const dns = require('dns').promises;
const { isIP } = require('net');

/**
 * Validates whether an IP address is private, loopback, link-local, or reserved.
 * Handles both IPv4 and IPv6, including IPv4-mapped IPv6 addresses.
 *
 * @param {string} rawIp
 * @returns {boolean}
 */
function isPrivateIp(rawIp) {
  if (!rawIp || typeof rawIp !== 'string') return true;

  let ip = rawIp.trim().toLowerCase();

  // Normalize IPv4-mapped IPv6 addresses (e.g., ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  // Check IPv4
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return true;

    // 0.0.0.0/8 (Current network)
    if (parts[0] === 0) return true;

    // 10.0.0.0/8 (Private-Use Class A)
    if (parts[0] === 10) return true;

    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;

    // 100.64.0.0/10 (Shared Address Space / CGNAT)
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

    // 169.254.0.0/16 (Link Local / Cloud Metadata Endpoint AWS/GCP/Azure: 169.254.169.254)
    if (parts[0] === 169 && parts[1] === 254) return true;

    // 172.16.0.0/12 (Private-Use Class B: 172.16.0.0 - 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0/16 (Private-Use Class C)
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;

    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Future Use)
    if (parts[0] >= 224) return true;

    // 255.255.255.255 (Broadcast)
    if (ip === '255.255.255.255') return true;

    return false;
  }

  // Check IPv6
  if (isIP(ip) === 6) {
    // Unspecified :: and Loopback ::1
    if (ip === '::' || ip === '::1' || ip === '0:0:0:0:0:0:0:0' || ip === '0:0:0:0:0:0:0:1') return true;

    // Link-local: fe80::/10 (fe8*, fe9*, fea*, feb*)
    if (/^fe[89ab]/i.test(ip)) return true;

    // Unique local address: fc00::/7 (fc*, fd*)
    if (/^f[cd]/i.test(ip)) return true;

    // Multicast: ff00::/8
    if (/^ff/i.test(ip)) return true;

    return false;
  }

  return true;
}

/**
 * Asserts that the provided URL targets a valid, public Internet host.
 * Throws an error if the URL protocol is invalid or resolves to a private/reserved address.
 *
 * @param {string} urlStr
 * @returns {Promise<{ url: URL, addresses: string[] }>}
 */
async function assertPublicHost(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (_e) {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Forbidden protocol "${parsed.protocol}". Only http and https URLs are allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase().trim();

  // Block localhost and standard loopback hostnames explicitly
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('That URL points to a private or local network address and cannot be fetched.');
  }

  let addresses = [];
  if (isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      const records = await dns.lookup(hostname, { all: true });
      addresses = records.map((r) => r.address);
    } catch (err) {
      throw new Error(`Could not resolve hostname "${hostname}": ${err.message}`);
    }
  }

  if (!addresses.length) {
    throw new Error(`Hostname "${hostname}" resolved to no IP addresses`);
  }

  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new Error('That URL points to a private network address and cannot be fetched.');
    }
  }

  return { url: parsed, addresses };
}

module.exports = {
  isPrivateIp,
  assertPublicHost,
};
