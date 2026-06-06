const REQUEST_SOURCE = 'UE_REMOTE_PAGE';
const RESPONSE_SOURCE = 'UE_BRIDGE_EXTENSION';
const FORWARDED_TYPES = new Set([
  'UE_BRIDGE_PING',
  'UE_LOCAL_FETCH',
]);

window.addEventListener('message', (event) => {
  if (event.source !== window) {
    return;
  }

  const message = event.data;
  if (!message || message.source !== REQUEST_SOURCE || !FORWARDED_TYPES.has(message.type) || typeof message.requestId !== 'string') {
    return;
  }

  chrome.runtime.sendMessage(
    {
      type: message.type,
      requestId: message.requestId,
      payload: message.payload ?? null,
    },
    (response) => {
      const errorMessage = chrome.runtime.lastError?.message;
      const payload = errorMessage
        ? {
            ok: false,
            error: errorMessage,
          }
        : response ?? {
            ok: false,
            error: 'No response from Unreal Engine Bridge.',
          };

      window.postMessage(
        {
          source: RESPONSE_SOURCE,
          type: `${message.type}_RESULT`,
          requestId: message.requestId,
          payload,
        },
        '*'
      );
    }
  );
});
