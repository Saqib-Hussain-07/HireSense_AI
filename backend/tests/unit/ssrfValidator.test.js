const dns = require('dns').promises;
const { isPrivateIp, assertPublicHost } = require('../../src/utils/ssrfValidator');

describe('ssrfValidator Utility', () => {
  describe('isPrivateIp', () => {
    test('identifies loopback addresses', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.100.50.1')).toBe(true);
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
    });

    test('identifies cloud metadata service addresses (169.254.169.254)', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('169.254.1.1')).toBe(true);
      expect(isPrivateIp('::ffff:169.254.169.254')).toBe(true);
    });

    test('identifies RFC 1918 private IPv4 networks', () => {
      // 10.0.0.0/8
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.254.0.1')).toBe(true);

      // 172.16.0.0/12
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.25.10.1')).toBe(true);
      expect(isPrivateIp('172.31.255.254')).toBe(true);
      // 172.15.x.x and 172.32.x.x are public
      expect(isPrivateIp('172.15.0.1')).toBe(false);
      expect(isPrivateIp('172.32.0.1')).toBe(false);

      // 192.168.0.0/16
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.100.50')).toBe(true);
    });

    test('identifies carrier-grade NAT, broadcast, and reserved networks', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.127.255.254')).toBe(true);
      expect(isPrivateIp('192.0.2.1')).toBe(true);
      expect(isPrivateIp('224.0.0.1')).toBe(true);
      expect(isPrivateIp('240.0.0.1')).toBe(true);
      expect(isPrivateIp('255.255.255.255')).toBe(true);
    });

    test('identifies IPv6 private/link-local/multicast networks', () => {
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd12:3456:789a::1')).toBe(true);
      expect(isPrivateIp('ff02::1')).toBe(true);
    });

    test('allows legitimate public IP addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('140.82.121.4')).toBe(false); // GitHub
      expect(isPrivateIp('2607:f8b0:4005:805::200e')).toBe(false); // Google IPv6
    });
  });

  describe('assertPublicHost', () => {
    test('rejects forbidden protocols', async () => {
      await expect(assertPublicHost('file:///etc/passwd')).rejects.toThrow('Forbidden protocol');
      await expect(assertPublicHost('ftp://example.com/job.txt')).rejects.toThrow('Forbidden protocol');
      await expect(assertPublicHost('gopher://127.0.0.1')).rejects.toThrow('Forbidden protocol');
    });

    test('rejects localhost and local domain names immediately', async () => {
      await expect(assertPublicHost('http://localhost:5000/job')).rejects.toThrow('private or local');
      await expect(assertPublicHost('http://service.localhost')).rejects.toThrow('private or local');
      await expect(assertPublicHost('http://backend.local')).rejects.toThrow('private or local');
    });

    test('rejects direct private and cloud metadata IP URLs', async () => {
      await expect(assertPublicHost('http://169.254.169.254/latest/meta-data/')).rejects.toThrow('private network address');
      await expect(assertPublicHost('http://127.0.0.1:8080')).rejects.toThrow('private network address');
      await expect(assertPublicHost('http://10.0.0.5')).rejects.toThrow('private network address');
      await expect(assertPublicHost('http://192.168.1.1')).rejects.toThrow('private network address');
    });

    test('rejects hostnames resolving to private IPs via DNS lookup', async () => {
      const lookupSpy = jest.spyOn(dns, 'lookup').mockResolvedValue([
        { address: '169.254.169.254', family: 4 },
      ]);

      await expect(assertPublicHost('https://attacker-internal.example.com/job')).rejects.toThrow(
        'private network address'
      );

      lookupSpy.mockRestore();
    });

    test('allows hostnames resolving to valid public IPs', async () => {
      const lookupSpy = jest.spyOn(dns, 'lookup').mockResolvedValue([
        { address: '93.184.216.34', family: 4 }, // example.com
      ]);

      const result = await assertPublicHost('https://jobs.example.com/careers/lead-dev');
      expect(result.addresses).toEqual(['93.184.216.34']);
      expect(result.url.hostname).toBe('jobs.example.com');

      lookupSpy.mockRestore();
    });
  });
});
