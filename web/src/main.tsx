import React from "react";
import { createRoot } from "react-dom/client";

import FlowerDelivery from "./FlowerDelivery";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Widget Error Boundary caught error:", error, errorInfo);
    // Log to server
    try {
        fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: "crash",
                data: {
                    error: error?.message || "Unknown error",
                    stack: error?.stack,
                    componentStack: errorInfo?.componentStack
                }
            })
        }).catch(e => console.error("Failed to report crash", e));
    } catch (e) {
        // Ignore reporting errors
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, textAlign: "center", fontFamily: "sans-serif", color: "#DC2626", wordBreak: "break-word" }}>
          <h3>Something went wrong.</h3>
          <p>Please try refreshing the page.</p>
          {/* Debug Info */}
          <details style={{ marginTop: 10, textAlign: "left", fontSize: "12px", color: "#666" }}>
            <summary>Debug Error Details</summary>
            <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 10, borderRadius: 4 }}>
              {(this.state as any).error?.toString()}
              <br />
              {(this.state as any).error?.stack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add hydration type definitions
interface OpenAIGlobals {
  toolOutput?: any;
  structuredContent?: any;
  toolInput?: any;
  result?: {
    structuredContent?: any;
  };
}

// Hydration Helper
const getHydrationData = (): any => {
  console.log("[Hydration] Starting hydration check...");
  
  // Check for window.openai
  if (typeof window === 'undefined') {
    console.log("[Hydration] Window is undefined");
    return {};
  }
  
  const oa = (window as any).openai as OpenAIGlobals;
  if (!oa) {
    console.log("[Hydration] window.openai not found, rendering with defaults");
    return {};
  }

  console.log("[Hydration] window.openai found:", Object.keys(oa));

  // Prioritize sources as per reference implementation
  const candidates = [
    oa.toolOutput,
    oa.structuredContent,
    oa.result?.structuredContent,
    oa.toolInput
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && Object.keys(candidate).length > 0) {
      console.log("[Hydration] Found data:", candidate);
      return candidate;
    }
  }
  
  console.log("[Hydration] No data found in any candidate source");
  return {};
};

console.log("[Main] Flower Delivery main.tsx loading...");

// App wrapper - Flower Delivery
function App({ initialData }: { initialData: any }) {
  return <FlowerDelivery initialData={initialData} />;
}

// Get initial data
const container = document.getElementById("flower-delivery-root");

if (!container) {
  throw new Error("flower-delivery-root element not found");
}

const root = createRoot(container);

const renderApp = (data: any) => {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App key={Date.now()} initialData={data} />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Initial render
const initialData = getHydrationData();
renderApp(initialData);

// Listen for late hydration events (Apps SDK pattern)
window.addEventListener('openai:set_globals', (ev: any) => {
  const globals = ev?.detail?.globals;
  if (globals) {
    console.log("[Hydration] Late event received:", globals);
    
    // Extract data from the event globals similar to getHydrationData
    const candidates = [
      globals.toolOutput,
      globals.structuredContent,
      globals.result?.structuredContent,
      globals.toolInput
    ];
    
    for (const candidate of candidates) {
       if (candidate && typeof candidate === 'object' && Object.keys(candidate).length > 0) {
          console.log("[Hydration] Re-rendering with late data:", candidate);
          // Force re-mount by changing key, ensuring initialData is applied fresh
          renderApp(candidate);
          return;
       }
    }
  }
});

// MCP Apps bridge: JSON-RPC over postMessage (official OpenAI Apps SDK pattern)
// Step 1: RPC helpers
let rpcId = 0;
const pendingRequests = new Map<number, { resolve: (v: any) => void; reject: (e: any) => void }>();

const rpcNotify = (method: string, params: any) => {
  window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
};

const rpcRequest = (method: string, params: any): Promise<any> =>
  new Promise((resolve, reject) => {
    const id = ++rpcId;
    pendingRequests.set(id, { resolve, reject });
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
  });

// Step 2: Handle incoming messages (responses + notifications)
window.addEventListener(
  "message",
  (event: MessageEvent) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.jsonrpc !== "2.0") return;

    // Handle RPC responses
    if (typeof message.id === "number") {
      const pending = pendingRequests.get(message.id);
      if (!pending) return;
      pendingRequests.delete(message.id);
      if (message.error) {
        pending.reject(message.error);
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    // Handle notifications
    if (typeof message.method !== "string") return;
    if (message.method === "ui/notifications/tool-result") {
      console.log("[Hydration] MCP Apps bridge tool-result received:", message.params);
      const toolResult = message.params;
      const data =
        toolResult?.structuredContent ??
        toolResult?.result?.structuredContent ??
        {};
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        console.log("[Hydration] Re-rendering with MCP Apps bridge data:", data);
        renderApp(data);
      }
    }
  },
  { passive: true }
);

// Step 3: Perform the required ui/initialize handshake
// Without this, ChatGPT will NOT deliver ui/notifications/tool-result messages
const initializeBridge = async () => {
  try {
    await rpcRequest("ui/initialize", {
      appInfo: { name: "flower-delivery", version: "0.1.0" },
      appCapabilities: {},
      protocolVersion: "2026-01-26",
    });
    rpcNotify("ui/notifications/initialized", {});
    console.log("[Hydration] MCP Apps bridge initialized successfully");
  } catch (error) {
    console.warn("[Hydration] Failed to initialize MCP Apps bridge (may be running outside ChatGPT):", error);
  }
};

initializeBridge();
