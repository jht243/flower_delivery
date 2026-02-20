import re

with open("src/server.ts", "r") as f:
    code = f.read()

# 1. humanizeEventName
code = code.replace(
'''    // In-app trip actions
    widget_parse_trip: "Analyze Trip (AI)",
    widget_add_leg: "Add Leg",
    widget_delete_leg: "Delete Leg",
    widget_save_trip: "Save Order",
    widget_open_trip: "Open Order",
    widget_new_trip: "New Order",
    widget_delete_trip: "Delete Order",
    widget_duplicate_trip: "Duplicate Order",
    widget_reset: "Reset Order",
    widget_back_to_home: "Back to Home",
    widget_input_mode: "Input Mode Toggle",''',
'''    // In-app order actions
    widget_save_order: "Save Order",
    widget_open_order: "Open Order",
    widget_new_order: "New Order",
    widget_delete_order: "Delete Order",
    widget_duplicate_order: "Duplicate Order",
    widget_reset: "Reset Order",
    widget_back_to_home: "Back to Home",'''
)

# 2. Daily volume prompt analytics
code = code.replace(
'''  // --- Prompt-level analytics (from tool calls) ---
  const paramUsage: Record<string, number> = {};
  const tripTypeDist: Record<string, number> = {};
  const transportModeDist: Record<string, number> = {};

  successLogs.forEach((log) => {
    if (log.params) {
      Object.keys(log.params).forEach((key) => {
        if (log.params[key] !== undefined) {
          paramUsage[key] = (paramUsage[key] || 0) + 1;
        }
      });
      if (log.params.order_type) {
        const tt = log.params.order_type;
        tripTypeDist[tt] = (tripTypeDist[tt] || 0) + 1;
      }
      if (log.params.departure_mode) {
        const mode = log.params.departure_mode;
        transportModeDist[mode] = (transportModeDist[mode] || 0) + 1;
      }
    }
  });''',
'''  // --- Prompt-level analytics (from tool calls) ---
  const paramUsage: Record<string, number> = {};
  const occasionDist: Record<string, number> = {};
  const styleDist: Record<string, number> = {};

  successLogs.forEach((log) => {
    if (log.params) {
      Object.keys(log.params).forEach((key) => {
        if (log.params[key] !== undefined) {
          paramUsage[key] = (paramUsage[key] || 0) + 1;
        }
      });
      if (log.params.occasion) {
        const tt = log.params.occasion;
        occasionDist[tt] = (occasionDist[tt] || 0) + 1;
      }
      if (log.params.flower_preference) {
        const mode = log.params.flower_preference;
        styleDist[mode] = (styleDist[mode] || 0) + 1;
      }
    }
  });'''
)

code = code.replace(
'''  // Destinations (top 10)
  const destinationDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    if (log.params?.destination) {
      const dest = log.params.destination;
      destinationDist[dest] = (destinationDist[dest] || 0) + 1;
    }
  });

  // Departure cities (top 10)
  const departureCityDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    if (log.params?.departure_city) {
      const city = log.params.departure_city;
      departureCityDist[city] = (departureCityDist[city] || 0) + 1;
    }
  });''',
'''  // Delivery Addresses (top 10)
  const destinationDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    if (log.params?.recipient_address) {
      const dest = log.params.recipient_address;
      destinationDist[dest] = (destinationDist[dest] || 0) + 1;
    }
  });

  // Budgets (top 10)
  const departureCityDist: Record<string, number> = {};
  successLogs.forEach((log) => {
    if (log.params?.budget) {
      const city = String(log.params.budget);
      departureCityDist[city] = (departureCityDist[city] || 0) + 1;
    }
  });'''
)

# 3. Trip management actions array
code = code.replace(
'''  // Trip management actions
  const tripActions: Record<string, number> = {};
  const tripActionEvents = ["widget_parse_trip", "widget_add_leg", "widget_delete_leg", "widget_save_trip", "widget_open_trip", "widget_new_trip", "widget_delete_trip", "widget_duplicate_trip", "widget_reset", "widget_back_to_home", "widget_input_mode"];
  tripActionEvents.forEach(e => { tripActions[humanizeEventName(e)] = 0; });''',
'''  // Order management actions
  const tripActions: Record<string, number> = {};
  const tripActionEvents = ["widget_save_order", "widget_open_order", "widget_new_order", "widget_delete_order", "widget_duplicate_order", "widget_reset", "widget_back_to_home"];
  tripActionEvents.forEach(e => { tripActions[humanizeEventName(e)] = 0; });'''
)

