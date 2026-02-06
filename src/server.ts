import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

type TripPlannerWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve project root: prefer ASSETS_ROOT only if it actually has an assets/ directory
const DEFAULT_ROOT_DIR = path.resolve(__dirname, "..");
const ROOT_DIR = (() => {
  const envRoot = process.env.ASSETS_ROOT;
  if (envRoot) {
    const candidate = path.resolve(envRoot);
    try {
      const candidateAssets = path.join(candidate, "assets");
      if (fs.existsSync(candidateAssets)) {
        return candidate;
      }
    } catch {
      // fall through to default
    }
  }
  return DEFAULT_ROOT_DIR;
})();

const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");
const LOGS_DIR = path.resolve(__dirname, "..", "logs");

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

type AnalyticsEvent = {
  timestamp: string;
  event: string;
  [key: string]: any;
};

function logAnalytics(event: string, data: Record<string, any> = {}) {
  const entry: AnalyticsEvent = {
    timestamp: new Date().toISOString(),
    event,
    ...data,
  };

  const logLine = JSON.stringify(entry);
  console.log(logLine);

  const today = new Date().toISOString().split("T")[0];
  const logFile = path.join(LOGS_DIR, `${today}.log`);
  fs.appendFileSync(logFile, logLine + "\n");
}

function getRecentLogs(days: number = 7): AnalyticsEvent[] {
  const logs: AnalyticsEvent[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const logFile = path.join(LOGS_DIR, `${dateStr}.log`);

    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile, "utf8");
      const lines = content.trim().split("\n");
      lines.forEach((line) => {
        try {
          logs.push(JSON.parse(line));
        } catch (e) {}
      });
    }
  }

  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function classifyDevice(userAgent?: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "iOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  if (ua.includes("cros")) return "ChromeOS";
  return "Other";
}

function computeSummary(args: any) {
  const destination = args.destination || null;
  const departureCity = args.departure_city || null;
  const tripType = args.trip_type || "round_trip";
  const travelers = Number(args.travelers) || 1;
  const departureDate = args.departure_date || null;
  const returnDate = args.return_date || null;
  const departureMode = args.departure_mode || "plane";
  const multiCityLegs = args.multi_city_legs || [];
  
  // Calculate trip duration from dates if available
  let tripDays: number | null = null;
  if (departureDate && returnDate) {
    const diff = new Date(returnDate).getTime() - new Date(departureDate).getTime();
    tripDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }
  
  // Count expected legs
  const expectedFlights = tripType === "one_way" ? 1 : tripType === "round_trip" ? 2 : multiCityLegs.length;
  const expectedHotels = tripType === "multi_city" ? multiCityLegs.length : (tripType === "one_way" ? 1 : 1);
  
  return {
    destination,
    departure_city: departureCity,
    trip_type: tripType,
    travelers,
    departure_date: departureDate,
    return_date: returnDate,
    trip_days: tripDays,
    departure_mode: departureMode,
    expected_flights: expectedFlights,
    expected_hotels: expectedHotels,
    multi_city_legs: multiCityLegs.length > 0 ? multiCityLegs : null,
  };
}

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "pnpm run build" before starting the server.`
    );
  }

  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;
  let loadedFrom = "";

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
    loadedFrom = directPath;
  } else {
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      const fallbackPath = path.join(ASSETS_DIR, fallback);
      htmlContents = fs.readFileSync(fallbackPath, "utf8");
      loadedFrom = fallbackPath;
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "pnpm run build" to generate the assets.`
    );
  }

  console.log(`[Widget Load] File: ${loadedFrom}`);
  console.log(`[Widget Load] HTML length: ${htmlContents.length} bytes`);

  return htmlContents;
}

// Use git commit hash for deterministic cache-busting across deploys
// Added timestamp suffix to force cache invalidation for width fix
const VERSION = (process.env.RENDER_GIT_COMMIT?.slice(0, 7) || Date.now().toString()) + '-' + Date.now();

