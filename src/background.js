chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });

  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    case 'UE_BRIDGE_PING':
      return {
        ok: true,
        installed: true,
        version: chrome.runtime.getManifest().version,
        mode: 'proxy',
      };
    case 'UE_LOCAL_FETCH':
      return forwardLocalRequest(message?.payload ?? {});
    default:
      return {
        ok: false,
        error: `Unsupported bridge message: ${message?.type ?? 'unknown'}`,
      };
  }
}

function assertAllowedResourceUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('Missing bridge request URL.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid bridge request URL: ${rawUrl}`);
  }

  if (parsedUrl.protocol === 'http:') {
    if (!['127.0.0.1', 'localhost'].includes(parsedUrl.hostname)) {
      throw new Error(`Blocked non-local host: ${parsedUrl.hostname}`);
    }

    if (parsedUrl.port && parsedUrl.port !== '30010') {
      throw new Error(`Blocked localhost port: ${parsedUrl.port}`);
    }

    return parsedUrl.toString();
  }

  throw new Error('Only http:// localhost requests are supported.');
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function guessContentType(url, responseHeaders) {
  const headerContentType = responseHeaders['content-type'];
  if (typeof headerContentType === 'string' && headerContentType.trim()) {
    return headerContentType;
  }

  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return '';
    }
  })();

  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.gif')) return 'image/gif';
  if (pathname.endsWith('.bmp')) return 'image/bmp';

  return '';
}

async function forwardLocalRequest(payload) {
  const url = assertAllowedResourceUrl(payload?.url);
  const method = typeof payload?.method === 'string' ? payload.method.toUpperCase() : 'GET';
  const headers = payload?.headers && typeof payload.headers === 'object' ? payload.headers : {};
  const body = typeof payload?.body === 'string' ? payload.body : undefined;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
    });
  } catch {
    throw new Error(`Unable to connect to bridge target: ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const bodyBase64 = uint8ArrayToBase64(bytes);
  const bodyText = new TextDecoder().decode(bytes);
  const responseHeaders = Object.fromEntries(response.headers.entries());
  const inferredContentType = guessContentType(url, responseHeaders);
  if (inferredContentType && !responseHeaders['content-type']) {
    responseHeaders['content-type'] = inferredContentType;
  }

  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    bodyText,
    bodyBase64,
  };
}