code = code.replace(
'''  // Input mode preferences
  let freeformCount = 0;
  let manualCount = 0;

  // Leg type distribution (from add_leg events)
  const legTypeDist: Record<string, number> = {};

  // All widget interactions (catch-all)''',
'''  // All widget interactions (catch-all)'''
)

code = code.replace(
'''    // Input mode
    if (log.event === "widget_input_mode") {
      if (log.mode === "freeform") freeformCount++;
      else if (log.mode === "manual") manualCount++;
    }
    // Leg types
    if (log.event === "widget_add_leg" && log.legType) {
      legTypeDist[log.legType] = (legTypeDist[log.legType] || 0) + 1;
    }''',
''''''
)

# 4. Generate Dashboard HTML
code = code.replace(
'''      <div class="card">
        <h2>Order Type Distribution</h2>
        ${renderTable(
    ["Type", "Count", "%"],
    Object.entries(tripTypeDist).sort((a, b) => b[1] - a[1]).map(([tt, count]) => {
      const pct = successLogs.length > 0 ? ((count / successLogs.length) * 100).toFixed(0) : "0";
      const label = tt === "round_trip" ? "🔄 Round Trip" : tt === "one_way" ? "➡️ One Way" : tt === "multi_city" ? "🌍 Multi-City" : tt;
      return [label, String(count), `${pct}%`];
    }),
    "No data yet"
  )}
      </div>
      <div class="card">
        <h2>Transport Mode</h2>
        ${renderTable(
    ["Mode", "Count"],
    Object.entries(transportModeDist).sort((a, b) => b[1] - a[1]).map(([mode, count]) => {
      const icon = mode === "plane" ? "✈️" : mode === "car" ? "🚗" : mode === "train" ? "🚂" : mode === "bus" ? "🚌" : mode === "ferry" ? "⛴️" : "🚐";
      return [`${icon} ${mode}`, String(count)];
    }),
    "No data yet"
  )}
      </div>''',
'''      <div class="card">
        <h2>Occasions</h2>
        ${renderTable(
    ["Occasion", "Count", "%"],
    Object.entries(occasionDist).sort((a, b) => b[1] - a[1]).map(([tt, count]) => {
      const pct = successLogs.length > 0 ? ((count / successLogs.length) * 100).toFixed(0) : "0";
      return [tt, String(count), `${pct}%`];
    }),
    "No data yet"
  )}
      </div>
      <div class="card">
        <h2>Flower Styles</h2>
        ${renderTable(
    ["Style", "Count"],
    Object.entries(styleDist).sort((a, b) => b[1] - a[1]).map(([mode, count]) => {
      return [mode, String(count)];
    }),
    "No data yet"
  )}
      </div>'''
)

code = code.replace(
'''      <div class="card">
        <h2>🏙️ Top Destinations</h2>''',
'''      <div class="card">
        <h2>📍 Top Delivery Addresses</h2>'''
)

code = code.replace(
'''      <div class="card">
        <h2>🛫 Top Departure Cities</h2>''',
'''      <div class="card">
        <h2>💰 Top Budgets</h2>'''
)

code = code.replace(
'''      <div class="card">
        <h2>🗺️ Popular Routes</h2>
        ${(() => {
      const routes: Record<string, number> = {};
      successLogs.forEach(l => {
        if (l.params?.departure_city && l.params?.destination) {
          const route = l.params.departure_city + " → " + l.params.destination;
          routes[route] = (routes[route] || 0) + 1;
        }
      });
      return renderTable(
        ["Route", "Count"],
        Object.entries(routes).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([r, c]) => [r, String(c)]),
        "No data yet"
      );
    })()}
      </div>''',
''''''
)

code = code.replace(
'''        <h2>Trip Management</h2>''',
'''        <h2>Order Management</h2>'''
)

