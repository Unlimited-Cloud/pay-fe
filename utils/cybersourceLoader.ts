// utils/cybersourceLoader.ts

declare global {
    interface Window {
      VAS?: {
        UnifiedCheckout: (captureContext: string) => Promise<{
          createCheckout: () => Promise<{
            mount: (container: string) => Promise<string>;
          }>;
        }>;
      };
    }
  }
  
  // Injects the UnifiedCheckout.js script into <head> with SRI check
  function loadScript(src: string, integrity?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
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
      script.onerror = () => reject(new Error('Failed to load CyberSource SDK script from network'));
      document.head.appendChild(script);
    });
  }
  
  // Mounts checkout and resolves with the result_jwt once the user submits payment
  export async function mountCyberSourceCheckout(
    containerSelector: string,
    captureContext: string,
    clientLibraryUrl: string,
    integrity?: string
  ): Promise<string> {
    // 1. Load the script tag
    await loadScript(clientLibraryUrl, integrity);
  
    // 2. Verify window.VAS exists
    if (!window.VAS || typeof window.VAS.UnifiedCheckout !== 'function') {
      throw new Error('window.VAS.UnifiedCheckout SDK was not found after loading script.');
    }
  
    // 3. Initialize SDK
    const client = await window.VAS.UnifiedCheckout(captureContext);
    const checkout = await client.createCheckout();
  
    // 4. Mount into container (resolves with result JWT when payment is completed)
    const resultJwt = await checkout.mount(containerSelector);
    return resultJwt;
  }