function widgetMeta(widget: TripPlannerWidget, bustCache: boolean = false) {
  const templateUri = bustCache
    ? `ui://widget/trip-planner.html?v=${VERSION}`
    : widget.templateUri;

  return {
    "openai/outputTemplate": templateUri,
    "openai/widgetDescription":
      "A trip planner and organizer that helps users keep track of all their travel reservations — flights, hotels, trains, rental cars, and ground transport — in one place. Supports round-trip, one-way, and multi-city itineraries. Call this tool immediately with NO arguments to let the user enter their trip details manually. Only provide arguments if the user has explicitly stated them.",
    "openai/componentDescriptions": {
      "trip-form": "Input form for describing a trip in plain language or manually adding legs (flights, hotels, transport).",
      "itinerary-display": "Day-by-day itinerary view showing all trip legs with booking status indicators.",
      "booking-checklist": "Summary checklist showing booking progress for flights, lodging, and ground transport.",
    },
    "openai/widgetKeywords": [
      "trip planner",
      "travel organizer",
      "itinerary",
      "flight tracker",
      "hotel booking",
      "multi-city trip",
      "round trip",
      "one way",
      "travel reservations",
      "booking checklist",
      "vacation planner",
      "trip legs"
    ],
    "openai/sampleConversations": [
      { "user": "Help me organize my trip", "assistant": "Here is the Trip Planner. Describe your trip or add flights, hotels, and transport manually." },
      { "user": "I'm flying from Boston to Paris on June 11, then Paris to Geneva, then back to Boston on June 24", "assistant": "I've set up a multi-city trip with 3 legs. You can now add hotels and ground transport for each city." },
      { "user": "Plan a round trip from NYC to London for 2 weeks", "assistant": "I've created a round-trip itinerary from NYC to London. Add your flight details, hotel, and airport transport." },
    ],
    "openai/starterPrompts": [
      "Help me organize my upcoming trip",
      "Plan a round trip from Boston to Paris",
      "I need to track my multi-city Europe trip",
      "Organize my flights and hotels for vacation",
      "Create an itinerary for my business trip to Tokyo",
      "Help me plan a trip from NYC to London for 2 weeks",
      "Track my travel reservations",
    ],
    "openai/widgetPrefersBorder": true,
    "openai/widgetCSP": {
      connect_domains: [
        "https://trip-planner-q79n.onrender.com",
        "https://nominatim.openstreetmap.org",
        "https://api.open-meteo.com",
        "https://geocoding-api.open-meteo.com"
      ],
      resource_domains: [
        "https://trip-planner-q79n.onrender.com"
      ],
    },
    "openai/widgetDomain": "https://web-sandbox.oaiusercontent.com",
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const widgets: TripPlannerWidget[] = [
  {
    id: "trip-planner",
    title: "Trip Planner & Organizer — Keep all your travel reservations in one place",
    templateUri: `ui://widget/trip-planner.html?v=${VERSION}`,
    invoking:
      "Opening the Trip Planner & Organizer...",
    invoked:
      "Here is the Trip Planner & Organizer. Describe your trip or manually add flights, hotels, and transport to build your itinerary.",
    html: readWidgetHtml("trip-planner"),
  },
];

const widgetsById = new Map<string, TripPlannerWidget>();
const widgetsByUri = new Map<string, TripPlannerWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

const toolInputSchema = {
  type: "object",
  properties: {
    destination: { type: "string", description: "Primary destination city or country." },
    departure_city: { type: "string", description: "City the traveler is departing from." },
    trip_type: { type: "string", enum: ["round_trip", "one_way", "multi_city"], description: "Type of trip." },
    departure_date: { type: "string", description: "Departure date in YYYY-MM-DD format." },
    return_date: { type: "string", description: "Return date in YYYY-MM-DD format (for round trips)." },
    travelers: { type: "number", description: "Number of travelers." },
    departure_mode: { type: "string", enum: ["plane", "rail", "bus", "ferry"], description: "Primary transport mode for the trip." },
    multi_city_legs: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, date: { type: "string" }, mode: { type: "string" } } }, description: "Array of multi-city leg objects with from, to, date, and mode fields." },
    trip_description: { type: "string", description: "Freeform text describing the trip for AI-powered parsing." },
  },
  required: [],
  additionalProperties: false,
  $schema: "http://json-schema.org/draft-07/schema#",
} as const;

const toolInputParser = z.object({
  destination: z.string().optional(),
  departure_city: z.string().optional(),
  trip_type: z.enum(["round_trip", "one_way", "multi_city"]).optional(),
  departure_date: z.string().optional(),
  return_date: z.string().optional(),
  travelers: z.number().optional(),
  departure_mode: z.enum(["plane", "rail", "bus", "ferry"]).optional(),
  multi_city_legs: z.array(z.object({ from: z.string().optional(), to: z.string().optional(), date: z.string().optional(), mode: z.string().optional() })).optional(),
  trip_description: z.string().optional(),
});

