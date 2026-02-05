import React, { useState, useEffect, useMemo } from "react";
import {
  Plane, Hotel, Car, Train, Bus, Ship, MapPin, Calendar, Clock, 
  CheckCircle2, Circle, AlertCircle, Plus, X, ChevronDown, ChevronUp,
  Edit3, Trash2, Save, RotateCcw, Sparkles, ArrowRight, Loader2, Check, FileText, Users
} from "lucide-react";

// Add spinner animation
const spinnerStyle = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = spinnerStyle;
  document.head.appendChild(styleEl);
}

const COLORS = {
  primary: "#56C596",
  primaryDark: "#3aa87b",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  textMain: "#1A1A1A",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
  inputBg: "#F9FAFB",
  accentLight: "#E6F7F0",
  booked: "#10B981",
  bookedBg: "#D1FAE5",
  pending: "#F59E0B",
  pendingBg: "#FEF3C7",
  urgent: "#EF4444",
  urgentBg: "#FEE2E2",
  flight: "#3B82F6",
  flightBg: "#DBEAFE",
  hotel: "#8B5CF6",
  hotelBg: "#EDE9FE",
  transport: "#F97316",
  transportBg: "#FFEDD5",
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
  endDate?: string;
  from?: string;
  to?: string;
  location?: string;
  confirmationNumber?: string;
  notes?: string;
  flightNumber?: string;
  airline?: string;
  hotelName?: string;
}

type TripType = "one_way" | "round_trip" | "multi_city";

interface Trip {
  id: string;
  name: string;
  tripType: TripType;
  legs: TripLeg[];
  travelers: number;
  departureDate?: string;
  returnDate?: string;
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
}

const STORAGE_KEY = "TRIP_PLANNER_DATA";
const generateId = () => Math.random().toString(36).substr(2, 9);

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
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

