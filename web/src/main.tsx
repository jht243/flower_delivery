import React from "react";
import { createRoot } from "react-dom/client";

import BmiHealthHelloWorld from "./component";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
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
        <div style={{ padding: 20, textAlign: "center", fontFamily: "sans-serif", color: "#DC2626" }}>
          <h3>Something went wrong.</h3>
          <p>Please try refreshing the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById("bmi-health-calculator-root");

if (!container) {
  throw new Error("bmi-health-calculator-root element not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BmiHealthHelloWorld />
    </ErrorBoundary>
  </React.StrictMode>
);