const tools: Tool[] = widgets.map((widget) => ({
  name: widget.id,
  description:
    "Use this tool to plan and organize a trip including flights, hotels, trains, and ground transport. Supports round-trip, one-way, and multi-city itineraries. Call this tool immediately with NO arguments to let the user enter their trip details manually. Only provide arguments if the user has explicitly stated them.",
  inputSchema: toolInputSchema,
  outputSchema: {
    type: "object",
    properties: {
      ready: { type: "boolean" },
      timestamp: { type: "string" },
      destination: { type: ["string", "null"] },
      departure_city: { type: ["string", "null"] },
      trip_type: { type: ["string", "null"] },
      departure_date: { type: ["string", "null"] },
      return_date: { type: ["string", "null"] },
      travelers: { type: ["number", "null"] },
      departure_mode: { type: ["string", "null"] },
      input_source: { type: "string", enum: ["user", "default"] },
      summary: {
        type: "object",
        properties: {
          destination: { type: ["string", "null"] },
          departure_city: { type: ["string", "null"] },
          trip_type: { type: ["string", "null"] },
          travelers: { type: ["number", "null"] },
          departure_date: { type: ["string", "null"] },
          return_date: { type: ["string", "null"] },
          trip_days: { type: ["number", "null"] },
          departure_mode: { type: ["string", "null"] },
          expected_flights: { type: ["number", "null"] },
          expected_hotels: { type: ["number", "null"] },
          multi_city_legs: { type: ["array", "null"] },
        },
      },
      suggested_followups: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
  title: widget.title,
  securitySchemes: [{ type: "noauth" }],
  _meta: {
    ...widgetMeta(widget),
    "openai/visibility": "public",
    securitySchemes: [{ type: "noauth" }],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
}));

const resources: Resource[] = widgets.map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description:
    "HTML template for the Trip Planner & Organizer widget.",
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description:
    "Template descriptor for the Trip Planner & Organizer widget.",
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

function createTripPlannerServer(): Server {
  const server = new Server(
    {
      name: "trip-planner",
      version: "0.1.0",
      description:
        "Smart Trip Planner helps users organize all legs of their trip to ensure they don't miss any flights, hotels, or travel reservations.",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => {
      console.log(`[MCP] resources/list called, returning ${resources.length} resources`);
      resources.forEach((r: any) => {
        console.log(`  - ${r.uri} (${r.name})`);
      });
      return { resources };
    }
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      const htmlToSend = widget.html;

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: htmlToSend,
            _meta: widgetMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({ resourceTemplates })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({ tools })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const startTime = Date.now();
      let userAgentString: string | null = null;
      let deviceCategory = "Unknown";
      
      // Log the full request to debug _meta location
      console.log("Full request object:", JSON.stringify(request, null, 2));
      
      try {
        const widget = widgetsById.get(request.params.name);

        if (!widget) {
          logAnalytics("tool_call_error", {
            error: "Unknown tool",
            toolName: request.params.name,
          });
          throw new Error(`Unknown tool: ${request.params.name}`);
        }

        // Parse and validate input parameters
        let args: z.infer<typeof toolInputParser> = {};
        try {
          args = toolInputParser.parse(request.params.arguments ?? {});
        } catch (parseError: any) {
          logAnalytics("parameter_parse_error", {
            toolName: request.params.name,
            params: request.params.arguments,
            error: parseError.message,
          });
          throw parseError;
        }

        // Capture user context from _meta - try multiple locations
        const meta = (request as any)._meta || request.params?._meta || {};
        const userLocation = meta["openai/userLocation"];
        const userLocale = meta["openai/locale"];
        const userAgent = meta["openai/userAgent"];
        userAgentString = typeof userAgent === "string" ? userAgent : null;
        deviceCategory = classifyDevice(userAgentString);
        
        // Debug log
        console.log("Captured meta:", { userLocation, userLocale, userAgent });

        // If ChatGPT didn't pass structured arguments, try to infer trip details from freeform text in meta
        try {
          const candidates: any[] = [
            meta["openai/subject"],
            meta["openai/userPrompt"],
            meta["openai/userText"],
            meta["openai/lastUserMessage"],
            meta["openai/inputText"],
            meta["openai/requestText"],
          ];
          const userText = candidates.find((t) => typeof t === "string" && t.trim().length > 0) || "";

          // Infer destination (e.g., "trip to Paris", "vacation in Hawaii", "flying to London")
          if (args.destination === undefined) {
            const destMatch = userText.match(/(?:trip|travel|going|vacation|visit|flying|headed)\s+(?:to|in)\s+([A-Za-z\s,]+?)(?:\.|,|for|on|\s+\d|\s*$)/i);
            if (destMatch) {
              args.destination = destMatch[1].trim();
            }
          }

          // Infer departure city (e.g., "from Boston", "leaving from NYC")
          if (args.departure_city === undefined) {
            const fromMatch = userText.match(/(?:from|leaving|departing)\s+([A-Za-z\s]+?)(?:\s+to\s|\.|,|on|\s*$)/i);
            if (fromMatch) {
              args.departure_city = fromMatch[1].trim();
            }
          }

          // Infer trip type
          if (args.trip_type === undefined) {
            if (/multi[\s-]?city|multiple\s+cities|several\s+cities|then\s+to/i.test(userText)) {
              args.trip_type = "multi_city";
            } else if (/one[\s-]?way|not\s+coming\s+back|moving/i.test(userText)) {
              args.trip_type = "one_way";
            } else if (/round[\s-]?trip|return|coming\s+back|back\s+to/i.test(userText)) {
              args.trip_type = "round_trip";
            }
          }

          // Infer dates (e.g., "June 11", "on 2026-06-11")
          if (args.departure_date === undefined) {
            const dateMatch = userText.match(/(\d{4}-\d{2}-\d{2})/i);
            if (dateMatch) {
              args.departure_date = dateMatch[1];
            }
          }

          // Infer travelers count
          if (args.travelers === undefined) {
            const travelerMatch = userText.match(/(\d+)\s*(?:traveler|people|person|of us)/i);
            if (travelerMatch) {
              args.travelers = parseInt(travelerMatch[1]);
            } else if (/\b(girlfriend|wife|boyfriend|husband|partner|spouse)\b/i.test(userText)) {
              args.travelers = 2;
            } else if (/\bsolo\b|\balone\b|\bjust\s+me\b/i.test(userText)) {
              args.travelers = 1;
            }
          }

          // Infer transport mode
          if (args.departure_mode === undefined) {
            if (/\btrain\b|\brail\b|\bamtrak\b|\beurostar\b/i.test(userText)) args.departure_mode = "rail";
            else if (/\bbus\b|\bgreyhound\b|\bcoach\b/i.test(userText)) args.departure_mode = "bus";
            else if (/\bferry\b|\bboat\b|\bcruise\b/i.test(userText)) args.departure_mode = "ferry";
          }

          // Store freeform text as trip_description for AI parsing on the client
          if (!args.trip_description && userText.length > 10) {
            args.trip_description = userText;
          }

        } catch (e) {
          console.warn("Parameter inference from meta failed", e);
        }


        const responseTime = Date.now() - startTime;

        // Check if we are using defaults (i.e. no arguments provided)
        const usedDefaults = Object.keys(args).length === 0;

        // Infer likely user query from parameters
        const inferredQuery = [] as string[];
        if (args.departure_city) inferredQuery.push(`From: ${args.departure_city}`);
        if (args.destination) inferredQuery.push(`To: ${args.destination}`);
        if (args.trip_type) inferredQuery.push(`Type: ${args.trip_type}`);
        if (args.departure_date) inferredQuery.push(`Departs: ${args.departure_date}`);
        if (args.return_date) inferredQuery.push(`Returns: ${args.return_date}`);
        if (args.travelers) inferredQuery.push(`Travelers: ${args.travelers}`);
        if (args.departure_mode) inferredQuery.push(`Mode: ${args.departure_mode}`);

        logAnalytics("tool_call_success", {
          toolName: request.params.name,
          params: args,
          inferredQuery: inferredQuery.length > 0 ? inferredQuery.join(", ") : "Trip Planner",
          responseTime,

          device: deviceCategory,
          userLocation: userLocation
            ? {
                city: userLocation.city,
                region: userLocation.region,
                country: userLocation.country,
                timezone: userLocation.timezone,
              }
            : null,
          userLocale,
          userAgent,
        });

        // Use a stable template URI so toolOutput reliably hydrates the component
        const widgetMetadata = widgetMeta(widget, false);
        console.log(`[MCP] Tool called: ${request.params.name}, returning templateUri: ${(widgetMetadata as any)["openai/outputTemplate"]}`);

        // Build structured content once so we can log it and return it.
        // For the trip planner, expose fields relevant to trip details
        const structured = {
          ready: true,
          timestamp: new Date().toISOString(),
          ...args,
          input_source: usedDefaults ? "default" : "user",
          // Summary + follow-ups for natural language UX
          summary: computeSummary(args),
          suggested_followups: [
            "Add hotels for each city",
            "What ground transport do I need?",
            "Show me my booking checklist",
            "Help me add flight details"
          ],
        } as const;

        // Embed the widget resource in _meta to mirror official examples and improve hydration reliability
        const metaForReturn = {
          ...widgetMetadata,
          "openai.com/widget": {
            type: "resource",
            resource: {
              uri: widget.templateUri,
              mimeType: "text/html+skybridge",
              text: widget.html,
              title: widget.title,
            },
          },
        } as const;

        console.log("[MCP] Returning outputTemplate:", (metaForReturn as any)["openai/outputTemplate"]);
        console.log("[MCP] Returning structuredContent:", structured);

        // Log success analytics
        try {
          // Check for "empty" result - when no main travel inputs are provided
          const hasMainInputs = args.destination || args.departure_city || args.trip_type || args.departure_date;
          
          if (!hasMainInputs) {
             logAnalytics("tool_call_empty", {
               toolName: request.params.name,
               params: request.params.arguments || {},
               reason: "No trip details provided"
             });
          } else {
          logAnalytics("tool_call_success", {
            responseTime,
            params: request.params.arguments || {},
            inferredQuery: inferredQuery.join(", "),
            userLocation,
            userLocale,
            device: deviceCategory,
          });
          }
        } catch {}

        // TEXT SUPPRESSION: Return empty content array to prevent ChatGPT from adding
        // any text after the widget. The widget provides all necessary UI.
        // See: content: [] means no text content, only the widget is shown.
        return {
          content: [],  // Empty array = no text after widget
          structuredContent: structured,
          _meta: metaForReturn,  // Contains openai/resultCanProduceWidget: true
        };
      } catch (error: any) {
        logAnalytics("tool_call_error", {
          error: error.message,
          stack: error.stack,
          responseTime: Date.now() - startTime,
          device: deviceCategory,
          userAgent: userAgentString,
        });
        throw error;
      }
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";
const subscribePath = "/api/subscribe";
const analyticsPath = "/analytics";
const trackEventPath = "/api/track";
const healthPath = "/health";

const domainVerificationPath = "/.well-known/openai-apps-challenge";
const domainVerificationToken =
  process.env.OPENAI_DOMAIN_VERIFICATION_TOKEN ??
  "X1C2u_pL7rpRTEqXIorF7SPz-yc1ucHWvuIoUEEYwQE";

const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD || "changeme123";

function checkAnalyticsAuth(req: IncomingMessage): boolean {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
  const [username, password] = credentials.split(":");

  return username === "admin" && password === ANALYTICS_PASSWORD;
}

function humanizeEventName(event: string): string {
  const eventMap: Record<string, string> = {
    tool_call_success: "Tool Call Success",
    tool_call_error: "Tool Call Error",
    parameter_parse_error: "Parameter Parse Error",
    widget_carousel_prev: "Carousel Previous",
    widget_carousel_next: "Carousel Next",
    widget_filter_age_change: "Filter: Age Change",
    widget_filter_state_change: "Filter: State Change",
    widget_filter_sort_change: "Filter: Sort Change",
    widget_filter_category_change: "Filter: Category Change",
    widget_user_feedback: "User Feedback",
    widget_test_event: "Test Event",
    widget_followup_click: "Follow-up Click",
    widget_crash: "Widget Crash",
  };
  return eventMap[event] || event;
}

function formatEventDetails(log: AnalyticsEvent): string {
  const excludeKeys = ["timestamp", "event"];
  const details: Record<string, any> = {};
  
  Object.keys(log).forEach((key) => {
    if (!excludeKeys.includes(key)) {
      details[key] = log[key];
    }
  });
  
  if (Object.keys(details).length === 0) {
    return "—";
  }
  
  return JSON.stringify(details, null, 0);
}

type AlertEntry = {
  id: string;
  level: "warning" | "critical";
  message: string;
};

function evaluateAlerts(logs: AnalyticsEvent[]): AlertEntry[] {
  const alerts: AlertEntry[] = [];
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  // 1. Tool Call Failures
  const toolErrors24h = logs.filter(
    (l) =>
      l.event === "tool_call_error" &&
      new Date(l.timestamp).getTime() >= dayAgo
  ).length;

  if (toolErrors24h > 5) {
    alerts.push({
      id: "tool-errors",
      level: "critical",
      message: `Tool failures in last 24h: ${toolErrors24h} (>5 threshold)`,
    });
  }

  // 2. Parameter Parsing Errors
  const parseErrorsWeek = logs.filter(
    (l) =>
      l.event === "parameter_parse_error" &&
      new Date(l.timestamp).getTime() >= weekAgo
  ).length;

  if (parseErrorsWeek > 3) {
    alerts.push({
      id: "parse-errors",
      level: "warning",
      message: `Parameter parse errors in last 7d: ${parseErrorsWeek} (>3 threshold)`,
    });
  }

  // 3. Empty Result Sets (or equivalent for calculator - e.g. missing inputs)
  const successCalls = logs.filter(
    (l) => l.event === "tool_call_success" && new Date(l.timestamp).getTime() >= weekAgo
  );
  const emptyResults = logs.filter(
    (l) => l.event === "tool_call_empty" && new Date(l.timestamp).getTime() >= weekAgo
  ).length;

  const totalCalls = successCalls.length + emptyResults;
  if (totalCalls > 0 && (emptyResults / totalCalls) > 0.2) {
    alerts.push({
      id: "empty-results",
      level: "warning",
      message: `Empty result rate ${((emptyResults / totalCalls) * 100).toFixed(1)}% (>20% threshold)`,
    });
  }

  // 4. Widget Load Failures (Crashes)
  const widgetCrashes = logs.filter(
    (l) => l.event === "widget_crash" && new Date(l.timestamp).getTime() >= dayAgo
  ).length;

  if (widgetCrashes > 0) {
    alerts.push({
      id: "widget-crash",
      level: "critical",
      message: `Widget crashes in last 24h: ${widgetCrashes} (Fix immediately)`,
    });
  }

  // 5. Buttondown Subscription Failures
  const recentSubs = logs.filter(
    (l) =>
      (l.event === "widget_notify_me_subscribe" ||
        l.event === "widget_notify_me_subscribe_error") &&
      new Date(l.timestamp).getTime() >= weekAgo
  );

  const subFailures = recentSubs.filter(
    (l) => l.event === "widget_notify_me_subscribe_error"
  ).length;

  const failureRate =
    recentSubs.length > 0 ? subFailures / recentSubs.length : 0;

  if (recentSubs.length >= 5 && failureRate > 0.1) {
    alerts.push({
      id: "buttondown-failures",
      level: "warning",
      message: `Buttondown failure rate ${(failureRate * 100).toFixed(
        1
      )}% over last 7d (${subFailures}/${recentSubs.length})`,
    });
  }

  return alerts;
}

function generateAnalyticsDashboard(logs: AnalyticsEvent[], alerts: AlertEntry[]): string {
  const errorLogs = logs.filter((l) => l.event.includes("error"));
  const successLogs = logs.filter((l) => l.event === "tool_call_success");
  const parseLogs = logs.filter((l) => l.event === "parameter_parse_error");
  const widgetEvents = logs.filter((l) => l.event.startsWith("widget_"));

  const avgResponseTime =
    successLogs.length > 0
      ? (successLogs.reduce((sum, l) => sum + (l.responseTime || 0), 0) /
          successLogs.length).toFixed(0)
      : "N/A";

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
      // Track trip type distribution
      if (log.params.trip_type) {
        const tt = log.params.trip_type;
        tripTypeDist[tt] = (tripTypeDist[tt] || 0) + 1;
      }
      // Track transport mode distribution
      if (log.params.departure_mode) {
        const mode = log.params.departure_mode;
        transportModeDist[mode] = (transportModeDist[mode] || 0) + 1;
      }
    }
  });
  
  const widgetInteractions: Record<string, number> = {};
  widgetEvents.forEach((log) => {
    const humanName = humanizeEventName(log.event);
    widgetInteractions[humanName] = (widgetInteractions[humanName] || 0) + 1;
  });
  
  // Transport mode distribution
  // (tripTypeDist already computed above)

  // Destinations (top 10)
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
  });

  // Trip Organizer Actions
  const actionCounts: Record<string, number> = {
    "Parse Trip": 0,
    "Add Leg": 0,
    "Save Trip": 0,
    "New Trip": 0,
    "Subscribe": 0,
    "Print": 0,
    "Feedback": 0
  };

  widgetEvents.forEach(log => {
      if (log.event === "widget_parse_trip") actionCounts["Parse Trip"]++;
      if (log.event === "widget_add_leg") actionCounts["Add Leg"]++;
      if (log.event === "widget_save_trip") actionCounts["Save Trip"]++;
      if (log.event === "widget_new_trip") actionCounts["New Trip"]++;
      if (log.event === "widget_notify_me_subscribe") actionCounts["Subscribe"]++;
      if (log.event === "widget_print") actionCounts["Print"]++;
      if (log.event === "widget_user_feedback") actionCounts["Feedback"]++;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trip Planner Analytics</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #1a1a1a; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .card h2 { font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 10px; }
    .card .value { font-size: 32px; font-weight: bold; color: #1a1a1a; }
    .card.error .value { color: #dc2626; }
    .card.success .value { color: #16a34a; }
    .card.warning .value { color: #ea580c; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { background: #f9fafb; font-weight: 600; color: #374151; font-size: 12px; text-transform: uppercase; }
    td { color: #1f2937; font-size: 14px; }
    tr:last-child td { border-bottom: none; }
    .error-row { background: #fef2f2; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .timestamp { color: #9ca3af; font-size: 12px; }
    td strong { color: #1f2937; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Trip Planner Analytics</h1>
    <p class="subtitle">Last 7 days • Auto-refresh every 60s</p>
    
    <div class="grid">
      <div class="card ${alerts.length ? "warning" : ""}">
        <h2>Alerts</h2>
        ${
          alerts.length
            ? `<ul style="padding-left:16px;margin:0;">${alerts
                .map(
                  (a) =>
                    `<li><strong>${a.level.toUpperCase()}</strong> — ${a.message}</li>`
                )
                .join("")}</ul>`
            : '<p style="color:#16a34a;">No active alerts</p>'
        }
      </div>
      <div class="card success">
        <h2>Total Calls</h2>
        <div class="value">${successLogs.length}</div>
      </div>
      <div class="card error">
        <h2>Errors</h2>
        <div class="value">${errorLogs.length}</div>
      </div>
      <div class="card warning">
        <h2>Parse Errors</h2>
        <div class="value">${parseLogs.length}</div>
      </div>
      <div class="card">
        <h2>Avg Response Time</h2>
        <div class="value">${avgResponseTime}<span style="font-size: 16px; color: #666;">ms</span></div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h2>Parameter Usage</h2>
      <table>
        <thead><tr><th>Parameter</th><th>Times Used</th><th>Usage %</th></tr></thead>
        <tbody>
          ${Object.entries(paramUsage)
            .sort((a, b) => b[1] - a[1])
            .map(
              ([param, count]) => `
            <tr>
              <td><code>${param}</code></td>
              <td>${count}</td>
              <td>${((count / successLogs.length) * 100).toFixed(1)}%</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="grid" style="margin-bottom: 20px;">
      <div class="card">
        <h2>Trip Type</h2>
        <table>
          <thead><tr><th>Type</th><th>Count</th></tr></thead>
          <tbody>
            ${Object.entries(tripTypeDist).length > 0 ? Object.entries(tripTypeDist)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(
                ([tt, count]) => `
              <tr>
                <td>${tt}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
       <div class="card">
        <h2>User Actions</h2>
        <table>
          <thead><tr><th>Action</th><th>Count</th></tr></thead>
          <tbody>
            ${Object.entries(actionCounts)
              .sort((a, b) => b[1] - a[1])
              .map(
                ([action, count]) => `
              <tr>
                <td>${action}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>


    <div class="card" style="margin-bottom: 20px;">
      <h2>Widget Interactions</h2>
      <table>
        <thead><tr><th>Action</th><th>Count</th></tr></thead>
        <tbody>
          ${Object.entries(widgetInteractions).length > 0 ? Object.entries(widgetInteractions)
            .sort((a, b) => b[1] - a[1])
            .map(
              ([action, count]) => `
            <tr>
              <td>${action}</td>
              <td>${count}</td>
            </tr>
          `
            )
            .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="grid" style="margin-bottom: 20px;">
      <div class="card">
        <h2>Transport Mode</h2>
        <table>
          <thead><tr><th>Mode</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(transportModeDist).length > 0 ? Object.entries(transportModeDist)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(
                ([mode, count]) => `
              <tr>
                <td>${mode}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="card">
        <h2>Top Destinations</h2>
        <table>
          <thead><tr><th>Destination</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(destinationDist).length > 0 ? Object.entries(destinationDist)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 10)
              .map(
                ([dest, count]) => `
              <tr>
                <td>${dest}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <div class="card">
        <h2>Top Departure Cities</h2>
        <table>
          <thead><tr><th>City</th><th>Users</th></tr></thead>
          <tbody>
            ${Object.entries(departureCityDist).length > 0 ? Object.entries(departureCityDist)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 10)
              .map(
                ([city, count]) => `
              <tr>
                <td>${city}</td>
                <td>${count}</td>
              </tr>
            `
              )
              .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No data yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h2>User Queries (Inferred from Tool Calls)</h2>
      <table>
        <thead><tr><th>Date</th><th>Query</th><th>Location</th><th>Locale</th></tr></thead>
        <tbody>
          ${successLogs.length > 0 ? successLogs
            .slice(0, 20)
            .map(
              (log) => `
            <tr>
              <td class="timestamp" style="white-space: nowrap;">${new Date(log.timestamp).toLocaleString()}</td>
              <td style="max-width: 400px;">${log.inferredQuery || "general search"}</td>
              <td style="font-size: 12px; color: #6b7280;">${log.userLocation ? `${log.userLocation.city || ''}, ${log.userLocation.region || ''}, ${log.userLocation.country || ''}`.replace(/^, |, $/g, '') : '—'}</td>
              <td style="font-size: 12px; color: #6b7280;">${log.userLocale || '—'}</td>
            </tr>
          `
            )
            .join("") : '<tr><td colspan="4" style="text-align: center; color: #9ca3af;">No queries yet</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card" style="margin-bottom: 20px;">
      <h2>User Feedback</h2>
      <table>
        <thead><tr><th>Date</th><th>Feedback</th></tr></thead>
        <tbody>
          ${logs.filter(l => l.event === "widget_user_feedback").length > 0 ? logs
            .filter(l => l.event === "widget_user_feedback")
            .slice(0, 20)
            .map(
              (log) => `
            <tr>
              <td class="timestamp" style="white-space: nowrap;">${new Date(log.timestamp).toLocaleString()}</td>
              <td style="max-width: 600px;">${log.feedback || "—"}</td>
            </tr>
          `
            )
            .join("") : '<tr><td colspan="2" style="text-align: center; color: #9ca3af;">No feedback yet</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Recent Events (Last 50)</h2>
      <table>
        <thead><tr><th>Time</th><th>Event</th><th>Details</th></tr></thead>
        <tbody>
          ${logs
            .slice(0, 50)
            .map(
              (log) => `
            <tr class="${log.event.includes("error") ? "error-row" : ""}">
              <td class="timestamp">${new Date(log.timestamp).toLocaleString()}</td>
              <td><strong>${humanizeEventName(log.event)}</strong></td>
              <td style="font-size: 12px; max-width: 600px; overflow: hidden; text-overflow: ellipsis;">${formatEventDetails(log)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>
  <script>setTimeout(() => location.reload(), 60000);</script>
</body>
</html>`;
}

async function handleAnalytics(req: IncomingMessage, res: ServerResponse) {
  if (!checkAnalyticsAuth(req)) {
    res.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="Analytics Dashboard"',
      "Content-Type": "text/plain",
    });
    res.end("Authentication required");
    return;
  }

  try {
    const logs = getRecentLogs(7);
    const alerts = evaluateAlerts(logs);
    alerts.forEach((alert) =>
      console.warn("[ALERT]", alert.id, alert.message)
    );
    const html = generateAnalyticsDashboard(logs, alerts);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
  } catch (error) {
    console.error("Analytics error:", error);
    res.writeHead(500).end("Failed to generate analytics");
  }
}

async function handleTrackEvent(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    const { event, data } = JSON.parse(body);

    if (!event) {
      res.writeHead(400).end(JSON.stringify({ error: "Missing event name" }));
      return;
    }

    logAnalytics(`widget_${event}`, data || {});

    res.writeHead(200).end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error("Track event error:", error);
    res.writeHead(500).end(JSON.stringify({ error: "Failed to track event" }));
  }
}

// Buttondown API integration
async function subscribeToButtondown(email: string, topicId: string, topicName: string) {
  const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
  
  console.log("[Buttondown] subscribeToButtondown called", { email, topicId, topicName });
  console.log("[Buttondown] API key present:", !!BUTTONDOWN_API_KEY, "length:", BUTTONDOWN_API_KEY?.length ?? 0);

  if (!BUTTONDOWN_API_KEY) {
    throw new Error("BUTTONDOWN_API_KEY not set in environment variables");
  }

  const metadata: Record<string, any> = {
    topicName,
    source: "trip-planner",
    subscribedAt: new Date().toISOString(),
  };

  const requestBody = {
    email_address: email,
    tags: [topicId],
    metadata,
  };

  console.log("[Buttondown] Sending request body:", JSON.stringify(requestBody));

  const response = await fetch("https://api.buttondown.email/v1/subscribers", {
    method: "POST",
    headers: {
      "Authorization": `Token ${BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  console.log("[Buttondown] Response status:", response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "Failed to subscribe";
    
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.detail) {
        errorMessage = errorData.detail;
      } else if (errorData.code) {
        errorMessage = `Error: ${errorData.code}`;
      }
    } catch {
      errorMessage = errorText;
    }
    
    throw new Error(errorMessage);
  }

  return await response.json();
}

// Update existing subscriber with new topic
async function updateButtondownSubscriber(email: string, topicId: string, topicName: string) {
  const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY;
  
  if (!BUTTONDOWN_API_KEY) {
    throw new Error("BUTTONDOWN_API_KEY not set in environment variables");
  }

  // First, get the subscriber ID
  const searchResponse = await fetch(`https://api.buttondown.email/v1/subscribers?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: {
      "Authorization": `Token ${BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!searchResponse.ok) {
    throw new Error("Failed to find subscriber");
  }

  const subscribers = await searchResponse.json();
  if (!subscribers.results || subscribers.results.length === 0) {
    throw new Error("Subscriber not found");
  }

  const subscriber = subscribers.results[0];
  const subscriberId = subscriber.id;

  // Update the subscriber with new tag and metadata
  const existingTags = subscriber.tags || [];
  const existingMetadata = subscriber.metadata || {};

  // Add new topic to tags if not already there
  const updatedTags = existingTags.includes(topicId) ? existingTags : [...existingTags, topicId];

  // Add new topic to metadata (Buttondown requires string values)
  const topicKey = `topic_${topicId}`;
  const topicData = JSON.stringify({
    name: topicName,
    subscribedAt: new Date().toISOString(),
  });
  
  const updatedMetadata = {
    ...existingMetadata,
    [topicKey]: topicData,
    source: "trip-planner",
  };

  const updateRequestBody = {
    tags: updatedTags,
    metadata: updatedMetadata,
  };

  console.log("[Buttondown] updateButtondownSubscriber called", { email, topicId, topicName, subscriberId });
  console.log("[Buttondown] Sending update request body:", JSON.stringify(updateRequestBody));

  const updateResponse = await fetch(`https://api.buttondown.email/v1/subscribers/${subscriberId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Token ${BUTTONDOWN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateRequestBody),
  });

  console.log("[Buttondown] Update response status:", updateResponse.status, updateResponse.statusText);

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to update subscriber: ${errorText}`);
  }

  return await updateResponse.json();
}

async function handleSubscribe(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    const parsed = JSON.parse(body);
    const email = parsed.email;
    const topicId = parsed.topicId || "trip-planner";
    const topicName = parsed.topicName || "Trip Planner Updates";
    if (!email || !email.includes("@")) {
      res.writeHead(400).end(JSON.stringify({ error: "Invalid email address" }));
      return;
    }

    const BUTTONDOWN_API_KEY_PRESENT = !!process.env.BUTTONDOWN_API_KEY;
    if (!BUTTONDOWN_API_KEY_PRESENT) {
      res.writeHead(500).end(JSON.stringify({ error: "Server misconfigured: BUTTONDOWN_API_KEY missing" }));
      return;
    }

    try {
      await subscribeToButtondown(email, topicId, topicName);
      res.writeHead(200).end(JSON.stringify({ 
        success: true, 
        message: "Successfully subscribed! You'll receive trip planning tips and updates." 
      }));
    } catch (subscribeError: any) {
      const rawMessage = String(subscribeError?.message ?? "").trim();
      const msg = rawMessage.toLowerCase();
      const already = msg.includes('already subscribed') || msg.includes('already exists') || msg.includes('already on your list') || msg.includes('subscriber already exists') || msg.includes('already');

      if (already) {
        console.log("Subscriber already on list, attempting update", { email, topicId, message: rawMessage });
        try {
          await updateButtondownSubscriber(email, topicId, topicName);
          res.writeHead(200).end(JSON.stringify({ 
            success: true, 
            message: "You're now subscribed to this topic!" 
          }));
        } catch (updateError: any) {
          console.warn("Update subscriber failed, returning graceful success", {
            email,
            topicId,
            error: updateError?.message,
          });
          logAnalytics("widget_notify_me_subscribe_error", {
            stage: "update",
            email,
            error: updateError?.message,
          });
          res.writeHead(200).end(JSON.stringify({
            success: true,
            message: "You're already subscribed! We'll keep you posted.",
          }));
        }
        return;
      }

      logAnalytics("widget_notify_me_subscribe_error", {
        stage: "subscribe",
        email,
        error: rawMessage || "unknown_error",
      });
      throw subscribeError;
    }
  } catch (error: any) {
    console.error("Subscribe error:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    logAnalytics("widget_notify_me_subscribe_error", {
      stage: "handler",
      email: undefined,
      error: error.message || "unknown_error",
    });
    res.writeHead(500).end(JSON.stringify({ 
      error: error.message || "Failed to subscribe. Please try again." 
    }));
  }
}

// AI-powered trip parsing using OpenAI
async function handleParseTripAI(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  
  if (req.method !== "POST") {
    res.writeHead(405).end("Method not allowed");
    return;
  }

  try {
    const body = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", chunk => data += chunk);
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const { text } = JSON.parse(body);
    
    if (!text || typeof text !== "string") {
      res.writeHead(400).end(JSON.stringify({ error: "Missing 'text' field" }));
      return;
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      // Fallback to basic parsing if no API key
      console.log("[Parse Trip] No OPENAI_API_KEY, using fallback parsing");
      const legs = fallbackParseTripText(text);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ legs, source: "fallback" }));
      return;
    }

    const systemPrompt = `You are a travel assistant that extracts trip information from natural language descriptions.

Extract all trip components (flights, hotels, transportation) from the user's text and return them as a JSON array.

Each item should have:
- type: "flight" | "hotel" | "car" | "train" | "bus" | "ferry"
- status: always "pending"
- title: descriptive title (e.g., "Flight: Boston → Medellin")
- date: ISO date string (YYYY-MM-DD) if mentioned, otherwise empty string
- endDate: for hotels, the checkout date if mentioned
- from: departure city/location (for transport)
- to: arrival city/location (for transport)
- location: for hotels, the city
- time: departure time if mentioned (HH:MM format)

Rules:
1. Only extract what the user explicitly mentions - do NOT infer or auto-add hotels
2. Think like a traveler - for each flight:
   - You need transport TO the departure airport before the flight
   - You need transport FROM the arrival airport after landing (to get to hotel or home)
3. Do NOT duplicate transports - each leg of the journey needs exactly one transport to the airport and one from the airport
4. Parse dates like "June 11th, 2026" to "2026-06-11"
5. If no year mentioned, assume current year or next year if month has passed

Return ONLY valid JSON array, no explanation.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Parse Trip] OpenAI API error:", response.status, errorText);
      // Fallback on API error
      const legs = fallbackParseTripText(text);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ legs, source: "fallback" }));
      return;
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let legs;
    try {
      // Handle potential markdown code blocks
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      legs = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[Parse Trip] Failed to parse AI response:", content);
      legs = fallbackParseTripText(text);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ legs, source: "fallback" }));
      return;
    }

    console.log("[Parse Trip] AI parsed legs:", legs.length);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ legs, source: "ai" }));

  } catch (error: any) {
    console.error("[Parse Trip] Error:", error);
    res.writeHead(500).end(JSON.stringify({ error: error.message || "Failed to parse trip" }));
  }
}

// Fallback parsing when OpenAI is not available
function fallbackParseTripText(text: string): any[] {
  const legs: any[] = [];
  const lower = text.toLowerCase();
  
  // Simple pattern matching
  const fromToMatch = lower.match(/from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s|$|,|\.)/i);
  const toFromMatch = lower.match(/to\s+([a-z\s]+?)\s+from\s+([a-z\s]+?)(?:\s|$|,|\.)/i);
  
  // Check for return/round trip
  const isRoundTrip = /return|round\s*trip|coming back|fly back|back to/i.test(lower);
  
  let fromCity = "";
  let toCity = "";
  
  if (fromToMatch) {
    fromCity = fromToMatch[1].trim();
    toCity = fromToMatch[2].trim();
  } else if (toFromMatch) {
    toCity = toFromMatch[1].trim();
    fromCity = toFromMatch[2].trim();
  }
  
  if (fromCity && toCity) {
    // Add outbound flight
    legs.push({
      type: "flight",
      status: "pending",
      title: `Flight: ${fromCity} → ${toCity}`,
      from: fromCity,
      to: toCity,
      date: ""
    });
    
    // Outbound transport: to departure airport
    legs.push({
      type: "car",
      status: "pending",
      title: `Transport to ${fromCity} Airport`,
      to: `${fromCity} Airport`,
      date: ""
    });
    
    // Outbound transport: from arrival airport to hotel
    legs.push({
      type: "car",
      status: "pending",
      title: `Transport from ${toCity} Airport`,
      from: `${toCity} Airport`,
      date: ""
    });
    
    // If round trip, add return flight and transports
    if (isRoundTrip) {
      // Return flight
      legs.push({
        type: "flight",
        status: "pending",
        title: `Flight: ${toCity} → ${fromCity}`,
        from: toCity,
        to: fromCity,
        date: ""
      });
      
      // Return transport: from hotel to departure airport
      legs.push({
        type: "car",
        status: "pending",
        title: `Transport to ${toCity} Airport`,
        to: `${toCity} Airport`,
        date: ""
      });
      
      // Return transport: from arrival airport to home
      legs.push({
        type: "car",
        status: "pending",
        title: `Transport from ${fromCity} Airport`,
        from: `${fromCity} Airport`,
        date: ""
      });
    }
  }
  
  return legs;
}

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createTripPlannerServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === healthPath) {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("OK");
      return;
    }

    if (req.method === "GET" && url.pathname === domainVerificationPath) {
      res.writeHead(200, { "Content-Type": "text/plain" }).end(
        domainVerificationToken
      );
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    if (url.pathname === subscribePath) {
      await handleSubscribe(req, res);
      return;
    }

    if (url.pathname === analyticsPath) {
      await handleAnalytics(req, res);
      return;
    }

    if (url.pathname === trackEventPath) {
      await handleTrackEvent(req, res);
      return;
    }

    // AI-powered trip parsing endpoint
    if (req.method === "POST" && url.pathname === "/api/parse-trip") {
      await handleParseTripAI(req, res);
      return;
    }

    if (req.method === "OPTIONS" && url.pathname === "/api/parse-trip") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    // Serve alias for legacy loader path -> our main widget HTML
    if (req.method === "GET" && url.pathname === "/assets/trip-planner.html") {
      const mainAssetPath = path.join(ASSETS_DIR, "trip-planner.html");
      console.log(`[Debug Legacy] Request: ${url.pathname}, Main Path: ${mainAssetPath}, Exists: ${fs.existsSync(mainAssetPath)}`);
      if (fs.existsSync(mainAssetPath) && fs.statSync(mainAssetPath).isFile()) {
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(mainAssetPath).pipe(res);
        return;
      }
    }

    // Serve static assets from /assets directory
    if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
      const assetPath = path.join(ASSETS_DIR, url.pathname.slice(8));
      if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
        const ext = path.extname(assetPath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
          ".js": "application/javascript",
          ".css": "text/css",
          ".html": "text/html",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".svg": "image/svg+xml"
        };
        const contentType = contentTypeMap[ext] || "application/octet-stream";
        res.writeHead(200, { 
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        });

        fs.createReadStream(assetPath).pipe(res);
        return;
      }
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

function startMonitoring() {
  // Check alerts every hour
  setInterval(() => {
    try {
      const logs = getRecentLogs(7);
      const alerts = evaluateAlerts(logs);
      
      if (alerts.length > 0) {
        console.log("\n=== 🚨 ACTIVE ALERTS 🚨 ===");
        alerts.forEach(alert => {
          console.log(`[ALERT] [${alert.level.toUpperCase()}] ${alert.message}`);
        });
        console.log("===========================\n");
      }
    } catch (e) {
      console.error("Monitoring check failed:", e);
    }
  }, 60 * 60 * 1000); // 1 hour
}

httpServer.listen(port, () => {
  startMonitoring();
  console.log(`Trip Planner MCP server listening on http://localhost:${port}`);
  console.log(`  SSE stream: GET http://localhost:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});