const TripLegCard = ({ leg, onUpdate, onDelete, isExpanded, onToggleExpand }: { leg: TripLeg; onUpdate: (u: Partial<TripLeg>) => void; onDelete: () => void; isExpanded: boolean; onToggleExpand: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(leg);
  const legColors = getLegColor(leg.type);

  const cycleStatus = () => {
    const order: BookingStatus[] = ["pending", "booked", "urgent"];
    const next = order[(order.indexOf(leg.status) + 1) % order.length];
    onUpdate({ status: next });
  };

  if (isEditing) {
    return (
      <div style={{ backgroundColor: COLORS.card, borderRadius: 16, border: `2px solid ${legColors.main}`, padding: 20, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Edit {leg.type}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onUpdate(editData); setIsEditing(false); }} style={{ padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: COLORS.primary, color: "white", fontWeight: 600, cursor: "pointer" }}><Save size={16} /> Save</button>
            <button onClick={() => setIsEditing(false)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, backgroundColor: "white", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} placeholder="Title" style={{ padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, gridColumn: "1 / -1" }} />
          <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} style={{ padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}` }} />
          <input type="time" value={editData.time || ""} onChange={e => setEditData({ ...editData, time: e.target.value })} style={{ padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}` }} />
          <input value={editData.from || ""} onChange={e => setEditData({ ...editData, from: e.target.value })} placeholder="From" style={{ padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}` }} />
          <input value={editData.to || ""} onChange={e => setEditData({ ...editData, to: e.target.value })} placeholder="To" style={{ padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}` }} />
          <input value={editData.confirmationNumber || ""} onChange={e => setEditData({ ...editData, confirmationNumber: e.target.value })} placeholder="Confirmation #" style={{ padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, gridColumn: "1 / -1" }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: COLORS.card, borderRadius: 16, border: `1px solid ${leg.status === "booked" ? COLORS.booked : COLORS.border}`, borderLeft: `4px solid ${legColors.main}`, marginBottom: 12 }}>
      <div onClick={onToggleExpand} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: legColors.bg, color: legColors.main, display: "flex", alignItems: "center", justifyContent: "center" }}>{getLegIcon(leg.type, 22)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.textMain, marginBottom: 4 }}>{leg.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {leg.date && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: COLORS.textSecondary }}><Calendar size={14} />{formatDate(leg.date)}</span>}
            {leg.time && <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: COLORS.textSecondary }}><Clock size={14} />{leg.time}</span>}
            {leg.flightNumber && <span style={{ fontSize: 13, color: legColors.main, fontWeight: 600 }}>{leg.flightNumber}</span>}
          </div>
        </div>
        <StatusIcon status={leg.status} />
        {leg.status === "pending" && <AddDetailsButton onClick={() => setIsEditing(true)} />}
        <div style={{ color: COLORS.textSecondary }}>{isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
      </div>
      {isExpanded && (
        <div style={{ padding: "0 20px 16px", borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {leg.from && leg.to && <div><div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Route</div><div style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>{leg.from} <ArrowRight size={14} /> {leg.to}</div></div>}
            {leg.location && <div><div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Location</div><div style={{ fontSize: 14 }}>{leg.location}</div></div>}
            {leg.confirmationNumber && <div><div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginBottom: 4, textTransform: "uppercase" }}>Confirmation #</div><div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 600 }}>{leg.confirmationNumber}</div></div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={e => { e.stopPropagation(); setIsEditing(true); }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, backgroundColor: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Edit3 size={14} /> Edit</button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.urgent}`, backgroundColor: "white", color: COLORS.urgent, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Trash2 size={14} /> Delete</button>
          </div>
        </div>
      )}
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

// Category icon component for day guide
const CategoryIcon = ({ 
  type, hasItem, isBooked, isExpanded, onClick, label 
}: { 
  type: "flight" | "hotel" | "transport" | "activity"; 
  hasItem: boolean; 
  isBooked: boolean; 
  isExpanded: boolean;
  onClick: () => void;
  label?: string;
}) => {
  const config = {
    flight: { icon: Plane, color: COLORS.flight, bg: COLORS.flightBg, name: "Flight" },
    hotel: { icon: Hotel, color: COLORS.hotel, bg: COLORS.hotelBg, name: "Hotel" },
    transport: { icon: Car, color: COLORS.transport, bg: COLORS.transportBg, name: "Transport" },
    activity: { icon: MapPin, color: "#EC4899", bg: "#FCE7F3", name: "Activity" }
  };
  const { icon: Icon, color, bg, name } = config[type];
  
  return (
    <div 
      onClick={onClick}
      style={{ 
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        cursor: hasItem ? "pointer" : "default",
        opacity: hasItem ? 1 : 0.3
      }}
    >
      <div style={{ 
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: hasItem ? bg : COLORS.borderLight,
        border: isExpanded ? `2px solid ${color}` : `1px solid ${hasItem ? color : COLORS.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative"
      }}>
        <Icon size={20} color={hasItem ? color : COLORS.textMuted} />
        {hasItem && (
          <div style={{ 
            position: "absolute", top: -4, right: -4,
            width: 16, height: 16, borderRadius: "50%",
            backgroundColor: isBooked ? COLORS.booked : COLORS.pending,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {isBooked ? <Check size={10} color="white" /> : <Circle size={8} color="white" />}
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: hasItem ? COLORS.textMain : COLORS.textMuted, fontWeight: 500 }}>
        {label || name}
      </span>
    </div>
  );
};

// Day-by-Day View Component - Horizontal icon guide layout
const DayByDayView = ({ legs, onUpdateLeg, onDeleteLeg, expandedLegs, toggleLegExpand, departureDate, returnDate }: { 
  legs: TripLeg[]; 
  onUpdateLeg: (id: string, u: Partial<TripLeg>) => void; 
  onDeleteLeg: (id: string) => void;
  expandedLegs: Set<string>;
  toggleLegExpand: (id: string) => void;
  departureDate?: string;
  returnDate?: string;
}) => {
  const [expandedCategory, setExpandedCategory] = useState<Record<string, string | null>>({});

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
      activities: TripLeg[] 
    }> = {};
    const noDateLegs: TripLeg[] = [];
    
    allDays.forEach(day => { 
      groups[day] = { flights: [], hotels: [], transport: [], activities: [] }; 
    });
    
    legs.forEach(leg => {
      if (leg.type === "hotel" && leg.date) {
        const checkIn = new Date(leg.date + "T00:00:00");
        const checkOut = leg.endDate ? new Date(leg.endDate + "T00:00:00") : checkIn;
        const current = new Date(checkIn);
        let isFirst = true;
        while (current < checkOut) {
          const dateStr = current.toISOString().split("T")[0];
          if (groups[dateStr]) {
            groups[dateStr].hotels.push({ leg, isContinuation: !isFirst });
          }
          current.setDate(current.getDate() + 1);
          isFirst = false;
        }
      } else if (leg.date && groups[leg.date]) {
        if (leg.type === "flight") groups[leg.date].flights.push(leg);
        else if (["car", "train", "bus", "ferry"].includes(leg.type)) groups[leg.date].transport.push(leg);
        else groups[leg.date].activities.push(leg);
      } else if (!leg.date) {
        noDateLegs.push(leg);
      }
    });
    
    return { groups, sortedDates: allDays, noDateLegs };
  }, [legs, allDays]);

  const formatDayHeader = (dateStr: string, dayNum: number): string => {
    try {
      const date = new Date(dateStr + "T00:00:00");
      return `Day ${dayNum} · ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
    } catch { return `Day ${dayNum}`; }
  };

  const toggleCategory = (date: string, category: string) => {
    setExpandedCategory(prev => ({
      ...prev,
      [date]: prev[date] === category ? null : category
    }));
  };

  return (
    <div>
      {legsByDate.sortedDates.map((date, idx) => {
        const dayData = legsByDate.groups[date];
        const expanded = expandedCategory[date];
        
        const flightBooked = dayData.flights.some(f => f.status === "booked");
        const hotelBooked = dayData.hotels.some(h => h.leg.status === "booked");
        const transportBooked = dayData.transport.some(t => t.status === "booked");
        const activityBooked = dayData.activities.some(a => a.status === "booked");
        
        const hasAny = dayData.flights.length > 0 || dayData.hotels.length > 0 || 
                       dayData.transport.length > 0 || dayData.activities.length > 0;
        const allBooked = hasAny && 
          (dayData.flights.length === 0 || flightBooked) &&
          (dayData.hotels.length === 0 || hotelBooked) &&
          (dayData.transport.length === 0 || transportBooked) &&
          (dayData.activities.length === 0 || activityBooked);
        
        return (
          <div key={date} style={{ 
            marginBottom: 12, 
            backgroundColor: COLORS.card, 
            borderRadius: 12, 
            border: `1px solid ${allBooked ? COLORS.booked : COLORS.border}`,
            overflow: "hidden"
          }}>
            {/* Day Header */}
            <div style={{ 
              display: "flex", alignItems: "center", gap: 10, 
              padding: "10px 14px",
              backgroundColor: allBooked ? COLORS.bookedBg : COLORS.borderLight,
              borderBottom: `1px solid ${COLORS.border}`
            }}>
              <div style={{ 
                width: 28, height: 28, borderRadius: "50%", 
                backgroundColor: allBooked ? COLORS.booked : hasAny ? COLORS.pending : COLORS.textMuted, 
                color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 12
              }}>
                {idx + 1}
              </div>
              <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.textMain }}>
                {formatDayHeader(date, idx + 1)}
              </span>
              {allBooked && <CheckCircle2 size={18} color={COLORS.booked} style={{ marginLeft: "auto" }} />}
            </div>
            
            {/* Horizontal Icon Guide */}
            <div style={{ 
              display: "flex", justifyContent: "space-around", 
              padding: "12px 8px",
              borderBottom: expanded ? `1px solid ${COLORS.border}` : "none"
            }}>
              <CategoryIcon 
                type="flight" 
                hasItem={dayData.flights.length > 0}
                isBooked={flightBooked}
                isExpanded={expanded === "flight"}
                onClick={() => dayData.flights.length > 0 && toggleCategory(date, "flight")}
              />
              <CategoryIcon 
                type="hotel" 
                hasItem={dayData.hotels.length > 0}
                isBooked={hotelBooked}
                isExpanded={expanded === "hotel"}
                onClick={() => dayData.hotels.length > 0 && toggleCategory(date, "hotel")}
                label={dayData.hotels.some(h => h.isContinuation) ? "Staying" : "Hotel"}
              />
              <CategoryIcon 
                type="transport" 
                hasItem={dayData.transport.length > 0}
                isBooked={transportBooked}
                isExpanded={expanded === "transport"}
                onClick={() => dayData.transport.length > 0 && toggleCategory(date, "transport")}
              />
              <CategoryIcon 
                type="activity" 
                hasItem={dayData.activities.length > 0}
                isBooked={activityBooked}
                isExpanded={expanded === "activity"}
                onClick={() => dayData.activities.length > 0 && toggleCategory(date, "activity")}
              />
            </div>
            
            {/* Expanded Details */}
            {expanded && (
              <div style={{ padding: "8px 12px" }}>
                {expanded === "flight" && dayData.flights.map(leg => (
                  <TripLegCard key={leg.id} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} />
                ))}
                {expanded === "hotel" && dayData.hotels.map(({ leg, isContinuation }) => (
                  isContinuation ? (
                    <div key={`${leg.id}-${date}`} style={{ padding: "10px 14px", backgroundColor: COLORS.hotelBg, borderRadius: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <Hotel size={18} color={COLORS.hotel} />
                      <span style={{ fontSize: 13, color: COLORS.hotel, fontWeight: 500 }}>Staying at {leg.hotelName || leg.location || "hotel"}</span>
                      {leg.status === "booked" && <CheckCircle2 size={14} color={COLORS.booked} style={{ marginLeft: "auto" }} />}
                    </div>
                  ) : (
                    <TripLegCard key={leg.id} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} />
                  )
                ))}
                {expanded === "transport" && dayData.transport.map(leg => (
                  <TripLegCard key={leg.id} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} />
                ))}
                {expanded === "activity" && dayData.activities.map(leg => (
                  <TripLegCard key={leg.id} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
      
      {/* Legs without dates */}
      {legsByDate.noDateLegs.length > 0 && (
        <div style={{ marginBottom: 12, backgroundColor: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", backgroundColor: COLORS.borderLight, borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <Calendar size={18} color={COLORS.textMuted} />
            <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.textSecondary }}>No Date Set</span>
          </div>
          <div style={{ padding: "8px 12px" }}>
            {legsByDate.noDateLegs.map(leg => (
              <TripLegCard key={leg.id} leg={leg} onUpdate={u => onUpdateLeg(leg.id, u)} onDelete={() => onDeleteLeg(leg.id)} isExpanded={expandedLegs.has(leg.id)} onToggleExpand={() => toggleLegExpand(leg.id)} />
            ))}
          </div>
        </div>
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
            <input type="date" value={formData.date || ""} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} />
            {type !== "hotel" ? <input type="time" value={formData.time || ""} onChange={e => setFormData({ ...formData, time: e.target.value })} style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} /> : <input type="date" value={formData.endDate || ""} onChange={e => setFormData({ ...formData, endDate: e.target.value })} placeholder="Check-out" style={{ padding: 12, borderRadius: 10, border: `1px solid ${COLORS.border}` }} />}
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
      <div style={{ 
        display: "flex", 
        gap: 8, 
        overflowX: "auto", 
        paddingBottom: 8,
        WebkitOverflowScrolling: "touch"
      }}>
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
    </div>
  );
};

export default function TripPlanner({ initialData }: { initialData?: any }) {
  const [trip, setTrip] = useState<Trip>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const d = JSON.parse(s); if (d.trip) return d.trip; } } catch {}
    return { id: generateId(), name: "My Trip", tripType: "round_trip", legs: [], travelers: 1, createdAt: Date.now(), updatedAt: Date.now() };
  });
  const [tripDescription, setTripDescription] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedLegs, setExpandedLegs] = useState<Set<string>>(new Set());
  const [inputMode, setInputMode] = useState<"freeform" | "manual">("freeform");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ trip, timestamp: Date.now() })); } catch {} }, [trip]);
  
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
    
    // 1. Trip type (most important for understanding the trip)
    // We infer this from flights, but could ask if unclear
    
    // 2. Departure date (if outbound flight has no date)
    if (outboundFlight && !outboundFlight.date) {
      items.push({ 
        id: `date-${outboundFlight.id}`, 
        type: "departure_date", 
        label: "Add departure date", 
        icon: <Calendar size={14} />, 
        legId: outboundFlight.id, 
        priority: 1 
      });
    }
    
    // 3. Return date (if round trip and return flight has no date)
    if (returnFlight && !returnFlight.date) {
      items.push({ 
        id: `date-${returnFlight.id}`, 
        type: "return_date", 
        label: "Add return date", 
        icon: <Calendar size={14} />, 
        legId: returnFlight.id, 
        priority: 2 
      });
    }
    
    // 4. Number of travelers
    if (!trip.travelers || trip.travelers < 1) {
      items.push({ 
        id: "travelers", 
        type: "travelers", 
        label: "Add travelers", 
        icon: <Users size={14} />, 
        priority: 3 
      });
    }
    
    // 5. Flight numbers (for booked flights)
    flights.forEach(f => {
      if (!f.flightNumber && f.status === "booked") {
        items.push({ 
          id: `flight-${f.id}`, 
          type: "flight_number", 
          label: `Add flight # for ${f.from || ""} → ${f.to || ""}`.trim(), 
          icon: <Plane size={14} />, 
          legId: f.id, 
          priority: 4 
        });
      }
    });
    
    // 6. Hotel name (only if hotel exists but no name)
    hotels.forEach(h => {
      if (!h.hotelName) {
        items.push({ 
          id: `hotel-${h.id}`, 
          type: "hotel_name", 
          label: "Add hotel name", 
          icon: <Hotel size={14} />, 
          legId: h.id, 
          priority: 5 
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
          priority: 6 
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
    } else if (item.legId) {
      const updates: Partial<TripLeg> = {};
      if (item.type === "departure_date") updates.date = editValue;
      if (item.type === "return_date") updates.endDate = editValue;
      if (item.type === "flight_number") updates.flightNumber = editValue;
      if (item.type === "hotel_name") updates.hotelName = editValue;
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

  const handleParseDescription = async () => {
    if (!tripDescription.trim() || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // Call AI-powered parsing endpoint
      const response = await fetch("/api/parse-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tripDescription })
      });
      
      if (!response.ok) {
        throw new Error("Failed to analyze trip");
      }
      
      const data = await response.json();
      const parsed = data.legs || [];
      
      if (parsed.length > 0) {
        const newLegs: TripLeg[] = parsed.map((l: any) => ({ 
          id: generateId(), 
          type: l.type || "other", 
          status: l.status || "pending", 
          title: l.title || "", 
          date: l.date || "", 
          time: l.time,
          endDate: l.endDate,
          from: l.from, 
          to: l.to, 
          location: l.location,
          flightNumber: l.flightNumber,
          airline: l.airline,
          hotelName: l.hotelName,
          confirmationNumber: l.confirmationNumber
        }));
        setTrip(t => ({ ...t, legs: [...t.legs, ...newLegs], updatedAt: Date.now() }));
        setTripDescription("");
      }
    } catch (error) {
      console.error("Failed to parse trip:", error);
      alert("Failed to analyze trip. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddLeg = (legData: Partial<TripLeg>) => {
    const newLeg: TripLeg = { id: generateId(), type: legData.type || "other", status: legData.status || "pending", title: legData.title || "", date: legData.date || "", time: legData.time, endDate: legData.endDate, from: legData.from, to: legData.to, location: legData.location, confirmationNumber: legData.confirmationNumber, flightNumber: legData.flightNumber, airline: legData.airline, hotelName: legData.hotelName, notes: legData.notes };
    setTrip(t => ({ ...t, legs: [...t.legs, newLeg], updatedAt: Date.now() }));
  };

  const handleUpdateLeg = (legId: string, updates: Partial<TripLeg>) => setTrip(t => ({ ...t, legs: t.legs.map(l => l.id === legId ? { ...l, ...updates } : l), updatedAt: Date.now() }));
  const handleDeleteLeg = (legId: string) => { setTrip(t => ({ ...t, legs: t.legs.filter(l => l.id !== legId), updatedAt: Date.now() })); setExpandedLegs(p => { const n = new Set(p); n.delete(legId); return n; }); };
  const toggleLegExpand = (legId: string) => setExpandedLegs(p => { const n = new Set(p); n.has(legId) ? n.delete(legId) : n.add(legId); return n; });
  const handleReset = () => { if (confirm("Clear all trip data?")) { setTrip({ id: generateId(), name: "My Trip", tripType: "round_trip", legs: [], travelers: 1, createdAt: Date.now(), updatedAt: Date.now() }); setTripDescription(""); setExpandedLegs(new Set()); } };

  const sortedLegs = useMemo(() => [...trip.legs].sort((a, b) => { if (!a.date && !b.date) return 0; if (!a.date) return 1; if (!b.date) return -1; return a.date.localeCompare(b.date); }), [trip.legs]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: COLORS.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <div style={{ backgroundColor: COLORS.primary, padding: "24px 20px", color: "white" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}><Plane size={28} />Trip Planner</h1><p style={{ margin: "4px 0 0", fontSize: 14, opacity: 0.9 }}>Organize your travel reservations</p></div>
          {trip.legs.length > 0 && <button onClick={handleReset} style={{ padding: "8px 12px", borderRadius: 8, border: "none", backgroundColor: "rgba(255,255,255,0.2)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><RotateCcw size={16} /> Reset</button>}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
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
              return datesComplete ? (
                // Collapsed view - just show summary
                <div 
                  onClick={() => setTrip(t => ({ ...t, departureDate: undefined, returnDate: undefined, updatedAt: Date.now() }))}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={16} color={COLORS.primary} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>
                        {formatDate(trip.departureDate!)}
                      </span>
                    </div>
                    {trip.tripType !== "one_way" && trip.returnDate && (
                      <>
                        <ArrowRight size={14} color={COLORS.textMuted} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>
                          {formatDate(trip.returnDate)}
                        </span>
                      </>
                    )}
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
                        onClick={() => setTrip(t => ({ ...t, tripType: opt.value as TripType, updatedAt: Date.now() }))}
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
                  
                  {/* Date Pickers */}
                  <div style={{ display: "grid", gridTemplateColumns: trip.tripType === "one_way" ? "1fr" : "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                        Departure Date
                      </label>
                      <input
                        type="date"
                        value={trip.departureDate || ""}
                        onChange={e => {
                          const newDate = e.target.value;
                          // Update trip departure date and sync to outbound flight
                      setTrip(t => {
                        const updatedLegs = t.legs.map((leg, idx) => {
                          if (leg.type === "flight" && idx === 0) {
                            return { ...leg, date: newDate };
                          }
                          if (leg.type === "hotel") {
                            return { ...leg, date: newDate };
                          }
                          // Transport to airport on departure day
                          if (leg.type === "car" && leg.title.includes("to") && leg.title.includes("Airport") && idx < t.legs.length / 2) {
                            return { ...leg, date: newDate };
                          }
                          return leg;
                        });
                        return { ...t, departureDate: newDate, legs: updatedLegs, updatedAt: Date.now() };
                      });
                    }}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 10,
                      border: `1px solid ${COLORS.border}`,
                      fontSize: 14,
                      boxSizing: "border-box"
                    }}
                  />
                </div>
                
                {trip.tripType !== "one_way" && (
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 6 }}>
                      Return Date
                    </label>
                    <input
                      type="date"
                      value={trip.returnDate || ""}
                      onChange={e => {
                        const newDate = e.target.value;
                        // Update trip return date and sync to return flight
                        setTrip(t => {
                          const flights = t.legs.filter(l => l.type === "flight");
                          const updatedLegs = t.legs.map((leg, idx) => {
                            // Return flight (last flight)
                            if (leg.type === "flight" && flights.length > 1 && leg.id === flights[flights.length - 1].id) {
                              return { ...leg, date: newDate };
                            }
                            // Hotel checkout
                            if (leg.type === "hotel") {
                              return { ...leg, endDate: newDate };
                            }
                            // Transport on return day
                            if (leg.type === "car" && idx >= t.legs.length / 2) {
                              return { ...leg, date: newDate };
                            }
                            return leg;
                          });
                          return { ...t, returnDate: newDate, legs: updatedLegs, updatedAt: Date.now() };
                        });
                      }}
                      style={{
                        width: "100%",
                        padding: 12,
                        borderRadius: 10,
                        border: `1px solid ${COLORS.border}`,
                        fontSize: 14,
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                )}
              </div>
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
            
            {/* Trip Summary Bar */}
            <div style={{ 
              backgroundColor: COLORS.card, 
              borderRadius: 12, 
              padding: "14px 16px", 
              marginBottom: 16,
              border: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={16} color={COLORS.textSecondary} />
                  <span style={{ fontSize: 13, color: COLORS.textMain }}>{trip.travelers} traveler{trip.travelers !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Plane size={16} color={COLORS.flight} />
                  <span style={{ fontSize: 13, color: COLORS.textMain }}>{trip.legs.filter(l => l.type === "flight").length} flight{trip.legs.filter(l => l.type === "flight").length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Hotel size={16} color={COLORS.hotel} />
                  <span style={{ fontSize: 13, color: COLORS.textMain }}>{trip.legs.filter(l => l.type === "hotel").length} hotel{trip.legs.filter(l => l.type === "hotel").length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Car size={16} color={COLORS.transport} />
                  <span style={{ fontSize: 13, color: COLORS.textMain }}>{trip.legs.filter(l => !["flight", "hotel"].includes(l.type)).length} transport</span>
                </div>
              </div>
              <button onClick={() => setShowAddModal(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", backgroundColor: COLORS.primary, color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Plus size={16} /> Add Flight, Hotel, etc.</button>
            </div>
            
            {/* Day-by-Day View */}
            <DayByDayView 
              legs={trip.legs} 
              onUpdateLeg={handleUpdateLeg} 
              onDeleteLeg={handleDeleteLeg} 
              expandedLegs={expandedLegs} 
              toggleLegExpand={toggleLegExpand}
              departureDate={trip.departureDate}
              returnDate={trip.returnDate} 
            />
          </>
        )}
      </div>
      {showAddModal && <AddLegModal onAdd={handleAddLeg} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
