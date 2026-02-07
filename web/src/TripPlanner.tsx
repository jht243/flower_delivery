import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import {
  Plane, Hotel, Car, Train, Bus, Ship, MapPin, Calendar, Clock, 
  CheckCircle2, Circle, AlertCircle, Plus, X, ChevronDown, ChevronUp,
  Edit2, Edit3, Trash2, Save, RotateCcw, Sparkles, ArrowRight, Loader2, Check, FileText, Users, Home,
  Printer, Heart, Mail, MessageSquare, Shield, ClipboardList
} from "lucide-react";

// Add spinner animation and hide scrollbar
const spinnerStyle = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.btn-press {
  transition: transform 0.1s ease, opacity 0.2s;
}
.btn-press:active {
  transform: scale(0.95);
}
.btn-press:hover {
  opacity: 0.7;
}
@media print {
  body {
    background-color: white;
  }
  .no-print {
    display: none !important;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = spinnerStyle;
  document.head.appendChild(styleEl);
}

const COLORS = {
  primary: "#2D6A4F",
  primaryDark: "#1B4332",
  bg: "#F5F0E8",
  card: "#FFFFFF",
  textMain: "#1A1A1A",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#DDD8D0",
  borderLight: "#EBE6DE",
  inputBg: "#F5F0E8",
  accentLight: "#E2EDE6",
  booked: "#2D6A4F",
  bookedBg: "#D8E8DF",
  pending: "#C4953A",
  pendingBg: "#F5EDD8",
  urgent: "#C0392B",
  urgentBg: "#F5DEDA",
  flight: "#2D6A4F",
  flightBg: "#E2EDE6",
  hotel: "#6B705C",
  hotelBg: "#ECEAE2",
  transport: "#A68A64",
  transportBg: "#F0E8D8",
};

type BookingStatus = "booked" | "pending" | "urgent";
type LegType = "flight" | "hotel" | "car" | "train" | "bus" | "ferry" | "other";

interface TripLeg {
  id: string;
  type: LegType;
  status: BookingStatus;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  endDate?: string;
  from?: string;
  to?: string;
  location?: string;
  confirmationNumber?: string;
  notes?: string;
  flightNumber?: string;
  airline?: string;
  hotelName?: string;
  rentalCompany?: string;
  passengerTickets?: { passenger: number; confirmationNumber?: string; seatNumber?: string; ticketNumber?: string; booked: boolean }[];
  cost?: number;
  standalone?: boolean;
}

type TripType = "one_way" | "round_trip" | "multi_city";

type TransportMode = "plane" | "car" | "rail" | "bus" | "other";

interface MultiCityLeg {
  id: string;
  from: string;
  to: string;
  date: string;
  mode: TransportMode;
}

interface Trip {
  id: string;
  name: string;
  tripType: TripType;
  legs: TripLeg[];
  travelers: number;
  departureDate?: string;
  returnDate?: string;
  departureMode?: TransportMode;
  returnMode?: TransportMode;
  multiCityLegs?: MultiCityLeg[];
  createdAt: number;
  updatedAt: number;
}

interface MissingInfo {
  id: string;
  type: "trip_type" | "departure_date" | "return_date" | "travelers" | "flight_number" | "hotel_name" | "confirmation";
  label: string;
  icon: React.ReactNode;
  legId?: string;
  priority: number;
  city?: string;
  startDate?: string;
  endDate?: string;
}

const STORAGE_KEY = "TRIP_PLANNER_DATA";
const TRIPS_LIST_KEY = "TRIP_PLANNER_TRIPS_LIST";
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper to load all saved trips
const loadSavedTrips = (): Trip[] => {
  try {
    const data = localStorage.getItem(TRIPS_LIST_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
};

// Helper to save trips list
const saveTripsToStorage = (trips: Trip[]) => {
  try {
    localStorage.setItem(TRIPS_LIST_KEY, JSON.stringify(trips));
  } catch {}
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
};

// Helper functions for transport mode labels
const getModeLabel = (mode: TransportMode): string => {
  switch (mode) {
    case "plane": return "Flight";
    case "car": return "Drive";
    case "rail": return "Train";
    case "bus": return "Bus";
    case "other": return "Cruise";
  }
};

const getModeLabelPlural = (mode: TransportMode): string => {
  switch (mode) {
    case "plane": return "Flights";
    case "car": return "Drives";
    case "rail": return "Trains";
    case "bus": return "Buses";
    case "other": return "Cruises";
  }
};

const getModeTerminal = (mode: TransportMode): string => {
  switch (mode) {
    case "plane": return "Airport";
    case "car": return "Pickup";
    case "rail": return "Station";
    case "bus": return "Terminal";
    case "other": return "Port";
  }
};

const getModeConfirmationLabel = (mode: TransportMode): string => {
  switch (mode) {
    case "plane": return "flight #";
    case "car": return "rental confirmation";
    case "rail": return "train confirmation";
    case "bus": return "bus confirmation";
    case "other": return "cruise confirmation";
  }
};

const getModeIcon = (mode: TransportMode, size: number = 20) => {
  switch (mode) {
    case "plane": return <Plane size={size} />;
    case "car": return <Car size={size} />;
    case "rail": return <Train size={size} />;
    case "bus": return <Bus size={size} />;
    case "other": return <Ship size={size} />;
  }
};

const getLegIcon = (type: LegType, size: number = 20) => {
  switch (type) {
    case "flight": return <Plane size={size} />;
    case "hotel": return <Hotel size={size} />;
    case "car": return <Car size={size} />;
    case "train": return <Train size={size} />;
    case "bus": return <Bus size={size} />;
    case "ferry": return <Ship size={size} />;
    default: return <MapPin size={size} />;
  }
};

const getLegColor = (type: LegType) => {
  switch (type) {
    case "flight": return { main: COLORS.flight, bg: COLORS.flightBg };
    case "hotel": return { main: COLORS.hotel, bg: COLORS.hotelBg };
    default: return { main: COLORS.transport, bg: COLORS.transportBg };
  }
};

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case "booked": return { main: COLORS.booked, bg: COLORS.bookedBg };
    case "pending": return { main: COLORS.pending, bg: COLORS.pendingBg };
    case "urgent": return { main: COLORS.urgent, bg: COLORS.urgentBg };
  }
};

const parseTripDescription = (text: string): Partial<TripLeg>[] => {
  const legs: Partial<TripLeg>[] = [];
  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
    jan: "01", feb: "02", mar: "03", apr: "04", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
  };
  
  const extractDate = (t: string): string | undefined => {
    const match = t.match(/(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/i);
    if (match) {
      const month = months[match[1].toLowerCase()];
      if (month) {
        const day = match[2].padStart(2, "0");
        const year = match[3] || new Date().getFullYear().toString();
        return `${year}-${month}-${day}`;
      }
    }
    return undefined;
  };

  // Extract all dates from text for trip duration calculation
  const allDates: string[] = [];
  const dateRegex = /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/gi;
  let dateMatch;
  while ((dateMatch = dateRegex.exec(text)) !== null) {
    const month = months[dateMatch[1].toLowerCase()];
    if (month) {
      const day = dateMatch[2].padStart(2, "0");
      const year = dateMatch[3] || new Date().getFullYear().toString();
      allDates.push(`${year}-${month}-${day}`);
    }
  }

  // Try multiple patterns for flight detection
  let fromCity = "";
  let toCity = "";
  let outboundDate = allDates[0] || "";
  let returnDate = allDates[1] || "";
  
  // Pattern 1: "flying from X to Y" or "fly from X to Y"
  const pattern1 = text.match(/(?:fly(?:ing)?|flight)\s+from\s+([A-Za-z][A-Za-z\s]*?)\s+to\s+([A-Za-z][A-Za-z\s]*?)(?=\s+(?:on|and|then|,|\.|$)|\s*$)/i);
  
  // Pattern 2: "flying to Y from X" or "fly to Y from X"
  const pattern2 = text.match(/(?:fly(?:ing)?|flight)\s+to\s+([A-Za-z][A-Za-z\s]*?)\s+from\s+([A-Za-z][A-Za-z\s]*?)(?=\s+(?:on|and|then|,|\.|$)|\s*$)/i);
  
  // Pattern 3: "going from X to Y" or "traveling from X to Y"
  const pattern3 = text.match(/(?:going|traveling|travel)\s+(?:from\s+)?([A-Za-z][A-Za-z\s]*?)\s+to\s+([A-Za-z][A-Za-z\s]*?)(?=\s+(?:on|and|then|,|\.|$)|\s*$)/i);
  
  // Pattern 4: Simple "from X to Y"
  const pattern4 = text.match(/from\s+([A-Za-z][A-Za-z\s]*?)\s+to\s+([A-Za-z][A-Za-z\s]*?)(?=\s+(?:on|and|then|,|\.|$)|\s*$)/i);
  
  if (pattern1) {
    fromCity = pattern1[1].trim();
    toCity = pattern1[2].trim();
  } else if (pattern2) {
    // Note: pattern2 captures "to Y from X" so we swap
    toCity = pattern2[1].trim();
    fromCity = pattern2[2].trim();
  } else if (pattern3) {
    fromCity = pattern3[1].trim();
    toCity = pattern3[2].trim();
  } else if (pattern4) {
    fromCity = pattern4[1].trim();
    toCity = pattern4[2].trim();
  }
  
  if (fromCity && toCity) {
    // Create outbound flight
    legs.push({ 
      type: "flight", 
      status: "pending", 
      title: `Flight: ${fromCity} → ${toCity}`, 
      from: fromCity, 
      to: toCity, 
      date: outboundDate 
    });
  }

  // Check for return flight
  const returnMatch = text.match(/return(?:ing)?\s+(?:to\s+)?([A-Za-z][A-Za-z\s]*?)(?=\s+(?:on|and|then|,|\.|$)|\s*$)/i);
  if (returnMatch && fromCity) {
    const returnTo = returnMatch[1].trim();
    legs.push({ 
      type: "flight", 
      status: "pending", 
      title: `Flight: ${toCity} → ${returnTo}`, 
      from: toCity, 
      to: returnTo, 
      date: returnDate 
    });
  }

  // Add hotel if we have a destination (even with just one flight)
  if (toCity) {
    legs.push({ 
      type: "hotel", 
      status: "pending", 
      title: `Hotel in ${toCity}`, 
      location: toCity, 
      date: outboundDate,
      endDate: returnDate || outboundDate
    });
  }

  // Add transport legs
  if (fromCity) {
    legs.push({ 
      type: "car", 
      status: "pending", 
      title: `Transport to ${fromCity} Airport`, 
      to: `${fromCity} Airport`, 
      date: outboundDate 
    });
  }
  
  if (toCity) {
    legs.push({ 
      type: "car", 
      status: "pending", 
      title: `Transport from ${toCity} Airport`, 
      from: `${toCity} Airport`, 
      date: outboundDate 
    });
  }
  
  // Add return transport if there's a return flight
  if (returnMatch && toCity && fromCity) {
    legs.push({ 
      type: "car", 
      status: "pending", 
      title: `Transport to ${toCity} Airport`, 
      to: `${toCity} Airport`, 
      date: returnDate 
    });
    legs.push({ 
      type: "car", 
      status: "pending", 
      title: `Transport from ${fromCity} Airport`, 
      from: `${fromCity} Airport`, 
      date: returnDate 
    });
  }

  return legs;
};

// Transport mode selector component
const TransportModeSelector = ({ 
  value, 
  onChange 
}: { 
  value: TransportMode; 
  onChange: (mode: TransportMode) => void;
}) => {
  const modes: { value: TransportMode; icon: React.ReactNode; label: string }[] = [
    { value: "plane", icon: <Plane size={18} />, label: "Plane" },
    { value: "car", icon: <Car size={18} />, label: "Car" },
    { value: "rail", icon: <Train size={18} />, label: "Rail" },
    { value: "bus", icon: <Bus size={18} />, label: "Bus" },
    { value: "other", icon: <Ship size={18} />, label: "Other" }
  ];
  
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
      {modes.map(m => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          title={m.label}
          style={{
            flex: 1,
            padding: "8px 4px",
            borderRadius: 8,
            border: value === m.value ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
            backgroundColor: value === m.value ? COLORS.accentLight : "white",
            color: value === m.value ? COLORS.primary : COLORS.textSecondary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
};

// Small status icon (not a button)
const StatusIcon = ({ status }: { status: BookingStatus }) => {
  const colors = getStatusColor(status);
  const icons = { 
    booked: <CheckCircle2 size={18} />, 
    pending: <Circle size={18} />, 
    urgent: <AlertCircle size={18} /> 
  };
  return (
    <div style={{ color: colors.main }} title={status}>
      {icons[status]}
    </div>
  );
};

// "Add details" CTA button
const AddDetailsButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 4, 
        padding: "6px 12px", 
        borderRadius: 8, 
        backgroundColor: COLORS.primary, 
        color: "white", 
        border: "none", 
        fontSize: 12, 
        fontWeight: 600, 
        cursor: "pointer" 
      }}
    >
      <Plus size={14} /> Add details
    </button>
  );
};

// Custom Date/Time Picker with Done button
const PickerPopover = ({ type, value, onChange, onClick, style, min, max }: { type: "date" | "time"; value: string; onChange: (val: string) => void; onClick?: (e: React.MouseEvent) => void; style?: React.CSSProperties; min?: string; max?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setTempValue(value); }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setIsOpen(false); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const formatDisplay = () => {
    if (type === "date") {
      if (!value) return "Select date";
      const d = new Date(value + "T00:00:00");
      return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    }
    if (!value) return "Select time";
    const [h, m] = value.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const iconColor = value ? COLORS.textMuted : COLORS.primary;
  const icon = type === "date" ? <Calendar size={14} style={{ color: iconColor }} /> : <Clock size={14} style={{ color: iconColor }} />;

  return (
    <div ref={ref} style={{ position: "relative", ...(style || {}) }}>
      <button
        type="button"
        onClick={e => { onClick?.(e); e.stopPropagation(); setTempValue(value); setIsOpen(!isOpen); }}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${value ? COLORS.border : COLORS.primary + "60"}`, backgroundColor: value ? "white" : COLORS.accentLight, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, color: value ? COLORS.textMain : COLORS.primary, fontWeight: value ? 400 : 500, textAlign: "left" }}
      >
        <span>{formatDisplay()}</span>
        {icon}
      </button>
      {isOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 220, zIndex: 1000, backgroundColor: "white", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", border: `1px solid ${COLORS.border}`, overflow: "hidden" }}
        >
          <div style={{ padding: "12px 12px 8px" }}>
            <input
              type={type}
              value={tempValue}
              min={min}
              max={max}
              onChange={e => setTempValue(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              autoFocus
            />
          </div>
          <div style={{ padding: "4px 12px 10px", display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setIsOpen(false); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(tempValue); setIsOpen(false); }}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", backgroundColor: COLORS.primary, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TripLegCard = ({ leg, onUpdate, onDelete, isExpanded, onToggleExpand, tripDepartureDate, tripReturnDate, travelers = 1 }: { leg: TripLeg; onUpdate: (u: Partial<TripLeg>) => void; onDelete: () => void; isExpanded: boolean; onToggleExpand: () => void; tripDepartureDate?: string; tripReturnDate?: string; travelers?: number }) => {
  // For hotels, prefill dates with trip dates if not already set
  const initialEditData = leg.type === "hotel" ? {
    ...leg,
    date: leg.date || tripDepartureDate || "",
    endDate: leg.endDate || tripReturnDate || ""
  } : leg;
  const [editData, setEditData] = useState(initialEditData);
  const legColors = getLegColor(leg.type);

  const cycleStatus = () => {
    const order: BookingStatus[] = ["pending", "booked", "urgent"];
    const next = order[(order.indexOf(leg.status) + 1) % order.length];
    onUpdate({ status: next });
  };

  return (
    <div style={{ backgroundColor: COLORS.card, borderRadius: 16, border: `1px solid ${leg.status === "booked" ? COLORS.booked : COLORS.border}`, borderLeft: `4px solid ${legColors.main}`, marginBottom: 12, overflow: "hidden", maxWidth: "100%", boxSizing: "border-box" }}>
      <div onClick={onToggleExpand} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", overflow: "hidden", maxWidth: "100%" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: legColors.bg, color: legColors.main, display: "flex", alignItems: "center", justifyContent: "center" }}>{getLegIcon(leg.type, 22)}</div>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.textMain, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{leg.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {leg.date && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: COLORS.textSecondary }}><Calendar size={14} />{formatDate(leg.date)}</span>}
            {leg.time && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: COLORS.textSecondary }}><Clock size={14} />{(() => { const [h, m] = leg.time.split(":").map(Number); const ampm = h >= 12 ? "PM" : "AM"; const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return `${h12}:${String(m).padStart(2, "0")} ${ampm}`; })()}{leg.endTime ? (() => { const [h, m] = leg.endTime.split(":").map(Number); const ampm = h >= 12 ? "PM" : "AM"; const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h; return ` – ${h12}:${String(m).padStart(2, "0")} ${ampm}`; })() : ""}</span>}
            {leg.location && !["hotel", "flight", "car", "train", "bus", "ferry"].includes(leg.type) && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: COLORS.textSecondary }}><MapPin size={14} />{leg.location}</span>}
            {leg.flightNumber && <span style={{ fontSize: 13, color: legColors.main, fontWeight: 600 }}>{leg.flightNumber}</span>}
          </div>
        </div>
        <StatusIcon status={leg.status} />
        <div style={{ color: COLORS.textSecondary }}>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
      </div>
      {isExpanded && (() => {
        const hasPrimaryRoute = leg.from && leg.to;
        const showPerPassenger = travelers > 1 && ["flight", "train", "bus", "ferry"].includes(leg.type);
        const lblStyle = { display: "block" as const, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4 };
        const inpStyle = { width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, boxSizing: "border-box" as const };
        const fullStyle = { ...inpStyle, gridColumn: "1 / -1" };
        const stop = (e: React.MouseEvent) => e.stopPropagation();
        return (
          <div style={{ padding: "0 20px 16px", borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 16 }}>
            {/* Inline edit fields — type-specific */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

              {/* ── Hotel ── */}
              {leg.type === "hotel" && (
                <>
                  <input value={editData.title} onClick={stop} onChange={e => setEditData({ ...editData, title: e.target.value })} placeholder="Hotel Name" style={fullStyle} />
                  <div>
                    <label style={lblStyle}>Check-in Date</label>
                    <PickerPopover type="date" value={editData.date} onClick={stop} onChange={val => setEditData({ ...editData, date: val })} />
                  </div>
                  <div>
                    <label style={lblStyle}>Check-out Date</label>
                    <PickerPopover type="date" value={editData.endDate || ""} onClick={stop} onChange={val => setEditData({ ...editData, endDate: val })} />
                  </div>
                  <input value={editData.location || ""} onClick={stop} onChange={e => setEditData({ ...editData, location: e.target.value })} placeholder="Address" style={fullStyle} />
                  <input value={editData.confirmationNumber || ""} onClick={stop} onChange={e => setEditData({ ...editData, confirmationNumber: e.target.value })} placeholder="Confirmation #" style={fullStyle} />
                  <div>
                    <label style={lblStyle}>Cost</label>
                    <input type="number" min="0" step="0.01" value={editData.cost ?? ""} onClick={stop} onChange={e => setEditData({ ...editData, cost: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="$ 0.00" style={inpStyle} />
                  </div>
                  <input value={editData.notes || ""} onClick={stop} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Notes" style={fullStyle} />
                </>
              )}

              {/* ── Flight ── */}
              {leg.type === "flight" && (
                <>
                  {hasPrimaryRoute ? (
                    <div style={{ gridColumn: "1 / -1", padding: "8px 12px", borderRadius: 8, backgroundColor: COLORS.inputBg, fontSize: 13, color: COLORS.textSecondary }}>
                      ✈ {leg.from} → {leg.to}
                    </div>
                  ) : (
                    <>
                      <input value={editData.from || ""} onClick={stop} onChange={e => setEditData({ ...editData, from: e.target.value })} placeholder="Departure Airport" style={inpStyle} />
                      <input value={editData.to || ""} onClick={stop} onChange={e => setEditData({ ...editData, to: e.target.value })} placeholder="Arrival Airport" style={inpStyle} />
                    </>
                  )}
                  <div>
                    <label style={lblStyle}>Airline</label>
                    <input value={editData.airline || ""} onClick={stop} onChange={e => setEditData({ ...editData, airline: e.target.value })} placeholder="e.g. Delta, United" style={inpStyle} />
                  </div>
                  <div>
                    <label style={lblStyle}>Flight #</label>
                    <input value={editData.flightNumber || ""} onClick={stop} onChange={e => setEditData({ ...editData, flightNumber: e.target.value })} placeholder="e.g. DL 1234" style={inpStyle} />
                  </div>
                  <div>
                    <label style={lblStyle}>Departure Time</label>
                    <PickerPopover type="time" value={editData.time || ""} onClick={stop} onChange={val => setEditData({ ...editData, time: val })} />
                  </div>
                  {!showPerPassenger && (
                    <div>
                      <label style={lblStyle}>Confirmation #</label>
                      <input value={editData.confirmationNumber || ""} onClick={stop} onChange={e => setEditData({ ...editData, confirmationNumber: e.target.value })} placeholder="Confirmation #" style={inpStyle} />
                    </div>
                  )}
                  <div>
                    <label style={lblStyle}>Cost</label>
                    <input type="number" min="0" step="0.01" value={editData.cost ?? ""} onClick={stop} onChange={e => setEditData({ ...editData, cost: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="$ 0.00" style={inpStyle} />
                  </div>
                  <input value={editData.notes || ""} onClick={stop} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Notes (e.g. terminal, gate, seat)" style={fullStyle} />
                </>
              )}

              {/* ── Rental Car ── */}
              {leg.type === "car" && (
                <>
                  {hasPrimaryRoute ? (
                    <div style={{ gridColumn: "1 / -1", padding: "8px 12px", borderRadius: 8, backgroundColor: COLORS.inputBg, fontSize: 13, color: COLORS.textSecondary }}>
                      🚗 {leg.from} → {leg.to}
                    </div>
                  ) : (
                    <input value={editData.location || ""} onClick={stop} onChange={e => setEditData({ ...editData, location: e.target.value })} placeholder="Pickup Location" style={fullStyle} />
                  )}
                  <div>
                    <label style={lblStyle}>Rental Company</label>
                    <input value={editData.rentalCompany || ""} onClick={stop} onChange={e => setEditData({ ...editData, rentalCompany: e.target.value })} placeholder="e.g. Hertz, Enterprise" style={inpStyle} />
                  </div>
                  <div>
                    <label style={lblStyle}>Confirmation #</label>
                    <input value={editData.confirmationNumber || ""} onClick={stop} onChange={e => setEditData({ ...editData, confirmationNumber: e.target.value })} placeholder="Confirmation #" style={inpStyle} />
                  </div>
                  <div>
                    <label style={lblStyle}>Pickup Date</label>
                    <PickerPopover type="date" value={editData.date} onClick={stop} onChange={val => setEditData({ ...editData, date: val })} />
                  </div>
                  <div>
                    <label style={lblStyle}>Return Date</label>
                    <PickerPopover type="date" value={editData.endDate || ""} onClick={stop} onChange={val => setEditData({ ...editData, endDate: val })} />
                  </div>
                  <div>
                    <label style={lblStyle}>Cost</label>
                    <input type="number" min="0" step="0.01" value={editData.cost ?? ""} onClick={stop} onChange={e => setEditData({ ...editData, cost: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="$ 0.00" style={inpStyle} />
                  </div>
                  <input value={editData.notes || ""} onClick={stop} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Notes (e.g. car type, insurance, extras)" style={fullStyle} />
                </>
              )}

              {/* ── Train ── */}
              {leg.type === "train" && (
                <>
                  {hasPrimaryRoute ? (
                    <div style={{ gridColumn: "1 / -1", padding: "8px 12px", borderRadius: 8, backgroundColor: COLORS.inputBg, fontSize: 13, color: COLORS.textSecondary }}>
                      🚆 {leg.from} → {leg.to}
                    </div>
                  ) : (
                    <>
                      <input value={editData.from || ""} onClick={stop} onChange={e => setEditData({ ...editData, from: e.target.value })} placeholder="Departure Station" style={inpStyle} />
                      <input value={editData.to || ""} onClick={stop} onChange={e => setEditData({ ...editData, to: e.target.value })} placeholder="Arrival Station" style={inpStyle} />
                    </>
                  )}
                  <div>
                    <label style={lblStyle}>Departure Time</label>
                    <PickerPopover type="time" value={editData.time || ""} onClick={stop} onChange={val => setEditData({ ...editData, time: val })} />
                  </div>
                  {!showPerPassenger && (
                    <div>
                      <label style={lblStyle}>Confirmation #</label>
                      <input value={editData.confirmationNumber || ""} onClick={stop} onChange={e => setEditData({ ...editData, confirmationNumber: e.target.value })} placeholder="Confirmation #" style={inpStyle} />
                    </div>
                  )}
                  <div>
                    <label style={lblStyle}>Cost</label>
                    <input type="number" min="0" step="0.01" value={editData.cost ?? ""} onClick={stop} onChange={e => setEditData({ ...editData, cost: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="$ 0.00" style={inpStyle} />
                  </div>
                  <input value={editData.notes || ""} onClick={stop} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Notes (e.g. platform, car #, seat)" style={fullStyle} />
                </>
              )}

              {/* ── Bus ── */}
              {leg.type === "bus" && (
                <>
                  {hasPrimaryRoute ? (
                    <div style={{ gridColumn: "1 / -1", padding: "8px 12px", borderRadius: 8, backgroundColor: COLORS.inputBg, fontSize: 13, color: COLORS.textSecondary }}>
                      🚌 {leg.from} → {leg.to}
                    </div>
                  ) : (
                    <>
                      <input value={editData.from || ""} onClick={stop} onChange={e => setEditData({ ...editData, from: e.target.value })} placeholder="Departure Stop" style={inpStyle} />
                      <input value={editData.to || ""} onClick={stop} onChange={e => setEditData({ ...editData, to: e.target.value })} placeholder="Arrival Stop" style={inpStyle} />
                    </>
                  )}
                  <div>
                    <label style={lblStyle}>Departure Time</label>
                    <PickerPopover type="time" value={editData.time || ""} onClick={stop} onChange={val => setEditData({ ...editData, time: val })} />
                  </div>
                  {!showPerPassenger && (
                    <div>
                      <label style={lblStyle}>Confirmation #</label>
                      <input value={editData.confirmationNumber || ""} onClick={stop} onChange={e => setEditData({ ...editData, confirmationNumber: e.target.value })} placeholder="Confirmation #" style={inpStyle} />
                    </div>
                  )}
                  <div>
                    <label style={lblStyle}>Cost</label>
                    <input type="number" min="0" step="0.01" value={editData.cost ?? ""} onClick={stop} onChange={e => setEditData({ ...editData, cost: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="$ 0.00" style={inpStyle} />
                  </div>
                  <input value={editData.notes || ""} onClick={stop} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Notes (e.g. bus line, platform, seat)" style={fullStyle} />
                </>
              )}

              {/* ── Cruise / Ferry ── */}
              {leg.type === "ferry" && (
                <>
                  {hasPrimaryRoute ? (
                    <div style={{ gridColumn: "1 / -1", padding: "8px 12px", borderRadius: 8, backgroundColor: COLORS.inputBg, fontSize: 13, color: COLORS.textSecondary }}>
                      🚢 {leg.from} → {leg.to}
                    </div>
                  ) : (
                    <>
                      <input value={editData.from || ""} onClick={stop} onChange={e => setEditData({ ...editData, from: e.target.value })} placeholder="Departure Port" style={inpStyle} />
                      <input value={editData.to || ""} onClick={stop} onChange={e => setEditData({ ...editData, to: e.target.value })} placeholder="Arrival Port" style={inpStyle} />
                    </>
                  )}
                  <div>
                    <label style={lblStyle}>Departure Time</label>
                    <PickerPopover type="time" value={editData.time || ""} onClick={stop} onChange={val => setEditData({ ...editData, time: val })} />
                  </div>
                  {!showPerPassenger && (
                    <div>
                      <label style={lblStyle}>Confirmation #</label>
                      <input value={editData.confirmationNumber || ""} onClick={stop} onChange={e => setEditData({ ...editData, confirmationNumber: e.target.value })} placeholder="Confirmation #" style={inpStyle} />
                    </div>
                  )}
                  <div>
                    <label style={lblStyle}>Cost</label>
                    <input type="number" min="0" step="0.01" value={editData.cost ?? ""} onClick={stop} onChange={e => setEditData({ ...editData, cost: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="$ 0.00" style={inpStyle} />
                  </div>
                  <input value={editData.notes || ""} onClick={stop} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Notes (e.g. cabin #, deck, meal plan)" style={fullStyle} />
                </>
              )}

              {/* ── Activity (fallback) ── */}
              {!["hotel", "flight", "car", "train", "bus", "ferry"].includes(leg.type) && (
                <>
                  <input value={editData.title} onClick={stop} onChange={e => setEditData({ ...editData, title: e.target.value })} placeholder="Activity Name" autoComplete="off" data-form-type="other" data-lpignore="true" data-1p-ignore style={fullStyle} />
                  <div>
                    <label style={lblStyle}>Date</label>
                    <PickerPopover type="date" value={editData.date} onClick={stop} onChange={val => setEditData({ ...editData, date: val })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={lblStyle}>Start Time</label>
                      <PickerPopover type="time" value={editData.time || ""} onClick={stop} onChange={val => setEditData({ ...editData, time: val })} />
                    </div>
                    <div>
                      <label style={lblStyle}>End Time</label>
                      <PickerPopover type="time" value={editData.endTime || ""} onClick={stop} onChange={val => setEditData({ ...editData, endTime: val })} />
                    </div>
                  </div>
                  <input value={editData.location || ""} onClick={stop} onChange={e => setEditData({ ...editData, location: e.target.value })} placeholder="Location" autoComplete="off" data-form-type="other" data-lpignore="true" data-1p-ignore style={fullStyle} />
                  <div>
                    <label style={lblStyle}>Cost</label>
                    <input type="number" min="0" step="0.01" value={editData.cost ?? ""} onClick={stop} onChange={e => setEditData({ ...editData, cost: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="$ 0.00" style={inpStyle} />
                  </div>
                  <input value={editData.notes || ""} onClick={stop} onChange={e => setEditData({ ...editData, notes: e.target.value })} placeholder="Notes / Confirmation #" autoComplete="off" data-form-type="other" data-lpignore="true" data-1p-ignore style={fullStyle} />
                </>
              )}
            </div>
            {/* Per-passenger tickets for flights/trains/buses when travelers > 1 */}
            {travelers > 1 && ["flight", "train", "bus", "ferry"].includes(leg.type) && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Passenger Tickets</div>
                {Array.from({ length: travelers }, (_, i) => {
                  const ticket = leg.passengerTickets?.find(t => t.passenger === i + 1);
                  const tBooked = ticket?.booked || false;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 10px", borderRadius: 8, backgroundColor: tBooked ? COLORS.bookedBg : COLORS.inputBg, border: `1px solid ${tBooked ? COLORS.booked : COLORS.borderLight}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: tBooked ? COLORS.booked : COLORS.textMain, flex: 1 }}>
                        {leg.type === "flight" ? "✈" : leg.type === "train" ? "🚆" : leg.type === "ferry" ? "🚢" : "🚌"} Passenger {i + 1}
                      </span>
                      {tBooked ? (
                        <>
                          {ticket?.confirmationNumber && <span style={{ fontSize: 11, color: COLORS.booked, fontFamily: "monospace" }}>{ticket.confirmationNumber}</span>}
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const tickets = [...(leg.passengerTickets || [])];
                            const idx = tickets.findIndex(t => t.passenger === i + 1);
                            if (idx >= 0) tickets.splice(idx, 1);
                            onUpdate({ passengerTickets: tickets });
                          }} className="btn-press" style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${COLORS.booked}`, backgroundColor: "white", color: COLORS.booked, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Undo</button>
                        </>
                      ) : (
                        <>
                          <input
                            placeholder="Confirmation #"
                            onClick={e => e.stopPropagation()}
                            onChange={() => {}}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val) {
                                const tickets = [...(leg.passengerTickets || [])];
                                const idx = tickets.findIndex(t => t.passenger === i + 1);
                                if (idx >= 0) { tickets[idx] = { ...tickets[idx], confirmationNumber: val, booked: true }; }
                                else { tickets.push({ passenger: i + 1, confirmationNumber: val, booked: true }); }
                                onUpdate({ passengerTickets: tickets });
                              }
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                            style={{ width: 100, padding: "4px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 11, outline: "none" }}
                          />
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const tickets = [...(leg.passengerTickets || [])];
                            const idx = tickets.findIndex(t => t.passenger === i + 1);
                            if (idx >= 0) { tickets[idx] = { ...tickets[idx], booked: true }; }
                            else { tickets.push({ passenger: i + 1, booked: true }); }
                            onUpdate({ passengerTickets: tickets });
                          }} className="btn-press" style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${COLORS.booked}`, backgroundColor: COLORS.bookedBg, color: COLORS.booked, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                            <Check size={11} /> Done
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={e => { e.stopPropagation(); onUpdate(editData); onToggleExpand(); }} className="btn-press" style={{ padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: COLORS.primary, color: "white", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Save size={14} /> Save</button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.urgent}`, backgroundColor: "white", color: COLORS.urgent, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const ProgressSummary = ({ legs }: { legs: TripLeg[] }) => {
  const stats = useMemo(() => {
    const total = legs.length, booked = legs.filter(l => l.status === "booked").length, pending = legs.filter(l => l.status === "pending").length, urgent = legs.filter(l => l.status === "urgent").length;
    const flights = legs.filter(l => l.type === "flight"), hotels = legs.filter(l => l.type === "hotel"), transport = legs.filter(l => !["flight", "hotel"].includes(l.type));
    return { total, booked, pending, urgent, flights, hotels, transport };
  }, [legs]);
  if (stats.total === 0) return null;
  const pct = (stats.booked / stats.total) * 100;
  return (
    <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 20, border: `1px solid ${COLORS.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Booking Progress</h3>
        <span style={{ fontSize: 24, fontWeight: 700, color: pct === 100 ? COLORS.booked : COLORS.primary }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 8, backgroundColor: COLORS.borderLight, borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: "100%", width: `${pct}%`, backgroundColor: pct === 100 ? COLORS.booked : COLORS.primary, borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <div style={{ padding: 12, borderRadius: 10, backgroundColor: COLORS.bookedBg, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: COLORS.booked }}>{stats.booked}</div><div style={{ fontSize: 11, fontWeight: 600, color: COLORS.booked, textTransform: "uppercase" }}>Booked</div></div>
        <div style={{ padding: 12, borderRadius: 10, backgroundColor: COLORS.pendingBg, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: COLORS.pending }}>{stats.pending}</div><div style={{ fontSize: 11, fontWeight: 600, color: COLORS.pending, textTransform: "uppercase" }}>Pending</div></div>
        <div style={{ padding: 12, borderRadius: 10, backgroundColor: COLORS.urgentBg, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 700, color: COLORS.urgent }}>{stats.urgent}</div><div style={{ fontSize: 11, fontWeight: 600, color: COLORS.urgent, textTransform: "uppercase" }}>Urgent</div></div>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 16, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Plane size={16} color={COLORS.flight} /><span style={{ fontSize: 13, color: COLORS.textSecondary }}>{stats.flights.filter(f => f.status === "booked").length}/{stats.flights.length} flights</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Hotel size={16} color={COLORS.hotel} /><span style={{ fontSize: 13, color: COLORS.textSecondary }}>{stats.hotels.filter(h => h.status === "booked").length}/{stats.hotels.length} hotels</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Car size={16} color={COLORS.transport} /><span style={{ fontSize: 13, color: COLORS.textSecondary }}>{stats.transport.filter(t => t.status === "booked").length}/{stats.transport.length} transport</span></div>
      </div>
    </div>
  );
};

// Category chip component for day guide — modern compact pill style
const CategoryChip = ({ 
  type, hasItem, isBooked, isExpanded, onClick, label, partialComplete, transportMode 
}: { 
  type: "flight" | "hotel" | "transport" | "activity"; 
  hasItem: boolean; 
  isBooked: boolean; 
  isExpanded: boolean;
  onClick: () => void;
  label?: string;
  partialComplete?: boolean;
  transportMode?: TransportMode;
}) => {
  const getModeConfig = (mode: TransportMode) => {
    switch (mode) {
      case "plane": return { icon: Plane, name: "Flight" };
      case "car": return { icon: Car, name: "Drive" };
      case "rail": return { icon: Train, name: "Train" };
      case "bus": return { icon: Bus, name: "Bus" };
      case "other": return { icon: Ship, name: "Cruise" };
    }
  };
  const flightConfig = transportMode ? getModeConfig(transportMode) : { icon: Plane, name: "Flight" };
  const config = {
    flight: { icon: flightConfig.icon, color: COLORS.flight, bg: COLORS.flightBg, name: flightConfig.name, priority: true },
    hotel: { icon: Hotel, color: COLORS.hotel, bg: COLORS.hotelBg, name: "Stay", priority: true },
    transport: { icon: Car, color: COLORS.transport, bg: COLORS.transportBg, name: "Ride", priority: false },
    activity: { icon: MapPin, color: "#6B705C", bg: "#ECEAE2", name: "Activity", priority: false }
  };
  const { icon: Icon, name } = config[type];

  // Exactly 3 status colors — consistent across ALL chip types
  const GREEN = "#2D6A4F";   const GREEN_BG = "#E2EDE6";
  const YELLOW = "#C4953A";  const YELLOW_BG = "#F5EDD8";
  const RED = "#C0392B";     const RED_BG = "#F5DEDA";
  const GRAY = "#9C9588";    const GRAY_BG = "#F8F6F2";

  let chipColor: string, chipBg: string;
  if (hasItem && !partialComplete) {
    chipColor = GREEN; chipBg = GREEN_BG;       // Complete
  } else if (partialComplete) {
    chipColor = YELLOW; chipBg = YELLOW_BG;      // Partial
  } else if (hasItem) {
    chipColor = RED; chipBg = RED_BG;            // Has items, none complete
  } else {
    chipColor = RED; chipBg = RED_BG;            // Needs attention
  }

  // Override: if chip is not relevant (no items AND not a priority slot), gray it out
  if (!hasItem && !partialComplete) {
    chipColor = RED; chipBg = RED_BG;
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className="btn-press"
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 10px", borderRadius: 20,
        backgroundColor: chipBg,
        border: `1.5px solid ${isExpanded ? chipColor : chipColor}`,
        cursor: "pointer", fontSize: 11, fontWeight: 600,
        color: chipColor, whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        outline: "none",
      }}
    >
      <Icon size={14} color={chipColor} />
      <span>{label || name}</span>
      {hasItem && !partialComplete && <Check size={12} color={GREEN} />}
    </button>
  );
};

// Day-by-Day View Component - Horizontal icon guide layout
const DayByDayView = ({ legs, onUpdateLeg, onDeleteLeg, onAddLeg, expandedLegs, toggleLegExpand, departureDate, returnDate, primaryTransportMode, multiCityLegs, travelers = 1 }: { 
  legs: TripLeg[]; 
  onUpdateLeg: (id: string, u: Partial<TripLeg>) => void; 
  onDeleteLeg: (id: string) => void;
  primaryTransportMode?: TransportMode;
  onAddLeg: (leg: Partial<TripLeg>) => void;
  expandedLegs: Set<string>;
  toggleLegExpand: (id: string) => void;
  departureDate?: string;
  returnDate?: string;
  multiCityLegs?: MultiCityLeg[];
  travelers?: number;
}) => {
  const [expandedCategory, setExpandedCategory] = useState<Record<string, string | null>>({});
  const [editingTransport, setEditingTransport] = useState<string | null>(null); // "to-{date}" or "from-{date}" or "rental"
  const [transportForm, setTransportForm] = useState({ type: "uber", notes: "", rentalCompany: "", startDate: "", endDate: "" });
  const [addDropdownDate, setAddDropdownDate] = useState<string | null>(null);
  const [addDropdownPos, setAddDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Generate all days between departure and return
  const allDays = useMemo(() => {
    const days: string[] = [];
    if (departureDate) {
      const start = new Date(departureDate + "T00:00:00");
      const end = returnDate ? new Date(returnDate + "T00:00:00") : start;
      const current = new Date(start);
      while (current <= end) {
        days.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    }
    return days;
  }, [departureDate, returnDate]);

  // Group legs by date and category
  const legsByDate = useMemo(() => {
    const groups: Record<string, { 
      flights: TripLeg[]; 
      hotels: { leg: TripLeg; isContinuation: boolean }[]; 
      transport: TripLeg[]; 
      activities: TripLeg[];
      standalone: TripLeg[] 
    }> = {};
    const noDateLegs: TripLeg[] = [];
    
    // Track which leg IDs are primary inter-city legs (from multiCityLegs)
    const primaryLegIds = new Set(multiCityLegs?.map(l => l.id) || []);
    
    allDays.forEach(day => { 
      groups[day] = { flights: [], hotels: [], transport: [], activities: [], standalone: [] }; 
    });
    
    legs.forEach(leg => {
      // Standalone legs get their own section, not grouped into categories
      if (leg.standalone && leg.date && groups[leg.date]) {
        groups[leg.date].standalone.push(leg);
        return;
      }
      if (leg.type === "hotel" && leg.date) {
        const checkIn = new Date(leg.date + "T00:00:00");
        // Use hotel endDate, or returnDate, or last day of trip as checkout
        const lastDay = allDays.length > 0 ? allDays[allDays.length - 1] : leg.date;
        const checkOutDate = leg.endDate || returnDate || lastDay;
        const checkOut = new Date(checkOutDate + "T00:00:00");
        const current = new Date(checkIn);
        let isFirst = true;
        // Show hotel on all days from check-in through check-out (inclusive)
        while (current <= checkOut) {
          const dateStr = current.toISOString().split("T")[0];
          if (groups[dateStr]) {
            groups[dateStr].hotels.push({ leg, isContinuation: !isFirst });
          }
          current.setDate(current.getDate() + 1);
          isFirst = false;
        }
      } else if (["car", "train", "bus", "ferry"].includes(leg.type) && !primaryLegIds.has(leg.id) && leg.date && leg.endDate) {
        // Rental car or transport with date range (NOT a primary multi-city leg) - show on all days
        const startDate = new Date(leg.date + "T00:00:00");
        const endDate = new Date(leg.endDate + "T00:00:00");
        const current = new Date(startDate);
        while (current <= endDate) {
          const dateStr = current.toISOString().split("T")[0];
          if (groups[dateStr]) {
            groups[dateStr].transport.push(leg);
          }
          current.setDate(current.getDate() + 1);
        }
      } else if (leg.date && groups[leg.date]) {
        // Primary inter-city legs (flights or multi-city legs of any mode) go into "flights" slot
        if (leg.type === "flight" || primaryLegIds.has(leg.id)) groups[leg.date].flights.push(leg);
        else if (["car", "train", "bus", "ferry"].includes(leg.type)) groups[leg.date].transport.push(leg);
        else groups[leg.date].activities.push(leg);
      } else if (!leg.date) {
        noDateLegs.push(leg);
      }
    });
    
    return { groups, sortedDates: allDays, noDateLegs };
  }, [legs, allDays, multiCityLegs]);

  const formatDayHeader = (dateStr: string, dayNum: number): string => {
    try {
      const date = new Date(dateStr + "T00:00:00");
      return `Day ${dayNum} · ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
    } catch { return `Day ${dayNum}`; }
  };
  
  // Get travel day indicator icon based on transport mode
  const getTravelDayIcon = (flights: TripLeg[]) => {
    if (flights.length === 0) return null;
    const leg = flights[0];
    switch (leg.type) {
      case "car": return <Car size={14} color="white" />;
      case "train": return <Train size={14} color="white" />;
      case "bus": return <Bus size={14} color="white" />;
      case "ferry": return <Ship size={14} color="white" />;
      default: return <Plane size={14} color="white" />;
    }
  };
  
  // Get which city the user is in on a given date (for multi-city trips)
  const getCityForDate = (dateStr: string): string | null => {
    if (!multiCityLegs || multiCityLegs.length === 0) return null;
    
    // Sort legs by date
    const sortedLegs = [...multiCityLegs].filter(l => l.date).sort((a, b) => a.date.localeCompare(b.date));
    if (sortedLegs.length === 0) return null;
    
    // Find the most recent leg that departed on or before this date
    let currentCity: string | null = null;
    for (const leg of sortedLegs) {
      if (leg.date <= dateStr) {
        currentCity = leg.to; // After this leg, user is in the destination city
      } else {
        break;
      }
    }
    
    // If no leg has departed yet, user is in the first leg's origin
    if (!currentCity && sortedLegs.length > 0 && dateStr < sortedLegs[0].date) {
      currentCity = sortedLegs[0].from;
    }
    
    return currentCity;
  };

  const toggleCategory = (date: string, category: string) => {
    setExpandedCategory(prev => ({
      ...prev,
      [date]: prev[date] === category ? null : category
    }));
  };

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      {legsByDate.sortedDates.map((date, idx) => {
        const dayData = legsByDate.groups[date];
        const expanded = expandedCategory[date];
        
        const flightBooked = dayData.flights.some(f => f.status === "booked");
        const hotelBooked = dayData.hotels.some(h => h.leg.status === "booked");
        const transportBooked = dayData.transport.some(t => t.status === "booked");
        const activityBooked = dayData.activities.some(a => a.status === "booked");
        
        // Calculate completion status for day card styling
        // Travel day = any day with flights (not just first/last)
        const isTravelDay = dayData.flights.length > 0;
        const hasTransport = dayData.transport.length > 0;
        const hasUserInfo = (leg: TripLeg) => leg.status === "booked" || leg.confirmationNumber || leg.notes;
        const displayedCategories: boolean[] = [
          dayData.hotels.length > 0 && dayData.hotels.some(h => h.leg.hotelName || h.leg.title),
          dayData.activities.length > 0,
        ];
        if (isTravelDay || hasTransport) {
          displayedCategories.push(dayData.transport.some(t => hasUserInfo(t)));
        }
        if (isTravelDay) {
          displayedCategories.push(dayData.flights.some(f => hasUserInfo(f) || f.flightNumber));
        }
        const completed = displayedCategories.filter(c => c).length;
        const total = displayedCategories.length;
        
        // Determine day status color: red (0), yellow (partial), green (all)
        const dayStatusColor = completed === 0 ? "#C0392B" : completed === total ? COLORS.booked : COLORS.pending;
        const dayStatusBg = completed === 0 ? "#F5DEDA" : completed === total ? COLORS.bookedBg : COLORS.pendingBg;
        
        return (
          <div key={date} style={{ 
            marginBottom: 8, 
            backgroundColor: COLORS.card, 
            borderRadius: 12, 
            border: `1px solid ${COLORS.border}`,
            borderLeft: `3px solid ${dayStatusColor}`,
            overflow: "hidden"
          }}>
            {/* Day Header */}
            <div style={{ 
              display: "flex", alignItems: "center", gap: 8, 
              padding: "8px 12px",
            }}>
              {isTravelDay && (
                <div style={{ 
                  width: 24, height: 24, borderRadius: "50%", 
                  backgroundColor: COLORS.primary, 
                  color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0
                }}>
                  {getTravelDayIcon(dayData.flights)}
                </div>
              )}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, color: COLORS.textMain }}>
                  <strong>Day {idx + 1}</strong> <span style={{ color: COLORS.textSecondary, fontWeight: 400 }}>· {(() => {
                    try {
                      const d = new Date(date + "T00:00:00");
                      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                    } catch { return ""; }
                  })()}</span>
                </span>
                {(() => {
                  const city = getCityForDate(date);
                  return city ? (
                    <span style={{ 
                      fontSize: 10, 
                      padding: "1px 6px", 
                      borderRadius: 4, 
                      backgroundColor: COLORS.accentLight, 
                      color: COLORS.primaryDark,
                      fontWeight: 600
                    }}>
                      {city}
                    </span>
                  ) : null;
                })()}
              </div>
              <span style={{ 
                fontSize: 11, fontWeight: 600,
                color: dayStatusColor,
              }}>
                {completed}/{total}
              </span>
            </div>
            
            {/* Horizontal Icon Guide - fixed 4-column grid for consistent alignment */}
            {/* All 4 slots always present, Transport/Flight only clickable on travel days */}
            {(() => {
              // Travel day = any day with a flight leg (not just first/last)
              const isTravelDay = dayData.flights.length > 0;
              // Helper: check if leg has user-added info (not just auto-generated)
              const hasUserInfo = (leg: TripLeg) => leg.status === "booked" || leg.confirmationNumber || leg.notes;
              // Multi-city intermediate travel day: need both checkout + checkin hotels
              const isIntermediateTravelDay = isTravelDay && multiCityLegs && multiCityLegs.length > 0 && idx > 0 && idx < legsByDate.sortedDates.length - 1;
              const checkoutHotels = isIntermediateTravelDay ? dayData.hotels.filter(h => h.isContinuation) : [];
              const checkinHotels = isIntermediateTravelDay ? dayData.hotels.filter(h => !h.isContinuation) : [];
              const checkoutBooked = checkoutHotels.some(h => h.leg.status === "booked" || h.leg.hotelName || h.leg.title);
              const checkinBooked = checkinHotels.some(h => h.leg.status === "booked" || h.leg.hotelName || h.leg.title);
              const hotelComplete = isIntermediateTravelDay
                ? checkoutBooked && checkinBooked
                : dayData.hotels.length > 0 && dayData.hotels.some(h => h.leg.hotelName || h.leg.title);
              const hotelPartialComplete = isIntermediateTravelDay && (checkoutBooked || checkinBooked) && !(checkoutBooked && checkinBooked);
              const activityComplete = dayData.activities.length > 0;
              // Transport: on travel days, need both "to hub" and "from hub"
              const isToHub = (t: TripLeg) => t.title?.toLowerCase().startsWith("to ") || t.to?.toLowerCase().includes("airport") || t.to?.toLowerCase().includes("station") || t.to?.toLowerCase().includes("port");
              const isFromHub = (t: TripLeg) => t.title?.toLowerCase().startsWith("from ") || t.from?.toLowerCase().includes("airport") || t.from?.toLowerCase().includes("station") || t.from?.toLowerCase().includes("port");
              const toHubLeg = dayData.transport.find(isToHub);
              const fromHubLeg = dayData.transport.find(isFromHub);
              const toAirportBooked = toHubLeg && hasUserInfo(toHubLeg);
              const fromAirportBooked = fromHubLeg && hasUserInfo(fromHubLeg);
              // For travel days: need both transports. Count how many are booked.
              const transportNeeded = isTravelDay ? 2 : (dayData.transport.length > 0 ? dayData.transport.length : 0);
              const transportBookedCount = isTravelDay 
                ? (toAirportBooked ? 1 : 0) + (fromAirportBooked ? 1 : 0)
                : dayData.transport.filter(t => hasUserInfo(t)).length;
              const transportAllComplete = transportNeeded > 0 && transportBookedCount >= transportNeeded;
              const transportPartial = transportBookedCount > 0 && transportBookedCount < transportNeeded;
              const transportHasAny = transportBookedCount > 0;
              const flightComplete = dayData.flights.some(f => hasUserInfo(f) || f.flightNumber);

              return (
                <div
                  onClick={() => { if (expanded) setExpandedCategory(prev => ({ ...prev, [date]: null })); }}
                  style={{ 
                  display: "flex", flexWrap: "wrap", gap: 6,
                  padding: "8px 12px",
                  borderBottom: expanded ? `1px solid ${COLORS.border}` : "none",
                  cursor: expanded ? "pointer" : "default"
                }}>
                  <CategoryChip 
                    type="hotel" 
                    hasItem={hotelComplete}
                    isBooked={hotelBooked}
                    isExpanded={expanded === "hotel"}
                    onClick={() => toggleCategory(date, "hotel")}
                    label="Stay"
                    partialComplete={hotelPartialComplete}
                  />
                  <CategoryChip 
                    type="activity" 
                    hasItem={activityComplete}
                    isBooked={activityBooked}
                    isExpanded={expanded === "activity"}
                    onClick={() => toggleCategory(date, "activity")}
                  />
                  {(isTravelDay || dayData.transport.length > 0) && (
                    <CategoryChip 
                      type="transport" 
                      hasItem={transportHasAny}
                      isBooked={transportBooked}
                      isExpanded={expanded === "transport"}
                      onClick={() => toggleCategory(date, "transport")}
                      partialComplete={transportPartial}
                    />
                  )}
                  {isTravelDay && (() => {
                    const dayLeg = dayData.flights[0];
                    const dayMode: TransportMode = dayLeg ? (
                      dayLeg.type === "car" ? "car" :
                      dayLeg.type === "train" ? "rail" :
                      dayLeg.type === "bus" ? "bus" :
                      dayLeg.type === "ferry" ? "other" : "plane"
                    ) : (primaryTransportMode || "plane");
                    return (
                      <CategoryChip 
                        type="flight" 
                        hasItem={flightComplete}
                        isBooked={flightBooked}
                        isExpanded={expanded === "flight"}
                        onClick={() => toggleCategory(date, "flight")}
                        transportMode={dayMode}
                      />
                    );
                  })()}
                  {/* Standalone items as individual chips */}
                  {dayData.standalone.map(leg => {
                    const chipLabel = leg.title || leg.type.charAt(0).toUpperCase() + leg.type.slice(1);
                    const isExpanded = expanded === `standalone-${leg.id}`;
                    // Red = no info added, Green = has any info filled in
                    const hasInfo = !!(leg.confirmationNumber || leg.notes || leg.hotelName || leg.flightNumber || leg.airline || leg.rentalCompany || leg.location || leg.time || leg.from || leg.to || leg.cost);
                    const chipColor = hasInfo ? COLORS.booked : "#C0392B";
                    const chipBg = isExpanded ? `${chipColor}15` : hasInfo ? COLORS.bookedBg : "#F5DEDA";
                    const Icon = leg.type === "flight" ? Plane : leg.type === "train" ? Train : leg.type === "bus" ? Bus : leg.type === "ferry" ? Ship : leg.type === "hotel" ? Hotel : leg.type === "car" ? Car : MapPin;
                    return (
                      <button
                        key={leg.id}
                        onClick={e => { e.stopPropagation(); toggleCategory(date, `standalone-${leg.id}`); }}
                        className="btn-press"
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 10px", borderRadius: 20,
                          backgroundColor: chipBg,
                          border: `1.5px solid ${chipColor}`,
                          cursor: "pointer", fontSize: 11, fontWeight: 600,
                          color: chipColor, whiteSpace: "nowrap",
                        }}
                      >
                        <Icon size={13} />
                        {chipLabel}
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        <span
                          onClick={e => { e.stopPropagation(); if (confirm(`Delete "${chipLabel}"?`)) onDeleteLeg(leg.id); }}
                          style={{ marginLeft: 2, display: "flex", alignItems: "center", opacity: 0.6, cursor: "pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                        >
                          <X size={11} />
                        </span>
                      </button>
                    );
                  })}
                  {/* Add + pill with dropdown */}
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setAddDropdownPos({ top: rect.bottom + 4, left: rect.left });
                        setAddDropdownDate(prev => prev === date ? null : date);
                      }}
                      className="btn-press"
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "6px 10px", borderRadius: 20,
                        backgroundColor: "white",
                        border: `1.5px dashed ${COLORS.textMuted}`,
                        cursor: "pointer", fontSize: 11, fontWeight: 600,
                        color: COLORS.textMuted, whiteSpace: "nowrap",
                        outline: "none",
                      }}
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </div>
              );
            })()}
            
            {/* Expanded Details */}
            {expanded && (
              <div style={{ padding: "8px 12px", overflow: "hidden", maxWidth: "100%", boxSizing: "border-box" }}>
                {expanded === "flight" && (
                  <>
                    {dayData.flights.map(leg => (
                      <TripLegCard key={leg.id} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} tripDepartureDate={departureDate} tripReturnDate={returnDate} travelers={travelers} />
                    ))}
                  </>
                )}
                {expanded === "hotel" && (() => {
                  // Multi-city intermediate travel day: show checkout + checkin sections
                  const isTravelDay = dayData.flights.length > 0;
                  const isIntermediateTravelDay = isTravelDay && multiCityLegs && multiCityLegs.length > 0 && idx > 0 && idx < legsByDate.sortedDates.length - 1;
                  if (isIntermediateTravelDay) {
                    const leavingCity = dayData.flights[0]?.from || "previous city";
                    const arrivingCity = dayData.flights[0]?.to || "next city";
                    const checkoutHotels = dayData.hotels.filter(h => h.isContinuation);
                    const checkinHotels = dayData.hotels.filter(h => !h.isContinuation);
                    return (
                      <>
                        {/* Checkout section */}
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} /> Lodging Checkout — leaving {leavingCity}
                          </div>
                          {checkoutHotels.length > 0 ? checkoutHotels.map(({ leg }) => (
                            <TripLegCard key={`${leg.id}-checkout-${date}`} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} tripDepartureDate={departureDate} tripReturnDate={returnDate} travelers={travelers} />
                          )) : (
                            <button onClick={() => onAddLeg({ type: "hotel", date: legsByDate.sortedDates[idx - 1] || date, status: "pending", title: "", location: leavingCity })} style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px dashed ${COLORS.hotel}`, backgroundColor: COLORS.hotelBg, color: COLORS.hotel, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              <Plus size={16} /> Add Hotel in {leavingCity}
                            </button>
                          )}
                        </div>
                        {/* Checkin section */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <ArrowRight size={12} /> Lodging Checkin — arriving {arrivingCity}
                          </div>
                          {checkinHotels.length > 0 ? checkinHotels.map(({ leg }) => (
                            <TripLegCard key={`${leg.id}-checkin-${date}`} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} tripDepartureDate={departureDate} tripReturnDate={returnDate} travelers={travelers} />
                          )) : (
                            <button onClick={() => onAddLeg({ type: "hotel", date, status: "pending", title: "", location: arrivingCity })} style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px dashed ${COLORS.hotel}`, backgroundColor: COLORS.hotelBg, color: COLORS.hotel, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              <Plus size={16} /> Add Hotel in {arrivingCity}
                            </button>
                          )}
                        </div>
                      </>
                    );
                  }
                  return (
                    <>
                      {dayData.hotels.length > 0 ? dayData.hotels.map(({ leg }) => (
                          <TripLegCard key={`${leg.id}-${date}`} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} tripDepartureDate={departureDate} tripReturnDate={returnDate} travelers={travelers} />
                      )) : (
                        <button onClick={() => onAddLeg({ type: "hotel", date, status: "pending", title: "", location: "" })} style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px dashed ${COLORS.hotel}`, backgroundColor: COLORS.hotelBg, color: COLORS.hotel, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <Plus size={16} /> Add Hotel
                        </button>
                      )}
                    </>
                  );
                })()}
                {expanded === "transport" && (() => {
                  // Determine hub name based on the day's primary travel mode
                  const dayLeg = dayData.flights[0];
                  const hubName = dayLeg ? (
                    dayLeg.type === "train" ? "Train Station" :
                    dayLeg.type === "bus" ? "Bus Station" :
                    dayLeg.type === "ferry" ? "Ship" :
                    dayLeg.type === "car" ? "Rental Car Pickup" :
                    "Airport"
                  ) : "Airport";
                  // Search pattern: match any existing transport leg with "To ..." or "From ..." in title
                  const isToHubLeg = (t: TripLeg) => t.title?.toLowerCase().startsWith("to ") || t.to?.toLowerCase().includes("airport") || t.to?.toLowerCase().includes("station") || t.to?.toLowerCase().includes("port");
                  const isFromHubLeg = (t: TripLeg) => t.title?.toLowerCase().startsWith("from ") || t.from?.toLowerCase().includes("airport") || t.from?.toLowerCase().includes("station") || t.from?.toLowerCase().includes("port");
                  const toHubLeg = dayData.transport.find(isToHubLeg);
                  const fromHubLeg = dayData.transport.find(isFromHubLeg);
                  const toTitle = `To ${hubName}`;
                  const fromTitle = `From ${hubName}`;
                  return (
                  <>
                    {/* Getting to hub Section */}
                    {(() => {
                      const toHubComplete = toHubLeg?.status === "booked";
                      const isEditing = editingTransport === `to-${date}`;
                      return (
                        <div style={{ marginBottom: 12, padding: 12, backgroundColor: COLORS.transportBg, borderRadius: 10, border: `1px solid ${COLORS.transport}30` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (toHubLeg || isEditing) ? 8 : 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <ArrowRight size={16} color={COLORS.transport} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>Getting to {hubName}</span>
                            </div>
                            {!toHubLeg && !isEditing ? (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button 
                                  onClick={() => onAddLeg({ type: "car", date, status: "booked", title: toTitle, notes: "Quick complete" })}
                                  style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.booked}`, backgroundColor: `${COLORS.booked}15`, color: COLORS.booked, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                >
                                  <Check size={12} /> Mark Complete
                                </button>
                                <button 
                                  onClick={() => { setEditingTransport(`to-${date}`); setTransportForm({ type: "uber", notes: "", rentalCompany: "", startDate: date, endDate: date }); }}
                                  style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.transport}`, backgroundColor: "white", color: COLORS.transport, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                >
                                  <Plus size={12} /> Add Details
                                </button>
                              </div>
                            ) : toHubLeg && !isEditing ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {toHubComplete ? (
                                  <span style={{ fontSize: 11, color: COLORS.booked, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Check size={12} /> Complete</span>
                                ) : (
                                  <button 
                                    onClick={() => onUpdateLeg(toHubLeg.id, { status: "booked" })}
                                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.booked}`, backgroundColor: `${COLORS.booked}15`, color: COLORS.booked, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                  >
                                    <Check size={12} /> Mark Done
                                  </button>
                                )}
                                <button 
                                  onClick={() => { setEditingTransport(`to-${date}`); setTransportForm({ type: (toHubLeg.rentalCompany || toHubLeg.notes?.startsWith("Rental")) ? "rental" : toHubLeg.notes?.includes("Uber") ? "uber" : "other", notes: toHubLeg.notes || "", rentalCompany: toHubLeg.rentalCompany || "", startDate: toHubLeg.date || date, endDate: toHubLeg.endDate || date }); }}
                                  style={{ padding: "4px 8px", borderRadius: 6, border: "none", backgroundColor: "transparent", color: COLORS.textMuted, fontSize: 11, cursor: "pointer" }}
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={() => { if (confirm("Delete this transport?")) onDeleteLeg(toHubLeg.id); }}
                                  style={{ padding: "4px 8px", borderRadius: 6, border: "none", backgroundColor: "transparent", color: "#C0392B", fontSize: 11, cursor: "pointer" }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ) : null}
                          </div>
                          {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                {["uber", "rental", "other"].map(t => (
                                  <button key={t} onClick={() => setTransportForm(f => ({ ...f, type: t }))}
                                    style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${transportForm.type === t ? COLORS.transport : COLORS.border}`, backgroundColor: transportForm.type === t ? COLORS.transportBg : "white", color: transportForm.type === t ? COLORS.transport : COLORS.textSecondary, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                                    {t === "uber" ? "🚕 Uber/Lyft" : t === "rental" ? "🚗 Rental Car" : "📝 Other"}
                                  </button>
                                ))}
                              </div>
                              {transportForm.type === "rental" && (
                                <>
                                  <input placeholder="Rental company (e.g., Hertz, Enterprise)" value={transportForm.rentalCompany} onChange={e => setTransportForm(f => ({ ...f, rentalCompany: e.target.value }))}
                                    style={{ padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 12, outline: "none" }} />
                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Pickup:</label>
                                    <PickerPopover type="date" value={transportForm.startDate} onChange={val => setTransportForm(f => ({ ...f, startDate: val }))} />
                                    <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Return:</label>
                                    <PickerPopover type="date" value={transportForm.endDate} onChange={val => setTransportForm(f => ({ ...f, endDate: val }))} />
                                  </div>
                                </>
                              )}
                              <input placeholder="Notes (optional)" value={transportForm.notes} onChange={e => setTransportForm(f => ({ ...f, notes: e.target.value }))}
                                style={{ padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 12, outline: "none" }} />
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button onClick={() => setEditingTransport(null)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.textSecondary, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                                <button onClick={() => {
                                  const notes = transportForm.type === "uber" ? "Uber/Lyft" : transportForm.type === "rental" ? `Rental: ${transportForm.rentalCompany}` : transportForm.notes;
                                  if (toHubLeg) {
                                    onUpdateLeg(toHubLeg.id, { notes: transportForm.notes || notes, rentalCompany: transportForm.rentalCompany, date: transportForm.startDate, endDate: transportForm.endDate, status: "booked", title: toTitle });
                                  } else {
                                    onAddLeg({ type: "car", date: transportForm.startDate || date, endDate: transportForm.endDate, status: "booked", title: toTitle, notes: transportForm.notes || notes, rentalCompany: transportForm.rentalCompany });
                                  }
                                  setEditingTransport(null);
                                }} style={{ padding: "6px 12px", borderRadius: 6, border: "none", backgroundColor: COLORS.primary, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                              </div>
                            </div>
                          ) : toHubLeg && (
                            <div style={{ fontSize: 12, color: COLORS.textSecondary, cursor: "pointer" }} onClick={() => { setEditingTransport(`to-${date}`); setTransportForm({ type: (toHubLeg.rentalCompany || toHubLeg.notes?.startsWith("Rental")) ? "rental" : toHubLeg.notes?.includes("Uber") ? "uber" : "other", notes: toHubLeg.notes || "", rentalCompany: toHubLeg.rentalCompany || "", startDate: toHubLeg.date || date, endDate: toHubLeg.endDate || date }); }}>
                              {toHubLeg.notes === "Quick complete" ? "Marked complete" : (
                                <>
                                  {toHubLeg.rentalCompany && <span style={{ marginRight: 8 }}>🚗 {toHubLeg.rentalCompany}</span>}
                                  {toHubLeg.notes && <span>{toHubLeg.notes}</span>}
                                  {!toHubLeg.rentalCompany && !toHubLeg.notes && toHubLeg.status !== "booked" && (
                                    <span style={{ color: COLORS.pending }}>Click to add details (Rental car, Uber, etc.)</span>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Leaving from hub Section */}
                    {(() => {
                      const fromHubComplete = fromHubLeg?.status === "booked";
                      const isEditing = editingTransport === `from-${date}`;
                      return (
                        <div style={{ padding: 12, backgroundColor: COLORS.transportBg, borderRadius: 10, border: `1px solid ${COLORS.transport}30` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (fromHubLeg || isEditing) ? 8 : 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <ArrowRight size={16} color={COLORS.transport} style={{ transform: "rotate(180deg)" }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>Leaving from {hubName}</span>
                            </div>
                            {!fromHubLeg && !isEditing ? (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button 
                                  onClick={() => onAddLeg({ type: "car", date, status: "booked", title: fromTitle, notes: "Quick complete" })}
                                  style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.booked}`, backgroundColor: `${COLORS.booked}15`, color: COLORS.booked, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                >
                                  <Check size={12} /> Mark Complete
                                </button>
                                <button 
                                  onClick={() => { setEditingTransport(`from-${date}`); setTransportForm({ type: "uber", notes: "", rentalCompany: "", startDate: date, endDate: date }); }}
                                  style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.transport}`, backgroundColor: "white", color: COLORS.transport, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                >
                                  <Plus size={12} /> Add Details
                                </button>
                              </div>
                            ) : fromHubLeg && !isEditing ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {fromHubComplete ? (
                                  <span style={{ fontSize: 11, color: COLORS.booked, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Check size={12} /> Complete</span>
                                ) : (
                                  <button 
                                    onClick={() => onUpdateLeg(fromHubLeg.id, { status: "booked" })}
                                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.booked}`, backgroundColor: `${COLORS.booked}15`, color: COLORS.booked, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                                  >
                                    <Check size={12} /> Mark Done
                                  </button>
                                )}
                                <button 
                                  onClick={() => { setEditingTransport(`from-${date}`); setTransportForm({ type: (fromHubLeg.rentalCompany || fromHubLeg.notes?.startsWith("Rental")) ? "rental" : fromHubLeg.notes?.includes("Uber") ? "uber" : "other", notes: fromHubLeg.notes || "", rentalCompany: fromHubLeg.rentalCompany || "", startDate: fromHubLeg.date || date, endDate: fromHubLeg.endDate || date }); }}
                                  style={{ padding: "4px 8px", borderRadius: 6, border: "none", backgroundColor: "transparent", color: COLORS.textMuted, fontSize: 11, cursor: "pointer" }}
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={() => { if (confirm("Delete this transport?")) onDeleteLeg(fromHubLeg.id); }}
                                  style={{ padding: "4px 8px", borderRadius: 6, border: "none", backgroundColor: "transparent", color: "#C0392B", fontSize: 11, cursor: "pointer" }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ) : null}
                          </div>
                          {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                {["uber", "rental", "other"].map(t => (
                                  <button key={t} onClick={() => setTransportForm(f => ({ ...f, type: t }))}
                                    style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${transportForm.type === t ? COLORS.transport : COLORS.border}`, backgroundColor: transportForm.type === t ? COLORS.transportBg : "white", color: transportForm.type === t ? COLORS.transport : COLORS.textSecondary, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                                    {t === "uber" ? "🚕 Uber/Lyft" : t === "rental" ? "🚗 Rental Car" : "📝 Other"}
                                  </button>
                                ))}
                              </div>
                              {transportForm.type === "rental" && (
                                <>
                                  <input placeholder="Rental company (e.g., Hertz, Enterprise)" value={transportForm.rentalCompany} onChange={e => setTransportForm(f => ({ ...f, rentalCompany: e.target.value }))}
                                    style={{ padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 12, outline: "none" }} />
                                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Pickup:</label>
                                    <PickerPopover type="date" value={transportForm.startDate} onChange={val => setTransportForm(f => ({ ...f, startDate: val }))} />
                                    <label style={{ fontSize: 12, color: COLORS.textSecondary }}>Return:</label>
                                    <PickerPopover type="date" value={transportForm.endDate} onChange={val => setTransportForm(f => ({ ...f, endDate: val }))} />
                                  </div>
                                </>
                              )}
                              <input placeholder="Notes (optional)" value={transportForm.notes} onChange={e => setTransportForm(f => ({ ...f, notes: e.target.value }))}
                                style={{ padding: "8px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 12, outline: "none" }} />
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button onClick={() => setEditingTransport(null)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.textSecondary, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                                <button onClick={() => {
                                  const notes = transportForm.type === "uber" ? "Uber/Lyft" : transportForm.type === "rental" ? `Rental: ${transportForm.rentalCompany}` : transportForm.notes;
                                  if (fromHubLeg) {
                                    onUpdateLeg(fromHubLeg.id, { notes: transportForm.notes || notes, rentalCompany: transportForm.rentalCompany, date: transportForm.startDate, endDate: transportForm.endDate, status: "booked", title: fromTitle });
                                  } else {
                                    onAddLeg({ type: "car", date: transportForm.startDate || date, endDate: transportForm.endDate, status: "booked", title: fromTitle, notes: transportForm.notes || notes, rentalCompany: transportForm.rentalCompany });
                                  }
                                  setEditingTransport(null);
                                }} style={{ padding: "6px 12px", borderRadius: 6, border: "none", backgroundColor: COLORS.primary, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                              </div>
                            </div>
                          ) : fromHubLeg && (
                            <div style={{ fontSize: 12, color: COLORS.textSecondary, cursor: "pointer" }} onClick={() => { setEditingTransport(`from-${date}`); setTransportForm({ type: (fromHubLeg.rentalCompany || fromHubLeg.notes?.startsWith("Rental")) ? "rental" : fromHubLeg.notes?.includes("Uber") ? "uber" : "other", notes: fromHubLeg.notes || "", rentalCompany: fromHubLeg.rentalCompany || "", startDate: fromHubLeg.date || date, endDate: fromHubLeg.endDate || date }); }}>
                              {fromHubLeg.notes === "Quick complete" ? "Marked complete" : (
                                <>
                                  {fromHubLeg.rentalCompany && <span style={{ marginRight: 8 }}>🚗 {fromHubLeg.rentalCompany}</span>}
                                  {fromHubLeg.notes && <span>{fromHubLeg.notes}</span>}
                                  {!fromHubLeg.rentalCompany && !fromHubLeg.notes && fromHubLeg.status !== "booked" && (
                                    <span style={{ color: COLORS.pending }}>Click to add details (Rental car, Uber, etc.)</span>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                  );
                })()}
                {expanded === "activity" && (
                  <>
                    {dayData.activities.map(leg => (
                      <TripLegCard key={leg.id} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} tripDepartureDate={departureDate} tripReturnDate={returnDate} travelers={travelers} />
                    ))}
                    <button onClick={() => onAddLeg({ type: "other", date, status: "pending", title: "" })} style={{ width: "100%", padding: 12, borderRadius: 10, border: `2px dashed #6B705C`, backgroundColor: "#ECEAE2", color: "#6B705C", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: dayData.activities.length > 0 ? 8 : 0 }}>
                      <Plus size={16} /> Add Activity
                    </button>
                  </>
                )}
              </div>
            )}
            {/* Standalone item expanded sections - each standalone has its own expandable section */}
            {dayData.standalone.map(leg => (
              expanded === `standalone-${leg.id}` && (
                <div key={leg.id} style={{ padding: "8px 12px" }}>
                  <TripLegCard leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} tripDepartureDate={departureDate} tripReturnDate={returnDate} travelers={travelers} />
                </div>
              )
            ))}
          </div>
        );
      })}
      {/* Add dropdown portal - rendered once outside the day map loop */}
      {addDropdownDate && ReactDOM.createPortal(
        <>
          <div onClick={() => setAddDropdownDate(null)} style={{ position: "fixed", inset: 0, zIndex: 9999 }} />
          <div style={{
            position: "fixed", top: addDropdownPos.top, left: addDropdownPos.left,
            backgroundColor: "white", borderRadius: 12, padding: 6,
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 10000, minWidth: 200,
          }}>
            {[
              { icon: <Plane size={14} />, label: "Flight", type: "flight" as LegType, title: "" },
              { icon: <Train size={14} />, label: "Train", type: "train" as LegType, title: "" },
              { icon: <Bus size={14} />, label: "Bus", type: "bus" as LegType, title: "" },
              { icon: <Ship size={14} />, label: "Ferry / Cruise", type: "ferry" as LegType, title: "" },
              { icon: <Hotel size={14} />, label: "Lodging", type: "hotel" as LegType, title: "" },
              { icon: <Car size={14} />, label: "Rental Car", type: "car" as LegType, title: "" },
              { icon: <Car size={14} />, label: "Ride (Uber/Taxi)", type: "car" as LegType, title: "Ride" },
              { icon: <MapPin size={14} />, label: "Activity", type: "other" as LegType, title: "" },
              { icon: <Heart size={14} />, label: "Restaurant / Dining", type: "other" as LegType, title: "Dining" },
              { icon: <FileText size={14} />, label: "Insurance / Document", type: "other" as LegType, title: "Insurance" },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  onAddLeg({ type: item.type, date: addDropdownDate, status: "pending", title: item.title, standalone: true });
                  setAddDropdownDate(null);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "8px 10px", borderRadius: 8, border: "none",
                  backgroundColor: "transparent", cursor: "pointer",
                  fontSize: 13, color: COLORS.textMain, fontWeight: 500,
                  textAlign: "left",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = COLORS.inputBg)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span style={{ color: COLORS.textSecondary, display: "flex", alignItems: "center" }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

const AddLegModal = ({ onAdd, onClose }: { onAdd: (l: Partial<TripLeg>) => void; onClose: () => void }) => {
  const [type, setType] = useState<LegType>("flight");
  const [formData, setFormData] = useState<Partial<TripLeg>>({ status: "pending", title: "", date: "" });
  const legTypes: { type: LegType; label: string }[] = [{ type: "flight", label: "Flight" }, { type: "hotel", label: "Hotel" }, { type: "car", label: "Car/Taxi" }, { type: "train", label: "Train" }, { type: "bus", label: "Bus" }];
  const handleSubmit = () => {
    let title = formData.title || "";
    if (!title && type === "flight" && formData.from && formData.to) title = `Flight: ${formData.from} → ${formData.to}`;
    else if (!title && type === "hotel" && formData.location) title = `Hotel in ${formData.location}`;
    else if (!title) title = type.charAt(0).toUpperCase() + type.slice(1);
    onAdd({ ...formData, type, title });
    onClose();
  };
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div style={{ backgroundColor: "white", borderRadius: 20, padding: 24, maxWidth: 500, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Add Trip Leg</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {legTypes.map(lt => <button key={lt.type} onClick={() => setType(lt.type)} style={{ padding: "10px 16px", borderRadius: 10, border: type === lt.type ? `2px solid ${getLegColor(lt.type).main}` : `1px solid ${COLORS.border}`, backgroundColor: type === lt.type ? getLegColor(lt.type).bg : "white", color: type === lt.type ? getLegColor(lt.type).main : COLORS.textSecondary, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>{getLegIcon(lt.type, 18)} {lt.label}</button>)}
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          {(type !== "hotel") && <><input value={formData.from || ""} onChange={e => setFormData({ ...formData, from: e.target.value })} placeholder="From" style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} /><input value={formData.to || ""} onChange={e => setFormData({ ...formData, to: e.target.value })} placeholder="To" style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} /></>}
          {type === "hotel" && <input value={formData.location || ""} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Location" style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} />}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <PickerPopover type="date" value={formData.date || ""} onChange={val => setFormData({ ...formData, date: val })} />
            {type !== "hotel" ? <PickerPopover type="time" value={formData.time || ""} onChange={val => setFormData({ ...formData, time: val })} /> : <PickerPopover type="date" value={formData.endDate || ""} onChange={val => setFormData({ ...formData, endDate: val })} />}
          </div>
          {type === "flight" && <input value={formData.flightNumber || ""} onChange={e => setFormData({ ...formData, flightNumber: e.target.value })} placeholder="Flight Number (e.g. AA1234)" style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} />}
          {type === "hotel" && <input value={formData.hotelName || ""} onChange={e => setFormData({ ...formData, hotelName: e.target.value })} placeholder="Hotel Name" style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} />}
          <input value={formData.confirmationNumber || ""} onChange={e => setFormData({ ...formData, confirmationNumber: e.target.value })} placeholder="Confirmation # (optional)" style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button onClick={handleSubmit} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", backgroundColor: COLORS.primary, color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Add to Trip</button>
          <button onClick={onClose} style={{ padding: "14px 24px", borderRadius: 12, border: `1px solid ${COLORS.border}`, backgroundColor: "white", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Missing Info Prompt Bar Component
const MissingInfoBar = ({ 
  missingItems, 
  onAddInfo,
  editingItem,
  setEditingItem,
  editValue,
  setEditValue,
  onSaveEdit
}: { 
  missingItems: MissingInfo[];
  onAddInfo: (item: MissingInfo) => void;
  editingItem: string | null;
  setEditingItem: (id: string | null) => void;
  editValue: string;
  setEditValue: (v: string) => void;
  onSaveEdit: () => void;
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  React.useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll);
    return () => { if (el) el.removeEventListener("scroll", checkScroll); };
  }, [missingItems]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -200 : 200;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  if (missingItems.length === 0) return null;
  
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 8, 
        marginBottom: 8,
        color: COLORS.pending
      }}>
        <AlertCircle size={16} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Complete your itinerary:</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {canScrollLeft && (
          <button onClick={() => scroll("left")} style={{ padding: 6, borderRadius: 8, border: "none", backgroundColor: COLORS.card, color: COLORS.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <ChevronUp size={18} style={{ transform: "rotate(-90deg)" }} />
          </button>
        )}
        <div ref={scrollRef} style={{ 
          display: "flex", 
          gap: 8, 
          overflowX: "auto", 
          flex: 1,
          scrollbarWidth: "none",
          msOverflowStyle: "none"
        }} className="hide-scrollbar">
        {missingItems.map(item => (
          <div key={item.id} style={{ flexShrink: 0 }}>
            {editingItem === item.id ? (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                backgroundColor: COLORS.card,
                borderRadius: 10,
                border: `2px solid ${COLORS.primary}`,
                minWidth: 180
              }}>
                <input
                  type={item.type.includes("date") ? "date" : item.type === "travelers" ? "number" : "text"}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  placeholder={item.label}
                  autoFocus
                  min={item.type === "travelers" ? "1" : undefined}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 13,
                    padding: 0,
                    width: item.type.includes("date") ? 130 : 80,
                    backgroundColor: "transparent"
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter") onSaveEdit();
                    if (e.key === "Escape") setEditingItem(null);
                  }}
                />
                <button 
                  onClick={onSaveEdit}
                  style={{ 
                    background: "none", border: "none", cursor: "pointer", 
                    color: COLORS.primary, padding: 2 
                  }}
                >
                  <Check size={16} />
                </button>
                <button 
                  onClick={() => setEditingItem(null)}
                  style={{ 
                    background: "none", border: "none", cursor: "pointer", 
                    color: COLORS.textMuted, padding: 2 
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingItem(item.id);
                  setEditValue("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  backgroundColor: COLORS.pendingBg,
                  border: `1px solid ${COLORS.pending}`,
                  borderRadius: 10,
                  color: COLORS.pending,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                <Plus size={14} />
                {item.label}
              </button>
            )}
          </div>
        ))}
        </div>
        {canScrollRight && (
          <button onClick={() => scroll("right")} style={{ padding: 6, borderRadius: 8, border: "none", backgroundColor: COLORS.card, color: COLORS.textSecondary, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <ChevronUp size={18} style={{ transform: "rotate(90deg)" }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default function TripPlanner({ initialData }: { initialData?: any }) {
  const [savedTrips, setSavedTrips] = useState<Trip[]>(() => loadSavedTrips());
  const [currentView, setCurrentView] = useState<"home" | "trip">(() => {
    // If there's a current trip in progress, show it; otherwise show home
    try { 
      const s = localStorage.getItem(STORAGE_KEY); 
      if (s) { const d = JSON.parse(s); if (d.trip && d.trip.legs.length > 0) return "trip"; } 
    } catch {}
    return savedTrips.length > 0 ? "home" : "trip";
  });
  const [trip, setTrip] = useState<Trip>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const d = JSON.parse(s); if (d.trip) return d.trip; } } catch {}
    return { id: generateId(), name: "My Trip", tripType: "round_trip", legs: [], travelers: 1, createdAt: Date.now(), updatedAt: Date.now() };
  });
  const [tripDescription, setTripDescription] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedLegs, setExpandedLegs] = useState<Set<string>>(new Set());
  const [inputMode, setInputMode] = useState<"freeform" | "manual">("freeform");
  const [renamingTripId, setRenamingTripId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingTravelers, setEditingTravelers] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ trip, timestamp: Date.now() })); } catch {} }, [trip]);
  
  // Sync multi-city legs to trip.legs when in multi-city mode
  useEffect(() => {
    if (trip.tripType === "multi_city" && trip.multiCityLegs && trip.multiCityLegs.length > 0) {
      // Map transport mode to leg type
      const modeToLegType = (mode: string): LegType => {
        switch (mode) {
          case "car": return "car";
          case "rail": return "train";
          case "bus": return "bus";
          case "other": return "ferry";
          default: return "flight";
        }
      };

      // Build transport legs from multiCityLegs
      const multiCityLegIds = new Set(trip.multiCityLegs.map(l => l.id));
      const newTransportLegs: TripLeg[] = trip.multiCityLegs
        .filter(leg => leg.from && leg.to && leg.date)
        .map(leg => {
          const legType = modeToLegType(leg.mode || "plane");
          // Preserve existing status if leg already exists
          const existing = trip.legs.find(l => l.id === leg.id);
          return {
            id: leg.id,
            type: legType,
            status: existing?.status || ("pending" as const),
            title: `${getModeLabel(leg.mode || "plane")}: ${leg.from} → ${leg.to}`,
            from: leg.from,
            to: leg.to,
            date: leg.date,
            ...(existing?.confirmationNumber ? { confirmationNumber: existing.confirmationNumber } : {}),
            ...(existing?.passengerTickets ? { passengerTickets: existing.passengerTickets } : {}),
          };
        });
      
      // Get legs NOT generated from multiCityLegs (hotels, manual transport, activities)
      const otherLegs = trip.legs.filter(l => !multiCityLegIds.has(l.id));
      
      // Check if transport legs need updating
      const currentTransportLegs = trip.legs.filter(l => multiCityLegIds.has(l.id));
      const legsChanged = JSON.stringify(newTransportLegs.map(l => ({ id: l.id, type: l.type, from: l.from, to: l.to, date: l.date, title: l.title }))) !== 
                           JSON.stringify(currentTransportLegs.map(l => ({ id: l.id, type: l.type, from: l.from, to: l.to, date: l.date, title: l.title })));
      
      if (legsChanged && newTransportLegs.length > 0) {
        setTrip(t => ({ 
          ...t, 
          legs: [...newTransportLegs, ...otherLegs],
          updatedAt: Date.now() 
        }));
      }
    }
  }, [trip.tripType, trip.multiCityLegs]);
  
  // Auto-add return flight for round trips
  useEffect(() => {
    if (trip.tripType === "round_trip" && trip.returnDate && trip.departureDate) {
      const flights = trip.legs.filter(l => l.type === "flight");
      const hasReturnFlight = flights.some(f => f.date === trip.returnDate);
      
      if (flights.length > 0 && !hasReturnFlight) {
        // Get origin and destination from first flight
        const outboundFlight = flights[0];
        const origin = outboundFlight.from;
        const destination = outboundFlight.to;
        
        if (origin && destination) {
          // Add return flight (reverse direction)
          const returnFlight: TripLeg = {
            id: generateId(),
            type: "flight",
            status: "pending",
            title: `Flight: ${destination} → ${origin}`,
            from: destination,
            to: origin,
            date: trip.returnDate
          };
          setTrip(t => ({ ...t, legs: [...t.legs, returnFlight], updatedAt: Date.now() }));
        }
      }
    }
  }, [trip.tripType, trip.returnDate, trip.departureDate, trip.legs.filter(l => l.type === "flight").length]);
  
  // Auto-sync hotel dates with flight dates
  useEffect(() => {
    const flights = trip.legs.filter(l => l.type === "flight");
    const hotels = trip.legs.filter(l => l.type === "hotel");
    
    if (flights.length > 0 && hotels.length > 0) {
      const outboundFlight = flights[0];
      const returnFlight = flights.length > 1 ? flights[flights.length - 1] : null;
      
      let needsUpdate = false;
      const updatedLegs = trip.legs.map(leg => {
        if (leg.type === "hotel") {
          const updates: Partial<TripLeg> = {};
          // Sync check-in with outbound flight arrival
          if (!leg.date && outboundFlight?.date) {
            updates.date = outboundFlight.date;
            needsUpdate = true;
          }
          // Sync check-out with return flight departure
          if (!leg.endDate && returnFlight?.date) {
            updates.endDate = returnFlight.date;
            needsUpdate = true;
          }
          if (Object.keys(updates).length > 0) {
            return { ...leg, ...updates };
          }
        }
        return leg;
      });
      
      if (needsUpdate) {
        setTrip(t => ({ ...t, legs: updatedLegs, updatedAt: Date.now() }));
      }
    }
  }, [trip.legs.filter(l => l.type === "flight").map(f => f.date).join(",")]);

  // Calculate missing info - SMART logic
  const missingInfo = useMemo(() => {
    const items: MissingInfo[] = [];
    const flights = trip.legs.filter(l => l.type === "flight");
    const hotels = trip.legs.filter(l => l.type === "hotel");
    const outboundFlight = flights[0];
    const returnFlight = flights.length > 1 ? flights[flights.length - 1] : null;
    
    // 1. Confirm travelers (show if default value of 1 - user should confirm)
    if (trip.travelers === 1) {
      items.push({ 
        id: "travelers", 
        type: "travelers", 
        label: "Confirm # travelers", 
        icon: <Users size={14} />, 
        priority: 1 
      });
    }
    
    // 2. Hotel - for multi-city, prompt for each city segment without a hotel
    if (trip.tripType === "multi_city" && trip.multiCityLegs?.length) {
      // Calculate city segments (date ranges for each destination city)
      const sortedLegs = [...trip.multiCityLegs].filter(l => l.date && l.to).sort((a, b) => a.date.localeCompare(b.date));
      
      for (let i = 0; i < sortedLegs.length; i++) {
        const leg = sortedLegs[i];
        const nextLeg = sortedLegs[i + 1];
        const city = leg.to;
        const startDate = leg.date;
        // End date is day before next leg departs, or same as start if last leg
        const endDate = nextLeg ? (() => {
          const d = new Date(nextLeg.date + "T00:00:00");
          d.setDate(d.getDate() - 1);
          return d.toISOString().split("T")[0];
        })() : startDate;
        
        // Check if there's already a hotel for this city
        const hasHotelForCity = hotels.some(h => h.location === city || h.hotelName?.toLowerCase().includes(city.toLowerCase()));
        
        if (!hasHotelForCity && city) {
          items.push({ 
            id: `add-hotel-${city}`, 
            type: "hotel_name", 
            label: `Add hotel (${city})`, 
            icon: <Hotel size={14} />, 
            priority: 2,
            city: city,
            startDate: startDate,
            endDate: endDate
          });
        }
      }
    } else if (hotels.length === 0) {
      // For non-multi-city, just show generic "Add hotel"
      items.push({ 
        id: "add-hotel", 
        type: "hotel_name", 
        label: "Add hotel", 
        icon: <Hotel size={14} />, 
        priority: 2 
      });
    }
    
    // 3. Flight info - prompt for flights without flight numbers (use mode-specific label)
    const primaryMode: TransportMode = trip.departureMode || "plane";
    const confirmLabel = getModeConfirmationLabel(primaryMode);
    flights.forEach(f => {
      if (!f.flightNumber) {
        const routeLabel = (f.from && f.to) ? `${f.from} → ${f.to}` : getModeLabel(primaryMode).toLowerCase();
        items.push({ 
          id: `flight-${f.id}`, 
          type: "flight_number", 
          label: `Add ${confirmLabel} (${routeLabel})`, 
          icon: getModeIcon(primaryMode, 14), 
          legId: f.id, 
          priority: 3 
        });
      }
    });
    
    // 4. Departure date (if outbound flight has no date)
    if (outboundFlight && !outboundFlight.date) {
      items.push({ 
        id: `date-${outboundFlight.id}`, 
        type: "departure_date", 
        label: "Add departure date", 
        icon: <Calendar size={14} />, 
        legId: outboundFlight.id, 
        priority: 4 
      });
    }
    
    // 5. Return date (if round trip and return flight has no date)
    if (returnFlight && !returnFlight.date) {
      items.push({ 
        id: `date-${returnFlight.id}`, 
        type: "return_date", 
        label: "Add return date", 
        icon: <Calendar size={14} />, 
        legId: returnFlight.id, 
        priority: 5 
      });
    }
    
    // 6. Hotel name (only if hotel exists but no name)
    hotels.forEach(h => {
      if (!h.hotelName && !h.title) {
        items.push({ 
          id: `hotel-${h.id}`, 
          type: "hotel_name", 
          label: "Add hotel name", 
          icon: <Hotel size={14} />, 
          legId: h.id, 
          priority: 6 
        });
      }
    });
    
    // 7. Confirmation numbers (only for booked items)
    [...flights, ...hotels].forEach(leg => {
      if (!leg.confirmationNumber && leg.status === "booked") {
        items.push({ 
          id: `conf-${leg.id}`, 
          type: "confirmation", 
          label: `Add confirmation #`, 
          icon: <FileText size={14} />, 
          legId: leg.id, 
          priority: 7 
        });
      }
    });
    
    return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [trip]);
  
  // Handle saving inline edits
  const handleSaveEdit = () => {
    if (!editingItem || !editValue.trim()) {
      setEditingItem(null);
      return;
    }
    
    const item = missingInfo.find(i => i.id === editingItem);
    if (!item) return;
    
    if (item.type === "travelers") {
      setTrip(t => ({ ...t, travelers: parseInt(editValue) || 1, updatedAt: Date.now() }));
    } else if (item.id === "add-hotel" || item.id.startsWith("add-hotel-")) {
      // Create a new hotel with the entered name
      // For multi-city, use city-specific dates; otherwise use trip dates
      const newHotel: TripLeg = {
        id: generateId(),
        type: "hotel",
        status: "pending",
        title: editValue,
        hotelName: editValue,
        date: item.startDate || trip.departureDate || "",
        endDate: item.endDate || trip.returnDate || "",
        location: item.city || ""
      };
      setTrip(t => ({ ...t, legs: [...t.legs, newHotel], updatedAt: Date.now() }));
    } else if (item.type === "departure_date" && item.legId) {
      // Update flight date AND trip departure date
      setTrip(t => ({
        ...t,
        departureDate: editValue,
        legs: t.legs.map(l => l.id === item.legId ? { ...l, date: editValue } : l),
        updatedAt: Date.now()
      }));
    } else if (item.type === "return_date" && item.legId) {
      // Update return flight date AND trip return date
      setTrip(t => ({
        ...t,
        returnDate: editValue,
        legs: t.legs.map(l => l.id === item.legId ? { ...l, date: editValue } : l),
        updatedAt: Date.now()
      }));
    } else if (item.legId) {
      const updates: Partial<TripLeg> = {};
      if (item.type === "flight_number") updates.flightNumber = editValue;
      if (item.type === "hotel_name") {
        updates.hotelName = editValue;
        updates.title = editValue;
      }
      if (item.type === "confirmation") updates.confirmationNumber = editValue;
      
      setTrip(t => ({
        ...t,
        legs: t.legs.map(l => l.id === item.legId ? { ...l, ...updates } : l),
        updatedAt: Date.now()
      }));
    }
    
    setEditingItem(null);
    setEditValue("");
  };

  const handleSubscribe = async () => {
    if (!subscribeEmail || !subscribeEmail.includes("@")) {
      setSubscribeMessage("Please enter a valid email.");
      setSubscribeStatus("error");
      return;
    }
    setSubscribeStatus("loading");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subscribeEmail, topicId: "trip-planner-news", topicName: "Trip Planner Updates" })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubscribeStatus("success");
        setSubscribeMessage(data.message);
        setTimeout(() => { setShowSubscribeModal(false); setSubscribeEmail(""); setSubscribeStatus("idle"); setSubscribeMessage(""); }, 3000);
      } else {
        setSubscribeStatus("error");
        setSubscribeMessage(data.error || "Failed to subscribe.");
      }
    } catch (e) {
      console.error("Subscribe error:", e);
      setSubscribeStatus("error");
      setSubscribeMessage("Network error. Please try again.");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackStatus("submitting");
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "user_feedback", data: { feedback: feedbackText, tool: "trip-planner" } })
      });
      if (response.ok) {
        setFeedbackStatus("success");
        setTimeout(() => { setShowFeedbackModal(false); setFeedbackText(""); setFeedbackStatus("idle"); }, 2000);
      } else {
        setFeedbackStatus("error");
      }
    } catch (e) {
      console.error("Feedback error:", e);
      setFeedbackStatus("error");
    }
  };

  const handleParseDescription = async () => {
    if (!tripDescription.trim() || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // Call AI-powered parsing endpoint, include trip dates if set
      const response = await fetch("/api/parse-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: tripDescription,
          departureDate: trip.departureDate,
          returnDate: trip.returnDate,
          tripType: trip.tripType
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to analyze trip");
      }
      
      const data = await response.json();
      const parsed = data.legs || [];
      
      if (parsed.length > 0) {
        // Use trip dates as fallback if leg dates are empty
        const newLegs: TripLeg[] = parsed.map((l: any, idx: number) => {
          let legDate = l.date || "";
          let legEndDate = l.endDate;
          
          // If no date from API, use trip dates based on leg type
          if (!legDate) {
            if (l.type === "flight") {
              // First flight uses departure date, subsequent flights use return date
              const flightIndex = parsed.filter((p: any, i: number) => p.type === "flight" && i < idx).length;
              legDate = flightIndex === 0 ? (trip.departureDate || "") : (trip.returnDate || "");
            } else if (l.type === "hotel") {
              legDate = trip.departureDate || "";
              legEndDate = legEndDate || trip.returnDate;
            } else if (l.type === "car") {
              // Transport dates based on title (to airport = departure, from airport at destination = departure, etc.)
              const isOutbound = l.title?.toLowerCase().includes(parsed.find((p: any) => p.type === "flight")?.from?.toLowerCase() || "");
              legDate = isOutbound ? (trip.departureDate || "") : (trip.returnDate || "");
            }
          }
          
          return { 
            id: generateId(), 
            type: l.type || "other", 
            status: l.status || "pending", 
            title: l.title || "", 
            date: legDate,
            time: l.time,
            endDate: legEndDate,
            from: l.from, 
            to: l.to, 
            location: l.location,
            flightNumber: l.flightNumber,
            airline: l.airline,
            hotelName: l.hotelName,
            confirmationNumber: l.confirmationNumber
          };
        });
        // Extract departure and return dates from flights
        const flights = newLegs.filter(l => l.type === "flight");
        const departureDate = flights[0]?.date || "";
        const returnDate = flights.length > 1 ? flights[flights.length - 1]?.date : "";
        
        // Extract hotel end date if available
        const hotel = newLegs.find(l => l.type === "hotel");
        const hotelEndDate = hotel?.endDate || returnDate;
        
        const updatedTrip = { 
          ...trip, 
          legs: [...trip.legs, ...newLegs], 
          departureDate: departureDate || trip.departureDate,
          returnDate: returnDate || hotelEndDate || trip.returnDate,
          updatedAt: Date.now() 
        };
        setTrip(updatedTrip);
        setTripDescription("");
        
        // Auto-save the trip after creation
        const existingIndex = savedTrips.findIndex(t => t.id === updatedTrip.id);
        let newTrips: Trip[];
        if (existingIndex >= 0) {
          newTrips = savedTrips.map((t, i) => i === existingIndex ? updatedTrip : t);
        } else {
          newTrips = [...savedTrips, updatedTrip];
        }
        setSavedTrips(newTrips);
        saveTripsToStorage(newTrips);
      }
    } catch (error) {
      console.error("Failed to parse trip:", error);
      alert("Failed to analyze trip. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddLeg = (legData: Partial<TripLeg>) => {
    const newLeg: TripLeg = { ...legData, id: generateId(), type: legData.type || "other", status: legData.status || "pending", title: legData.title || "", date: legData.date || "" } as TripLeg;
    setTrip(t => ({ ...t, legs: [...t.legs, newLeg], updatedAt: Date.now() }));
    setExpandedLegs(p => new Set(p).add(newLeg.id));
  };

  const handleUpdateLeg = (legId: string, updates: Partial<TripLeg>) => setTrip(t => ({ ...t, legs: t.legs.map(l => l.id === legId ? { ...l, ...updates } : l), updatedAt: Date.now() }));
  const handleDeleteLeg = (legId: string) => { setTrip(t => ({ ...t, legs: t.legs.filter(l => l.id !== legId), updatedAt: Date.now() })); setExpandedLegs(p => { const n = new Set(p); n.delete(legId); return n; }); };
  const toggleLegExpand = (legId: string) => setExpandedLegs(p => { const n = new Set(p); n.has(legId) ? n.delete(legId) : n.add(legId); return n; });
  const handleReset = () => { if (confirm("Clear all trip data?")) { setTrip({ id: generateId(), name: "My Trip", tripType: "round_trip", legs: [], travelers: 1, createdAt: Date.now(), updatedAt: Date.now() }); setTripDescription(""); setExpandedLegs(new Set()); } };

  // Trip management functions
  const saveCurrentTrip = () => {
    const updatedTrip = { ...trip, updatedAt: Date.now() };
    const existingIndex = savedTrips.findIndex(t => t.id === trip.id);
    let newTrips: Trip[];
    if (existingIndex >= 0) {
      newTrips = savedTrips.map((t, i) => i === existingIndex ? updatedTrip : t);
    } else {
      newTrips = [...savedTrips, updatedTrip];
    }
    setSavedTrips(newTrips);
    saveTripsToStorage(newTrips);
  };

  const handleOpenTrip = (tripToOpen: Trip) => {
    setTrip(tripToOpen);
    setCurrentView("trip");
    setExpandedLegs(new Set());
  };

  const handleDeleteTrip = (tripId: string) => {
    if (!confirm("Delete this trip?")) return;
    const newTrips = savedTrips.filter(t => t.id !== tripId);
    setSavedTrips(newTrips);
    saveTripsToStorage(newTrips);
  };

  const handleDuplicateTrip = (tripToDupe: Trip) => {
    const newTrip: Trip = {
      ...tripToDupe,
      id: generateId(),
      name: `${tripToDupe.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const newTrips = [...savedTrips, newTrip];
    setSavedTrips(newTrips);
    saveTripsToStorage(newTrips);
  };

  const handleRenameTrip = (tripId: string, newName: string) => {
    const newTrips = savedTrips.map(t => t.id === tripId ? { ...t, name: newName, updatedAt: Date.now() } : t);
    setSavedTrips(newTrips);
    saveTripsToStorage(newTrips);
    setRenamingTripId(null);
  };

  const handleNewTrip = () => {
    const newTrip: Trip = { id: generateId(), name: "My Trip", tripType: "round_trip", legs: [], travelers: 1, createdAt: Date.now(), updatedAt: Date.now() };
    setTrip(newTrip);
    setCurrentView("trip");
    setTripDescription("");
    setExpandedLegs(new Set());
  };

  const handleBackToHome = () => {
    // Auto-save current trip if it has content
    if (trip.legs.length > 0) {
      saveCurrentTrip();
    }
    setCurrentView("home");
  };

  const sortedLegs = useMemo(() => [...trip.legs].sort((a, b) => { if (!a.date && !b.date) return 0; if (!a.date) return 1; if (!b.date) return -1; return a.date.localeCompare(b.date); }), [trip.legs]);

  // Homepage view - list of saved trips
  if (currentView === "home") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: COLORS.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", maxWidth: 600, margin: "0 auto", overflow: "hidden", boxSizing: "border-box" }}>
        <div style={{ backgroundColor: COLORS.primary, padding: "24px 20px", color: "white" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}><Plane size={28} />Trip Planner</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, opacity: 0.9 }}>Your saved trips</p>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <button onClick={handleNewTrip} style={{ width: "100%", padding: 16, borderRadius: 12, border: `2px dashed ${COLORS.primary}`, backgroundColor: COLORS.accentLight, color: COLORS.primaryDark, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
            <Plus size={20} /> Create New Trip
          </button>
          {savedTrips.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: COLORS.textSecondary }}>
              <Plane size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <p style={{ margin: 0 }}>No saved trips yet</p>
              <p style={{ margin: "8px 0 0", fontSize: 14 }}>Create your first trip to get started!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {savedTrips.sort((a, b) => b.updatedAt - a.updatedAt).map(t => (
                <div key={t.id} style={{ backgroundColor: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
                  <div onClick={() => handleOpenTrip(t)} style={{ padding: 16, cursor: "pointer" }}>
                    {renamingTripId === t.id ? (
                      <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                        <input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 14 }} onKeyDown={e => { if (e.key === "Enter") handleRenameTrip(t.id, renameValue); if (e.key === "Escape") setRenamingTripId(null); }} />
                        <button onClick={() => handleRenameTrip(t.id, renameValue)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", backgroundColor: COLORS.primary, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.textMain, marginBottom: 4 }}>{t.name}</div>
                        <div style={{ fontSize: 13, color: COLORS.textSecondary, display: "flex", alignItems: "center", gap: 12 }}>
                          {t.departureDate && <span>{formatDate(t.departureDate)}</span>}
                          {t.departureDate && t.returnDate && <span>→</span>}
                          {t.returnDate && <span>{formatDate(t.returnDate)}</span>}
                          {!t.departureDate && !t.returnDate && <span>{t.legs.length} leg{t.legs.length !== 1 ? "s" : ""}</span>}
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ padding: "8px 16px", borderTop: `1px solid ${COLORS.borderLight}`, display: "flex", gap: 8 }}>
                    <button onClick={() => { setRenamingTripId(t.id); setRenameValue(t.name); }} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.textSecondary, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Edit2 size={12} /> Rename</button>
                    <button onClick={() => handleDuplicateTrip(t)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.textSecondary, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> Duplicate</button>
                    <button onClick={() => handleDeleteTrip(t.id)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid #F5DEDA`, backgroundColor: "#FAF0EE", color: "#C0392B", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={12} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: COLORS.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", maxWidth: 600, margin: "0 auto", overflow: "hidden", boxSizing: "border-box" }}>
      <div style={{ backgroundColor: COLORS.primary, padding: "24px 20px", color: "white", borderRadius: "0 0 0 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}><Plane size={28} />Trip Planner</h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, opacity: 0.9 }}>Organize your travel reservations</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn-press" onClick={handleBackToHome} style={{ padding: 8, borderRadius: 8, border: "none", backgroundColor: "rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}><Home size={18} /></button>
            {trip.legs.length > 0 && <button className="btn-press" onClick={saveCurrentTrip} style={{ padding: 8, borderRadius: 8, border: "none", backgroundColor: "rgba(255,255,255,0.2)", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}><Save size={18} /></button>}
            <button className="btn-press" onClick={handleNewTrip} style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: "white", color: COLORS.primary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Plus size={16} /> New Trip</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: 20, overflow: "hidden", boxSizing: "border-box" }}>
        {trip.legs.length === 0 ? (
          <div style={{ backgroundColor: COLORS.card, borderRadius: 20, padding: 24, marginBottom: 20, border: `1px solid ${COLORS.border}` }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>Describe Your Trip</h2>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: COLORS.textSecondary }}>Tell us about your travel plans in plain English.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button onClick={() => setInputMode("freeform")} style={{ flex: 1, padding: 12, borderRadius: 10, border: inputMode === "freeform" ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`, backgroundColor: inputMode === "freeform" ? COLORS.accentLight : "white", color: inputMode === "freeform" ? COLORS.primaryDark : COLORS.textSecondary, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Sparkles size={18} /> Describe Trip</button>
              <button onClick={() => setInputMode("manual")} style={{ flex: 1, padding: 12, borderRadius: 10, border: inputMode === "manual" ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`, backgroundColor: inputMode === "manual" ? COLORS.accentLight : "white", color: inputMode === "manual" ? COLORS.primaryDark : COLORS.textSecondary, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Edit3 size={18} /> Add Manually</button>
            </div>
            {inputMode === "freeform" ? (
              <>
                <textarea value={tripDescription} onChange={e => setTripDescription(e.target.value)} placeholder="e.g. I am flying from Medellin to Boston on June 11th, 2026 and I will return to Medellin on June 15th." rows={4} style={{ width: "100%", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 15, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 16 }} />
                <button onClick={handleParseDescription} disabled={!tripDescription.trim() || isAnalyzing} style={{ width: "100%", padding: 16, borderRadius: 12, border: "none", backgroundColor: (tripDescription.trim() && !isAnalyzing) ? COLORS.primary : COLORS.border, color: (tripDescription.trim() && !isAnalyzing) ? "white" : COLORS.textMuted, fontSize: 16, fontWeight: 700, cursor: (tripDescription.trim() && !isAnalyzing) ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{isAnalyzing ? <><span style={{ display: "inline-block", width: 20, height: 20, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Analyzing...</> : <><Sparkles size={20} /> Analyze & Create Trip</>}</button>
              </>
            ) : (
              <button onClick={() => setShowAddModal(true)} style={{ width: "100%", padding: 16, borderRadius: 12, border: `2px dashed ${COLORS.border}`, backgroundColor: "transparent", color: COLORS.textSecondary, fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Plus size={20} /> Add First Trip Leg</button>
            )}
          </div>
        ) : (
          <>
            {/* Trip Type & Dates Selector - Collapsible when filled */}
            {(() => {
              const datesComplete = trip.departureDate && (trip.tripType === "one_way" || trip.returnDate);
              return (datesComplete && !isEditingDates) ? (
                // Collapsed view - just show summary
                <div 
                  onClick={() => setIsEditingDates(true)}
                  style={{ 
                    backgroundColor: COLORS.card, 
                    borderRadius: 12, 
                    padding: "12px 16px", 
                    marginBottom: 16,
                    border: `1px solid ${COLORS.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {(() => {
                      // For multi-city, use first and last leg dates
                      const displayStartDate = trip.tripType === "multi_city" && trip.multiCityLegs?.length 
                        ? trip.multiCityLegs[0].date 
                        : trip.departureDate;
                      const displayEndDate = trip.tripType === "multi_city" && trip.multiCityLegs?.length 
                        ? trip.multiCityLegs[trip.multiCityLegs.length - 1].date 
                        : trip.returnDate;
                      
                      return (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Calendar size={16} color={COLORS.primary} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>
                              {displayStartDate ? formatDate(displayStartDate) : "Set dates"}
                            </span>
                          </div>
                          {trip.tripType !== "one_way" && displayEndDate && displayEndDate !== displayStartDate && (
                            <>
                              <ArrowRight size={14} color={COLORS.textMuted} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>
                                {formatDate(displayEndDate)}
                              </span>
                            </>
                          )}
                        </>
                      );
                    })()}
                    <span style={{ 
                      fontSize: 11, 
                      padding: "2px 8px", 
                      borderRadius: 4, 
                      backgroundColor: COLORS.accentLight, 
                      color: COLORS.primaryDark,
                      fontWeight: 600
                    }}>
                      {trip.tripType === "one_way" ? "One Way" : trip.tripType === "round_trip" ? "Round Trip" : "Multi-City"}
                    </span>
                  </div>
                  <Edit3 size={16} color={COLORS.textSecondary} />
                </div>
              ) : (
                // Expanded view - full form
                <div style={{ 
                  backgroundColor: COLORS.card, 
                  borderRadius: 16, 
                  padding: 16, 
                  marginBottom: 16,
                  border: `1px solid ${COLORS.border}`
                }}>
                  {/* Trip Type Toggle */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[
                      { value: "one_way", label: "One Way" },
                      { value: "round_trip", label: "Round Trip" },
                      { value: "multi_city", label: "Multi-City" }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setTrip(t => {
                          const updates: Partial<Trip> = { tripType: opt.value as TripType, updatedAt: Date.now() };
                          if (opt.value === "multi_city" && (!t.multiCityLegs || t.multiCityLegs.length < 2)) {
                            updates.multiCityLegs = [
                              { id: generateId(), from: "", to: "", date: "", mode: "plane" },
                              { id: generateId(), from: "", to: "", date: "", mode: "plane" }
                            ];
                          }
                          return { ...t, ...updates };
                        })}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: trip.tripType === opt.value ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                          backgroundColor: trip.tripType === opt.value ? COLORS.accentLight : "white",
                          color: trip.tripType === opt.value ? COLORS.primaryDark : COLORS.textSecondary,
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer"
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Date Pickers - different UI for multi-city */}
                  {trip.tripType === "multi_city" ? (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>
                        Flight Legs
                      </div>
                      {(trip.multiCityLegs || []).map((leg, idx) => {
                        // Get the previous leg's date for min constraint
                        const prevLeg = idx > 0 ? (trip.multiCityLegs || [])[idx - 1] : null;
                        const minDate = prevLeg?.date || "";
                        
                        return (
                        <div key={leg.id} style={{ marginBottom: 12, padding: 12, backgroundColor: COLORS.bg, borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="From"
                            value={leg.from}
                            onChange={e => {
                              const newFrom = e.target.value;
                              setTrip(t => ({
                                ...t,
                                multiCityLegs: (t.multiCityLegs || []).map(l => l.id === leg.id ? { ...l, from: newFrom } : l),
                                updatedAt: Date.now()
                              }));
                            }}
                            style={{ padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
                          />
                          <input
                            type="text"
                            placeholder="To"
                            value={leg.to}
                            onChange={e => {
                              const newTo = e.target.value;
                              setTrip(t => ({
                                ...t,
                                multiCityLegs: (t.multiCityLegs || []).map(l => l.id === leg.id ? { ...l, to: newTo } : l),
                                updatedAt: Date.now()
                              }));
                            }}
                            style={{ padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
                          />
                          <PickerPopover
                            type="date"
                            value={leg.date}
                            min={minDate}
                            onChange={newDate => {
                              setTrip(t => ({
                                ...t,
                                multiCityLegs: (t.multiCityLegs || []).map(l => l.id === leg.id ? { ...l, date: newDate } : l),
                                updatedAt: Date.now()
                              }));
                            }}
                          />
                          {(trip.multiCityLegs || []).length > 2 && (
                            <button
                              onClick={() => setTrip(t => ({
                                ...t,
                                multiCityLegs: (t.multiCityLegs || []).filter(l => l.id !== leg.id),
                                updatedAt: Date.now()
                              }))}
                              style={{ padding: 6, borderRadius: 6, border: "none", backgroundColor: "#F5DEDA", color: "#C0392B", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            >
                              <X size={14} />
                            </button>
                          )}
                          </div>
                          <TransportModeSelector 
                            value={leg.mode || "plane"} 
                            onChange={mode => setTrip(t => ({
                              ...t,
                              multiCityLegs: (t.multiCityLegs || []).map(l => l.id === leg.id ? { ...l, mode } : l),
                              updatedAt: Date.now()
                            }))} 
                          />
                        </div>
                      );
                      })}
                      <button
                        onClick={() => setTrip(t => ({
                          ...t,
                          multiCityLegs: [...(t.multiCityLegs || []), { id: generateId(), from: "", to: "", date: "", mode: "plane" as TransportMode }],
                          updatedAt: Date.now()
                        }))}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: `2px dashed ${COLORS.border}`, backgroundColor: "transparent", color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                      >
                        <Plus size={14} /> Add Flight Leg
                      </button>
                    </div>
                  ) : (
                  <div style={{ display: "grid", gridTemplateColumns: trip.tripType === "one_way" ? "1fr" : "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                        Departure Date
                      </label>
                      <PickerPopover
                        type="date"
                        value={trip.departureDate || ""}
                        onChange={newDate => {
                          setTrip(t => {
                            const updatedLegs = t.legs.map((leg, idx) => {
                              if (leg.type === "flight" && idx === 0) {
                                return { ...leg, date: newDate };
                              }
                              if (leg.type === "hotel") {
                                return { ...leg, date: newDate };
                              }
                              if (leg.type === "car" && leg.title.includes("to") && leg.title.includes("Airport") && idx < t.legs.length / 2) {
                                return { ...leg, date: newDate };
                              }
                              return leg;
                            });
                            return { ...t, departureDate: newDate, legs: updatedLegs, updatedAt: Date.now() };
                          });
                        }}
                      />
                      <TransportModeSelector 
                        value={trip.departureMode || "plane"} 
                        onChange={mode => setTrip(t => ({ ...t, departureMode: mode, updatedAt: Date.now() }))} 
                      />
                    </div>
                    
                    {trip.tripType === "round_trip" && (
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                          Return Date
                        </label>
                        <PickerPopover
                          type="date"
                          value={trip.returnDate || ""}
                          onChange={newDate => {
                            setTrip(t => {
                              const flights = t.legs.filter(l => l.type === "flight");
                              const updatedLegs = t.legs.map((leg, idx) => {
                                if (leg.type === "flight" && flights.length > 1 && leg.id === flights[flights.length - 1].id) {
                                  return { ...leg, date: newDate };
                                }
                                if (leg.type === "hotel") {
                                  return { ...leg, endDate: newDate };
                                }
                                if (leg.type === "car" && idx >= t.legs.length / 2) {
                                  return { ...leg, date: newDate };
                                }
                                return leg;
                              });
                              return { ...t, returnDate: newDate, legs: updatedLegs, updatedAt: Date.now() };
                            });
                          }}
                        />
                        <TransportModeSelector 
                          value={trip.returnMode || "plane"} 
                          onChange={mode => setTrip(t => ({ ...t, returnMode: mode, updatedAt: Date.now() }))} 
                        />
                      </div>
                    )}
                  </div>
              )}
              {/* Done button to close editor */}
              {((trip.tripType === "multi_city" && (trip.multiCityLegs || []).length >= 2 && (trip.multiCityLegs || []).every(l => l.from && l.to && l.date)) || (trip.departureDate && (trip.tripType === "one_way" || trip.returnDate))) && (
                <button 
                  onClick={() => setIsEditingDates(false)}
                  style={{ 
                    width: "100%", 
                    marginTop: 12, 
                    padding: 10, 
                    borderRadius: 8, 
                    border: "none", 
                    backgroundColor: COLORS.primary, 
                    color: "white", 
                    fontSize: 13, 
                    fontWeight: 600, 
                    cursor: "pointer" 
                  }}
                >
                  Done
                </button>
              )}
            </div>
              );
            })()}
            
            {/* Missing Info Prompts - horizontal scroll */}
            <MissingInfoBar 
              missingItems={missingInfo}
              onAddInfo={() => {}}
              editingItem={editingItem}
              setEditingItem={setEditingItem}
              editValue={editValue}
              setEditValue={setEditValue}
              onSaveEdit={handleSaveEdit}
            />
            
            {/* Trip Summary & Checklist */}
            {(() => {
              // Exclude standalone legs from checklist totals - those are user-added extras
              const nonStandalone = trip.legs.filter(l => !l.standalone);
              const flights = nonStandalone.filter(l => l.type === "flight");
              const hotels = nonStandalone.filter(l => l.type === "hotel");
              const transport = nonStandalone.filter(l => !["flight", "hotel"].includes(l.type));
              
              // For multi-city, count by actual transport mode from multiCityLegs
              let flightLegsCount = 0;
              let trainLegsCount = 0;
              let busLegsCount = 0;
              let otherLegsCount = 0;
              
              if (trip.tripType === "multi_city" && trip.multiCityLegs?.length) {
                trip.multiCityLegs.forEach(leg => {
                  const mode = leg.mode || "plane";
                  if (mode === "plane") flightLegsCount++;
                  else if (mode === "rail") trainLegsCount++;
                  else if (mode === "bus") busLegsCount++;
                  else otherLegsCount++;
                });
              } else {
                // For one-way/round-trip, use expectedLegsCount as flights
                flightLegsCount = trip.tripType === "one_way" ? 1 : 2;
              }
              
              // Get primary transport mode for the trip
              const primaryMode: TransportMode = trip.departureMode || "plane";
              
              // Calculate expected number of travel legs (for transport calculation)
              const expectedLegsCount = trip.tripType === "one_way" ? 1 
                : trip.tripType === "round_trip" ? 2 
                : (trip.multiCityLegs || []).length;
              
              // Expected transport = 2 per travel leg (to terminal + from terminal)
              const expectedTransportCount = expectedLegsCount * 2;
              
              // Calculate trip length - use multi-city dates if applicable
              let tripDays = 0;
              if (trip.tripType === "multi_city" && trip.multiCityLegs?.length) {
                const sortedDates = trip.multiCityLegs.filter(l => l.date).map(l => l.date).sort();
                if (sortedDates.length >= 2) {
                  tripDays = Math.ceil((new Date(sortedDates[sortedDates.length - 1]).getTime() - new Date(sortedDates[0]).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                } else if (sortedDates.length === 1) {
                  tripDays = 1;
                }
              } else if (trip.departureDate && trip.returnDate) {
                tripDays = Math.ceil((new Date(trip.returnDate).getTime() - new Date(trip.departureDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
              } else if (trip.departureDate) {
                tripDays = 1;
              }
              
              // Calculate number of cities (unique destinations only - exclude starting city)
              const cities = new Set<string>();
              let startingCity: string | null = null;
              if (trip.tripType === "multi_city" && trip.multiCityLegs?.length) {
                startingCity = trip.multiCityLegs[0]?.from || null;
                trip.multiCityLegs.forEach(l => { if (l.to) cities.add(l.to); });
              } else {
                startingCity = flights[0]?.from || null;
                flights.forEach(f => { if (f.to) cities.add(f.to); });
              }
              // Remove starting city from count if it appears as a destination (round trip back home)
              if (startingCity) cities.delete(startingCity);
              
              // Count items with actual USER-entered info (not auto-populated from/to)
              const flightsBookedCount = flights.filter(f => f.flightNumber || f.airline || f.confirmationNumber || f.time).length;
              const hotelsBookedCount = hotels.filter(h => h.hotelName || h.confirmationNumber || h.location).length;
              const transportBookedCount = transport.filter(t => t.confirmationNumber || t.rentalCompany || t.time || (t.notes && t.title !== "Ride")).length;
              
              // For multi-city: determine lodging coverage per destination city
              // Only count hotels that have actual info filled in
              const hotelsWithInfo = hotels.filter(h => h.hotelName || h.confirmationNumber || h.location);
              let lodgingStatus: "yes" | "no" | "partial" = hotelsWithInfo.length > 0 ? "yes" : "no";
              if (trip.tripType === "multi_city" && cities.size > 0 && trip.multiCityLegs?.length) {
                const hotelCities = new Set<string>();
                const sortedMCLegs = [...trip.multiCityLegs].filter(l => l.date).sort((a, b) => a.date.localeCompare(b.date));
                hotels.forEach(h => {
                  if (h.location) { hotelCities.add(h.location); return; }
                  if (h.to) { hotelCities.add(h.to); return; }
                  // Derive city from hotel date using multiCityLegs schedule
                  if (h.date && sortedMCLegs.length > 0) {
                    let city: string | null = null;
                    for (const leg of sortedMCLegs) {
                      if (leg.date <= h.date) city = leg.to;
                      else break;
                    }
                    if (city) hotelCities.add(city);
                  }
                });
                const citiesWithHotel = [...cities].filter(c => hotelCities.has(c)).length;
                if (citiesWithHotel === 0) lodgingStatus = "no";
                else if (citiesWithHotel < cities.size) lodgingStatus = "partial";
                else lodgingStatus = "yes";
              }
              const lodgingColor = lodgingStatus === "yes" ? COLORS.booked : lodgingStatus === "partial" ? COLORS.pending : "#C0392B";
              const lodgingLabel = lodgingStatus === "yes" ? "Yes" : lodgingStatus === "partial" ? "Partial" : "No";
              
              // Color helper: red=0, orange=partial, green=all
              const getStatusColor = (booked: number, total: number) => {
                if (total === 0) return COLORS.textMuted;
                if (booked === 0) return "#C0392B"; // red
                if (booked < total) return COLORS.pending; // orange
                return COLORS.booked; // green
              };
              
              return (
                <div style={{ 
                  backgroundColor: COLORS.card, 
                  borderRadius: 16, 
                  padding: "20px", 
                  marginBottom: 16,
                  border: `1px solid ${COLORS.border}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                }}>
                  {/* Static Info Row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16, textAlign: "center", borderBottom: `1px solid ${COLORS.borderLight}`, paddingBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Travelers</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        {editingTravelers ? (
                          <input
                            type="number"
                            min={1}
                            defaultValue={trip.travelers}
                            autoFocus
                            style={{ width: 48, fontSize: 18, fontWeight: 700, color: COLORS.textMain, textAlign: "center", border: `1px solid ${COLORS.primary}`, borderRadius: 6, outline: "none", padding: "2px 4px", background: COLORS.inputBg }}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val > 0) setTrip(t => ({ ...t, travelers: val, updatedAt: Date.now() }));
                              setEditingTravelers(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingTravelers(false);
                            }}
                          />
                        ) : (
                          <>
                            <span style={{ fontSize: 18, color: COLORS.textMain, fontWeight: 700 }}>{trip.travelers}</span>
                            <button
                              onClick={() => setEditingTravelers(true)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                            >
                              <Edit2 size={11} color={COLORS.textMuted} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Cities</div>
                      <span style={{ fontSize: 18, color: COLORS.textMain, fontWeight: 700 }}>{cities.size}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Days</div>
                      <span style={{ fontSize: 18, color: COLORS.textMain, fontWeight: 700 }}>{tripDays > 0 ? tripDays : "—"}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Total Cost</div>
                      <span style={{ fontSize: 18, color: COLORS.textMain, fontWeight: 700 }}>{(() => {
                        const total = trip.legs.reduce((sum, l) => sum + (l.cost || 0), 0);
                        return total > 0 ? `$${total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "—";
                      })()}</span>
                    </div>
                  </div>
                  
                  {/* Booking Status - 2 column grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                    {/* Show flights if any */}
                    {flightLegsCount > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
                        <span style={{ 
                          fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: "center",
                          color: getStatusColor(flightsBookedCount, flightLegsCount),
                          backgroundColor: `${getStatusColor(flightsBookedCount, flightLegsCount)}15`,
                          padding: "3px 6px", borderRadius: 6
                        }}>
                          {`${flightsBookedCount}/${flightLegsCount}`}
                        </span>
                        {getModeIcon("plane", 16)}
                        <span style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 500 }}>Flights</span>
                      </div>
                    )}
                    {/* Show trains if any */}
                    {trainLegsCount > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
                        <span style={{ 
                          fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: "center",
                          color: getStatusColor(0, trainLegsCount),
                          backgroundColor: `${getStatusColor(0, trainLegsCount)}15`,
                          padding: "3px 6px", borderRadius: 6
                        }}>
                          {`0/${trainLegsCount}`}
                        </span>
                        {getModeIcon("rail", 16)}
                        <span style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 500 }}>Trains</span>
                      </div>
                    )}
                    {/* Show buses if any */}
                    {busLegsCount > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
                        <span style={{ 
                          fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: "center",
                          color: getStatusColor(0, busLegsCount),
                          backgroundColor: `${getStatusColor(0, busLegsCount)}15`,
                          padding: "3px 6px", borderRadius: 6
                        }}>
                          {`0/${busLegsCount}`}
                        </span>
                        {getModeIcon("bus", 16)}
                        <span style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 500 }}>Buses</span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
                      <span style={{ 
                        fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: "center",
                        color: lodgingColor,
                        backgroundColor: `${lodgingColor}15`,
                        padding: "3px 6px", borderRadius: 6
                      }}>
                        {lodgingLabel}
                      </span>
                      <Hotel size={16} color={lodgingColor} />
                      <span style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 500 }}>Lodging</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", backgroundColor: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.borderLight}` }}>
                      <span style={{ 
                        fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: "center",
                        color: getStatusColor(transportBookedCount, expectedTransportCount),
                        backgroundColor: `${getStatusColor(transportBookedCount, expectedTransportCount)}15`,
                        padding: "3px 6px", borderRadius: 6
                      }}>
                        {expectedTransportCount > 0 ? `${transportBookedCount}/${expectedTransportCount}` : "—"}
                      </span>
                      <Car size={16} color={getStatusColor(transportBookedCount, expectedTransportCount)} />
                      <span style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 500 }}>Transport</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {/* Day-by-Day View */}
            {(() => {
              // For multi-city, use first and last leg dates
              let viewDepartureDate = trip.departureDate;
              let viewReturnDate = trip.returnDate;
              if (trip.tripType === "multi_city" && trip.multiCityLegs?.length) {
                const sortedDates = trip.multiCityLegs.filter(l => l.date).map(l => l.date).sort();
                if (sortedDates.length > 0) {
                  viewDepartureDate = sortedDates[0];
                  viewReturnDate = sortedDates[sortedDates.length - 1];
                }
              }
              return (
                <DayByDayView 
                  legs={trip.legs} 
                  onUpdateLeg={handleUpdateLeg} 
                  onDeleteLeg={handleDeleteLeg}
                  onAddLeg={handleAddLeg}
                  expandedLegs={expandedLegs} 
                  toggleLegExpand={toggleLegExpand}
                  departureDate={viewDepartureDate}
                  returnDate={viewReturnDate}
                  primaryTransportMode={trip.departureMode || "plane"}
                  multiCityLegs={trip.tripType === "multi_city" ? trip.multiCityLegs : undefined}
                  travelers={trip.travelers}
                />
              );
            })()}
          </>
        )}
      </div>
      {showAddModal && <AddLegModal onAdd={handleAddLeg} onClose={() => setShowAddModal(false)} />}

      {/* Related Apps */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.borderLight}` }} className="no-print">
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Related Apps</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { icon: <Shield size={16} />, label: "Travel Safety Ratings", desc: "Check safety scores for destinations worldwide" },
            { icon: <ClipboardList size={16} />, label: "Travel Checklist Generator", desc: "Generate packing & prep checklists for your trip" },
          ].map((app, i) => (
            <button key={i} className="btn-press" style={{
              flex: "1 1 0", minWidth: 200, display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 12,
              border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card,
              cursor: "pointer", textAlign: "left",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${COLORS.primary}15`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.primary, flexShrink: 0 }}>
                {app.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textMain }}>{app.label}</div>
                <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>{app.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer Buttons */}
      <div style={{ 
        padding: "16px 20px", 
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: COLORS.card,
        display: "flex",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap"
      }} className="no-print">
        <button className="btn-press" style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowSubscribeModal(true)}>
          <Mail size={15} /> Subscribe
        </button>
        <button className="btn-press" style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={handleReset}>
          <RotateCcw size={15} /> Reset
        </button>
        <button className="btn-press" style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Heart size={15} /> Donate
        </button>
        <button className="btn-press" style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowFeedbackModal(true)}>
          <MessageSquare size={15} /> Feedback
        </button>
        <button className="btn-press" style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.card, color: COLORS.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} onClick={() => window.print()}>
          <Printer size={15} /> Print
        </button>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setShowSubscribeModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 20, padding: 24, maxWidth: 400, width: "100%" }} onClick={e => e.stopPropagation()}>
            <button style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer" }} onClick={() => setShowSubscribeModal(false)}><X size={20} /></button>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: COLORS.textMain }}>Stay Updated</div>
            <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 }}>Get trip planning tips and product updates.</div>
            {subscribeStatus === "success" ? (
              <div style={{ textAlign: "center", padding: 20, color: COLORS.primary, fontWeight: 600 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                {subscribeMessage}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: COLORS.textMain }}>Email Address</label>
                  <input style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box", outline: "none" }} placeholder="you@example.com" value={subscribeEmail} onChange={e => setSubscribeEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSubscribe(); }} />
                </div>
                {subscribeStatus === "error" && (
                  <div style={{ color: COLORS.urgent, fontSize: 14, marginBottom: 16, textAlign: "center" }}>{subscribeMessage}</div>
                )}
                <button className="btn-press" onClick={handleSubscribe} disabled={subscribeStatus === "loading"} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", backgroundColor: COLORS.primary, color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                  {subscribeStatus === "loading" ? "Subscribing..." : "Subscribe"}
                </button>
                <div style={{ fontSize: 11, color: COLORS.textSecondary, textAlign: "center", marginTop: 12, lineHeight: 1.4 }}>
                  By subscribing, you agree to receive emails. Unsubscribe anytime.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }} onClick={() => setShowFeedbackModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 20, padding: 24, maxWidth: 400, width: "100%" }} onClick={e => e.stopPropagation()}>
            <button style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer" }} onClick={() => setShowFeedbackModal(false)}><X size={20} /></button>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: COLORS.textMain }}>Feedback</div>
            <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 }}>Help us improve the Trip Planner.</div>
            {feedbackStatus === "success" ? (
              <div style={{ textAlign: "center", padding: 20, color: COLORS.primary, fontWeight: 600 }}>Thanks for your feedback!</div>
            ) : (
              <>
                <textarea style={{ width: "100%", padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box", outline: "none", height: 120, resize: "none", fontFamily: "inherit" }} placeholder="Tell us what you think..." value={feedbackText} onChange={e => setFeedbackText(e.target.value)} />
                {feedbackStatus === "error" && (
                  <div style={{ color: COLORS.urgent, fontSize: 14, marginBottom: 10 }}>Failed to send. Please try again.</div>
                )}
                <button className="btn-press" onClick={handleFeedbackSubmit} disabled={feedbackStatus === "submitting" || !feedbackText.trim()} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", backgroundColor: COLORS.primary, color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 12 }}>
                  {feedbackStatus === "submitting" ? "Sending..." : "Send Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