code = code.replace(
'''    <div class="grid-2" style="margin-bottom:20px;">
      <div class="card">
        <h2>Input Mode Preference</h2>
        ${renderTable(
      ["Mode", "Count"],
      [
        ["✨ Freeform (AI Describe)", String(freeformCount)],
        ["✏️ Manual (Add Manually)", String(manualCount)],
      ],
      "No data yet"
    )}
      </div>
      <div class="card">
        <h2>Leg Types Added</h2>
        ${renderTable(
      ["Type", "Count"],
      Object.entries(legTypeDist).sort((a, b) => b[1] - a[1]).map(([t, c]) => {
        const icon = t === "flight" ? "✈️" : t === "hotel" ? "🏨" : t === "car" ? "🚗" : t === "train" ? "🚂" : t === "bus" ? "🚌" : "📌";
        return [`${icon} ${t}`, String(c)];
      }),
      "No legs added yet"
    )}
      </div>
    </div>''',
''''''
)

code = code.replace(
'''      ${renderTable(
      ["Date", "Query", "Order Type", "From → To", "Location", "Locale"],
      successLogs.slice(0, 25).map(l => [
        `<span class="timestamp">${new Date(l.timestamp).toLocaleString()}</span>`,
        `<div style="max-width:250px;overflow:hidden;text-overflow:ellipsis;">${l.inferredQuery || "—"}</div>`,
        l.params?.order_type ? `<span class="badge badge-blue">${l.params.order_type}</span>` : "—",
        l.params?.departure_city && l.params?.destination ? `${l.params.departure_city} → ${l.params.destination}` : (l.params?.destination || "—"),
        l.userLocation ? `${l.userLocation.city || ""}${l.userLocation.region ? ", " + l.userLocation.region : ""}${l.userLocation.country ? ", " + l.userLocation.country : ""}`.replace(/^, /, "") : "—",
        l.userLocale || "—"
      ]),
      "No queries yet"
    )}''',
'''      ${renderTable(
      ["Date", "Query", "Occasion", "Address", "Location", "Locale"],
      successLogs.slice(0, 25).map(l => [
        `<span class="timestamp">${new Date(l.timestamp).toLocaleString()}</span>`,
        `<div style="max-width:250px;overflow:hidden;text-overflow:ellipsis;">${l.inferredQuery || "—"}</div>`,
        l.params?.occasion ? `<span class="badge badge-blue">${l.params.occasion}</span>` : "—",
        l.params?.recipient_address || "—",
        l.userLocation ? `${l.userLocation.city || ""}${l.userLocation.region ? ", " + l.userLocation.region : ""}${l.userLocation.country ? ", " + l.userLocation.country : ""}`.replace(/^, /, "") : "—",
        l.userLocale || "—"
      ]),
      "No queries yet"
    )}'''
)

# 5. Remove handleParseTripAI endpoint logic
parse_trip_ai = re.search(r'// AI-powered trip parsing using OpenAI\s+async function handleParseTripAI.*?// Fallback parsing when OpenAI is not available.*?function fallbackParseTripText\(text: string\): any\[\] \{.*?\n\}\n', code, re.DOTALL)
if parse_trip_ai:
    code = code.replace(parse_trip_ai.group(0), "")

code = code.replace(
'''    // AI-powered trip parsing endpoint
    if (req.method === "POST" && url.pathname === "/api/parse-trip") {
      await handleParseTripAI(req, res);
      return;
    }

    if (req.method === "OPTIONS" && (url.pathname === "/api/parse-trip" || url.pathname === "/create-checkout-session" || url.pathname === "/check-payment-status")) {''',
'''    if (req.method === "OPTIONS" && (url.pathname === "/create-checkout-session" || url.pathname === "/check-payment-status")) {'''
)

code = code.replace('''You'll receive trip planning tips and updates.''', '''You'll receive updates on upcoming seasonal arrangements and offers.''')
code = code.replace('''"No trip details provided"''', '''"No order details provided"''')
code = code.replace('''"Vote", "Feedback", "Trip"''', '''"Vote", "Feedback", "Order"''')


with open("src/server.ts", "w") as f:
    f.write(code)

