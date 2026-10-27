'use client';

declare global {
  interface Window {
    VAS?: {
      UnifiedCheckout: (captureContext: string) => Promise<{
        createCheckout: () => Promise<{
          mount: (container: string) => Promise<string>;
          on: (
            event: string,
            handler: (data?: any) => void
          ) => () => void;
        }>;
      }>;
    };
  }
}

function loadScript(
  src: string,
  integrity?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[src]')
    ).find((script) => script.src === new URL(src, document.baseURI).href);

    if (existingScript) {
      if (window.VAS?.UnifiedCheckout) {
        resolve();
      } else {
        existingScript.addEventListener('load', () => resolve(), {
          once: true,
        });
        existingScript.addEventListener(
          'error',
          () => reject(
            new Error('Failed to load CyberSource SDK script.')
          ),
          { once: true }
        );
      }
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = 'anonymous';
    }

    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error('Failed to load CyberSource SDK script.'));
    };

    document.head.appendChild(script);
  });
}

export async function mountCyberSourceCheckout(
  containerSelector: string,
  captureContext: string,
  clientLibraryUrl: string,
  integrity?: string,
  onReady?: () => void
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('CyberSource checkout requires a browser.');
  }

  if (!captureContext || !clientLibraryUrl) {
    throw new Error(
      'CyberSource checkout session information is incomplete.'
    );
  }

  await loadScript(clientLibraryUrl, integrity);

  if (
    !window.VAS ||
    typeof window.VAS.UnifiedCheckout !== 'function'
  ) {
    throw new Error(
      'CyberSource Unified Checkout SDK was not found.'
    );
  }

  const client = await window.VAS.UnifiedCheckout(captureContext);
  const checkout = await client.createCheckout();

  if (onReady) {
    checkout.on('mounted', onReady);
  }

  // This assumes the session configures automatic payment processing.
  const resultJwt = await checkout.mount(containerSelector);

  if (
    typeof resultJwt !== 'string' ||
    resultJwt.split('.').length !== 3
  ) {
    throw new Error(
      'CyberSource did not return a valid result JWT.'
    );
  }

  return resultJwt;
}