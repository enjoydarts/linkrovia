import { lookup as lookupDns } from 'node:dns/promises';
import { request as requestHttps } from 'node:https';
import { BlockList, isIP } from 'node:net';

const deadlineMs = 5_000;
const maxBodyBytes = 64 * 1024;
const maxRedirects = 3;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const privateDnsSuffix =
  /\.(?:arpa|example|internal|invalid|local|localdomain|localhost|onion|test)$/;
const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// Block special-use and multicast IPv4. For IPv6, allow only ordinary global
// unicast and exclude special-purpose, transition, and documentation ranges.
const blocked = new BlockList();
for (const [network, prefix] of /** @type {[string, number][]} */ ([
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
])) {
  blocked.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of /** @type {[string, number][]} */ ([
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
])) {
  blocked.addSubnet(network, prefix, 'ipv6');
}
const globalUnicast = new BlockList();
globalUnicast.addSubnet('2000::', 3, 'ipv6');

/** @param {import('node:dns').LookupAddress} record */
function isPublicAddress({ address, family }) {
  if (address.includes('%') || isIP(address) !== family) return false;
  if (family === 4) return !blocked.check(address, 'ipv4');
  return (
    family === 6 &&
    globalUnicast.check(address, 'ipv6') &&
    !blocked.check(address, 'ipv6')
  );
}

/** @param {URL} target */
function publicHostname(target) {
  if (
    target.protocol !== 'https:' ||
    target.port ||
    target.username ||
    target.password
  )
    return null;

  const hostname = target.hostname.replace(/\.$/, '');
  const labels = hostname.split('.');
  if (
    hostname.length > 253 ||
    labels.length < 2 ||
    isIP(hostname) ||
    labels.some((label) => !dnsLabel.test(label)) ||
    privateDnsSuffix.test(hostname)
  ) {
    return null;
  }
  return hostname;
}

/**
 * @typedef {(hostname: string, options: import('node:dns').LookupAllOptions) => Promise<import('node:dns').LookupAddress[]>} Lookup
 * @typedef {(options: import('node:https').RequestOptions, onResponse: (response: import('node:http').IncomingMessage) => void) => import('node:http').ClientRequest} Request
 */

/**
 * @param {Request} request
 * @param {URL} target
 * @param {string} hostname
 * @param {import('node:dns').LookupAddress} record
 * @param {AbortSignal} signal
 * @returns {Promise<import('node:http').IncomingMessage>}
 */
function openPage(request, target, hostname, record, signal) {
  return new Promise((resolve, reject) => {
    const client = request(
      {
        hostname,
        port: 443,
        path: target.pathname + target.search,
        method: 'GET',
        servername: hostname,
        rejectUnauthorized: true,
        agent: false,
        family: record.family,
        signal,
        headers: {
          accept: 'text/html',
          'accept-encoding': 'identity',
          'user-agent': 'Linkrovia',
        },
        lookup(_hostname, options, callback) {
          if (options.all) callback(null, [record]);
          else callback(null, record.address, record.family);
        },
      },
      resolve,
    );
    client.once('error', reject);
    client.end();
  });
}

/** @param {import('node:http').IncomingMessage} response */
async function readHtml(response) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response) {
    const prefix = chunk.subarray(0, maxBodyBytes - bytes);
    chunks.push(prefix);
    bytes += prefix.length;
    if (bytes === maxBodyBytes) break;
  }
  return Buffer.concat(chunks, bytes).toString('utf8');
}

/**
 * Fetch a bounded HTML prefix through a directly connected, certificate-checked
 * HTTPS request. The lookup and request overrides are for isolated tests.
 * @param {string} url
 * @param {{ lookup?: Lookup, request?: Request }} [options]
 * @returns {Promise<string | null>}
 */
export async function fetchPageHead(
  url,
  { lookup = lookupDns, request = requestHttps } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  /** @type {Promise<null>} */
  const deadline = new Promise((resolve) => {
    controller.signal.addEventListener('abort', () => resolve(null), {
      once: true,
    });
  });

  try {
    const fetch = async () => {
      let target = new URL(url);
      for (let hop = 0; hop <= maxRedirects; hop++) {
        const hostname = publicHostname(target);
        if (!hostname) return null;

        // An absolute DNS query avoids resolving a target through a local search suffix.
        const addresses = await lookup(hostname + '.', { all: true });
        controller.signal.throwIfAborted();
        if (
          !addresses.length ||
          addresses.some((record) => !isPublicAddress(record))
        )
          return null;

        const response = await openPage(
          request,
          target,
          hostname,
          addresses[0],
          controller.signal,
        );
        try {
          const status = response.statusCode ?? 0;
          if (redirectStatuses.has(status)) {
            if (hop === maxRedirects || !response.headers.location) return null;
            target = new URL(response.headers.location, target);
            continue;
          }

          const mimeType = response.headers['content-type']
            ?.split(';', 1)[0]
            .trim()
            .toLowerCase();
          const encoding = response.headers['content-encoding']
            ?.trim()
            .toLowerCase();
          if (status < 200 || status >= 300 || mimeType !== 'text/html')
            return null;
          if (encoding && encoding !== 'identity') return null;

          return await readHtml(response);
        } finally {
          response.destroy();
        }
      }
      return null;
    };

    return await Promise.race([fetch(), deadline]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
