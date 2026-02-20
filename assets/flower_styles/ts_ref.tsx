import React, { useState, useEffect, useMemo } from 'react';
import { Search, Shield, AlertTriangle, AlertCircle, CheckCircle, Info, MapPin, Calendar, ExternalLink, Globe, ChevronDown, ChevronUp, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Mail, RotateCcw, Heart, MessageSquare, Printer, X } from 'lucide-react';

// Brand Color Palette - Soft Purple Reference Palette
const COLORS = {
  // Backgrounds
  cream: '#F6F7FB',  // Light grey page background
  white: '#FFFFFF',  // Card background
  
  // Brand Colors - Soft Purple accent
  orange: '#6D5EF9', // Primary accent
  lime: '#A78BFA',   // Secondary accent
  green: '#16A34A',  // Dark green
  navy: '#111827',   // Near black for text
  plum: '#7C3AED',   // Purple depth
  blue: '#4F46E5',   // Indigo accent
  lavender: '#F4F0FF', // Light purple wash
  
  // Text Colors
  textMain: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  
  // Slate scale for UI elements
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Functional Mappings with full style objects
  safe: { bg: '#EAFBF2', text: '#16A34A', border: '#BBF7D0', icon: '#16A34A' },
  warning: { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA', icon: '#EA580C' },
  danger: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5', icon: '#DC2626' },
  caution: { bg: '#FEFCE8', text: '#CA8A04', border: '#FDE68A', icon: '#CA8A04' },
  neutral: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', icon: '#475569' },
  
  // Primary action color
  primary: '#6D5EF9',
};

const UI = {
  radius: {
    sm: '10px',
    md: '14px',
    lg: '18px',
    xl: '24px',
    pill: '9999px',
  },
  shadow: {
    card: '0 10px 30px rgba(17, 24, 39, 0.08)',
    soft: '0 6px 18px rgba(17, 24, 39, 0.08)',
    input: '0 8px 24px rgba(109, 94, 249, 0.14)',
  },
};

// API base URL for tracking
const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? '' 
  : 'https://travel-checklist-q79n.onrender.com';

// Analytics tracking helper
const trackEvent = (event: string, data: Record<string, any> = {}) => {
  try {
    fetch(`${API_BASE}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data: { ...data, timestamp: new Date().toISOString() } }),
    }).catch((err) => console.error('[trackEvent] Failed:', err));
  } catch (e) {
    console.error('[trackEvent] Error:', e);
  }
};

// State Department Advisory Levels
const ADVISORY_LEVELS = {
  1: { label: 'Exercise Normal Precautions', color: COLORS.safe.text, bgColor: COLORS.safe.bg, style: COLORS.safe, icon: CheckCircle },
  2: { label: 'Exercise Increased Caution', color: COLORS.caution.text, bgColor: COLORS.caution.bg, style: COLORS.caution, icon: Info },
  3: { label: 'Reconsider Travel', color: COLORS.warning.text, bgColor: COLORS.warning.bg, style: COLORS.warning, icon: AlertTriangle },
  4: { label: 'Do Not Travel', color: COLORS.danger.text, bgColor: COLORS.danger.bg, style: COLORS.danger, icon: AlertCircle },
};

// City coordinates for nearby city calculations (lat, lng)
const CITY_COORDINATES: Record<string, { lat: number; lng: number; name: string; country: string }> = {
  // Colombia
  'medellin': { lat: 6.2442, lng: -75.5812, name: 'Medellín', country: 'Colombia' },
  'bogota': { lat: 4.7110, lng: -74.0721, name: 'Bogotá', country: 'Colombia' },
  'cartagena': { lat: 10.3910, lng: -75.4794, name: 'Cartagena', country: 'Colombia' },
  'cali': { lat: 3.4516, lng: -76.5320, name: 'Cali', country: 'Colombia' },
  'barranquilla': { lat: 10.9685, lng: -74.7813, name: 'Barranquilla', country: 'Colombia' },
  
  // Venezuela
  'caracas': { lat: 10.4806, lng: -66.9036, name: 'Caracas', country: 'Venezuela' },
  'maracaibo': { lat: 10.6544, lng: -71.6390, name: 'Maracaibo', country: 'Venezuela' },
  'valencia': { lat: 10.1620, lng: -67.9993, name: 'Valencia', country: 'Venezuela' },
  'barquisimeto': { lat: 10.0678, lng: -69.3474, name: 'Barquisimeto', country: 'Venezuela' },
  
  // Panama
  'panama city': { lat: 8.9824, lng: -79.5199, name: 'Panama City', country: 'Panama' },
  'bocas del toro': { lat: 9.3403, lng: -82.2419, name: 'Bocas del Toro', country: 'Panama' },
  'david': { lat: 8.4333, lng: -82.4333, name: 'David', country: 'Panama' },
  'colon': { lat: 9.3592, lng: -79.9012, name: 'Colón', country: 'Panama' },
  
  // Guatemala
  'guatemala city': { lat: 14.6349, lng: -90.5069, name: 'Guatemala City', country: 'Guatemala' },
  'antigua': { lat: 14.5586, lng: -90.7295, name: 'Antigua', country: 'Guatemala' },
  'flores': { lat: 16.9319, lng: -89.8924, name: 'Flores', country: 'Guatemala' },
  'quetzaltenango': { lat: 14.8347, lng: -91.5181, name: 'Quetzaltenango', country: 'Guatemala' },
  
  // El Salvador
  'san salvador': { lat: 13.6929, lng: -89.2182, name: 'San Salvador', country: 'El Salvador' },
  'santa ana': { lat: 13.9942, lng: -89.5597, name: 'Santa Ana', country: 'El Salvador' },
  'la libertad': { lat: 13.4833, lng: -89.3167, name: 'La Libertad', country: 'El Salvador' },
  
  // Honduras
  'tegucigalpa': { lat: 14.0723, lng: -87.1921, name: 'Tegucigalpa', country: 'Honduras' },
  'roatan': { lat: 16.3333, lng: -86.5167, name: 'Roatán', country: 'Honduras' },
  'san pedro sula': { lat: 15.5000, lng: -88.0333, name: 'San Pedro Sula', country: 'Honduras' },
  'la ceiba': { lat: 15.7833, lng: -86.8000, name: 'La Ceiba', country: 'Honduras' },
  
  // Nicaragua
  'managua': { lat: 12.1149, lng: -86.2362, name: 'Managua', country: 'Nicaragua' },
  'granada': { lat: 11.9344, lng: -85.9560, name: 'Granada', country: 'Nicaragua' },
  'leon': { lat: 12.4379, lng: -86.8780, name: 'León', country: 'Nicaragua' },
  'san juan del sur': { lat: 11.2533, lng: -85.8706, name: 'San Juan del Sur', country: 'Nicaragua' },
  
  // Costa Rica
  'san jose': { lat: 9.9281, lng: -84.0907, name: 'San José', country: 'Costa Rica' },
  'liberia': { lat: 10.6333, lng: -85.4333, name: 'Liberia', country: 'Costa Rica' },
  'la fortuna': { lat: 10.4678, lng: -84.6428, name: 'La Fortuna', country: 'Costa Rica' },
  'puerto limon': { lat: 9.9907, lng: -83.0359, name: 'Puerto Limón', country: 'Costa Rica' },
  'tamarindo': { lat: 10.2994, lng: -85.8375, name: 'Tamarindo', country: 'Costa Rica' },
  'manuel antonio': { lat: 9.3925, lng: -84.1364, name: 'Manuel Antonio', country: 'Costa Rica' },
  
  // Belize
  'belize city': { lat: 17.4986, lng: -88.1886, name: 'Belize City', country: 'Belize' },
  'san pedro': { lat: 17.9214, lng: -87.9611, name: 'San Pedro', country: 'Belize' },
  'placencia': { lat: 16.5167, lng: -88.3667, name: 'Placencia', country: 'Belize' },
  'caye caulker': { lat: 17.7500, lng: -88.0167, name: 'Caye Caulker', country: 'Belize' },
  
  // Ecuador
  'quito': { lat: -0.1807, lng: -78.4678, name: 'Quito', country: 'Ecuador' },
  'guayaquil': { lat: -2.1710, lng: -79.9224, name: 'Guayaquil', country: 'Ecuador' },
  'galapagos': { lat: -0.9538, lng: -90.9656, name: 'Galápagos', country: 'Ecuador' },
  'cuenca': { lat: -2.9001, lng: -79.0059, name: 'Cuenca', country: 'Ecuador' },
  'manta': { lat: -0.9500, lng: -80.7333, name: 'Manta', country: 'Ecuador' },
  
  // Peru
  'lima': { lat: -12.0464, lng: -77.0428, name: 'Lima', country: 'Peru' },
  'cusco': { lat: -13.5320, lng: -71.9675, name: 'Cusco', country: 'Peru' },
  'arequipa': { lat: -16.4090, lng: -71.5375, name: 'Arequipa', country: 'Peru' },
  'machu picchu': { lat: -13.1631, lng: -72.5450, name: 'Machu Picchu', country: 'Peru' },
  'iquitos': { lat: -3.7491, lng: -73.2538, name: 'Iquitos', country: 'Peru' },
  'puno': { lat: -15.8402, lng: -70.0219, name: 'Puno', country: 'Peru' },
  
  // Bolivia
  'la paz': { lat: -16.4897, lng: -68.1193, name: 'La Paz', country: 'Bolivia' },
  'santa cruz': { lat: -17.7833, lng: -63.1821, name: 'Santa Cruz', country: 'Bolivia' },
  'sucre': { lat: -19.0333, lng: -65.2627, name: 'Sucre', country: 'Bolivia' },
  'cochabamba': { lat: -17.3895, lng: -66.1568, name: 'Cochabamba', country: 'Bolivia' },
  
  // Chile
  'santiago': { lat: -33.4489, lng: -70.6693, name: 'Santiago', country: 'Chile' },
  'valparaiso': { lat: -33.0458, lng: -71.6197, name: 'Valparaíso', country: 'Chile' },
  'vina del mar': { lat: -33.0153, lng: -71.5500, name: 'Viña del Mar', country: 'Chile' },
  'punta arenas': { lat: -53.1638, lng: -70.9171, name: 'Punta Arenas', country: 'Chile' },
  'san pedro de atacama': { lat: -22.9087, lng: -68.1997, name: 'San Pedro de Atacama', country: 'Chile' },
  
  // Argentina
  'buenos aires': { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires', country: 'Argentina' },
  'mendoza': { lat: -32.8895, lng: -68.8458, name: 'Mendoza', country: 'Argentina' },
  'bariloche': { lat: -41.1335, lng: -71.3103, name: 'Bariloche', country: 'Argentina' },
  'cordoba': { lat: -31.4201, lng: -64.1888, name: 'Córdoba', country: 'Argentina' },
  'ushuaia': { lat: -54.8019, lng: -68.3030, name: 'Ushuaia', country: 'Argentina' },
  'iguazu': { lat: -25.5972, lng: -54.5786, name: 'Puerto Iguazú', country: 'Argentina' },
  
  // Uruguay
  'montevideo': { lat: -34.9011, lng: -56.1645, name: 'Montevideo', country: 'Uruguay' },
  'punta del este': { lat: -34.9667, lng: -54.9500, name: 'Punta del Este', country: 'Uruguay' },
  'colonia del sacramento': { lat: -34.4626, lng: -57.8400, name: 'Colonia del Sacramento', country: 'Uruguay' },
  
  // Paraguay
  'asuncion': { lat: -25.2637, lng: -57.5759, name: 'Asunción', country: 'Paraguay' },
  'ciudad del este': { lat: -25.5167, lng: -54.6167, name: 'Ciudad del Este', country: 'Paraguay' },
  'encarnacion': { lat: -27.3333, lng: -55.8667, name: 'Encarnación', country: 'Paraguay' },
  
  // Brazil
  'rio de janeiro': { lat: -22.9068, lng: -43.1729, name: 'Rio de Janeiro', country: 'Brazil' },
  'sao paulo': { lat: -23.5505, lng: -46.6333, name: 'São Paulo', country: 'Brazil' },
  'salvador': { lat: -12.9777, lng: -38.5016, name: 'Salvador', country: 'Brazil' },
  'fortaleza': { lat: -3.7172, lng: -38.5433, name: 'Fortaleza', country: 'Brazil' },
  'brasilia': { lat: -15.7942, lng: -47.8822, name: 'Brasília', country: 'Brazil' },
  'recife': { lat: -8.0476, lng: -34.8770, name: 'Recife', country: 'Brazil' },
  'manaus': { lat: -3.1019, lng: -60.0250, name: 'Manaus', country: 'Brazil' },
  'florianopolis': { lat: -27.5954, lng: -48.5480, name: 'Florianópolis', country: 'Brazil' },
  
  // Jamaica
  'kingston': { lat: 17.9714, lng: -76.7936, name: 'Kingston', country: 'Jamaica' },
  'montego bay': { lat: 18.4762, lng: -77.8939, name: 'Montego Bay', country: 'Jamaica' },
  'ocho rios': { lat: 18.4074, lng: -77.1025, name: 'Ocho Rios', country: 'Jamaica' },
  'negril': { lat: 18.2680, lng: -78.3478, name: 'Negril', country: 'Jamaica' },
  
  // Aruba
  'oranjestad': { lat: 12.5092, lng: -70.0086, name: 'Oranjestad', country: 'Aruba' },
  'palm beach': { lat: 12.5833, lng: -70.0500, name: 'Palm Beach', country: 'Aruba' },
  'san nicolas': { lat: 12.4333, lng: -69.9167, name: 'San Nicolás', country: 'Aruba' },
  
  // Curaçao
  'willemstad': { lat: 12.1696, lng: -68.9900, name: 'Willemstad', country: 'Curaçao' },
  'westpunt': { lat: 12.3708, lng: -69.1533, name: 'Westpunt', country: 'Curaçao' },
  'jan thiel': { lat: 12.0833, lng: -68.8667, name: 'Jan Thiel', country: 'Curaçao' },
  
  // Dominican Republic
  'santo domingo': { lat: 18.4861, lng: -69.9312, name: 'Santo Domingo', country: 'Dominican Republic' },
  'punta cana': { lat: 18.5601, lng: -68.3725, name: 'Punta Cana', country: 'Dominican Republic' },
  'puerto plata': { lat: 19.7903, lng: -70.6878, name: 'Puerto Plata', country: 'Dominican Republic' },
  'la romana': { lat: 18.4272, lng: -68.9728, name: 'La Romana', country: 'Dominican Republic' },
  
  // Haiti
  'port-au-prince': { lat: 18.5944, lng: -72.3074, name: 'Port-au-Prince', country: 'Haiti' },
  'cap-haitien': { lat: 19.7578, lng: -72.2047, name: 'Cap-Haïtien', country: 'Haiti' },
  'jacmel': { lat: 18.2342, lng: -72.5347, name: 'Jacmel', country: 'Haiti' },
  
  // Puerto Rico
  'san juan': { lat: 18.4655, lng: -66.1057, name: 'San Juan', country: 'Puerto Rico' },
  'ponce': { lat: 18.0111, lng: -66.6141, name: 'Ponce', country: 'Puerto Rico' },
  'rincon': { lat: 18.3400, lng: -67.2500, name: 'Rincón', country: 'Puerto Rico' },
  'vieques': { lat: 18.1263, lng: -65.4401, name: 'Vieques', country: 'Puerto Rico' },
  
  // Cuba
  'havana': { lat: 23.1136, lng: -82.3666, name: 'Havana', country: 'Cuba' },
  'varadero': { lat: 23.1394, lng: -81.2861, name: 'Varadero', country: 'Cuba' },
  'trinidad': { lat: 21.8022, lng: -79.9842, name: 'Trinidad', country: 'Cuba' },
  'santiago de cuba': { lat: 20.0247, lng: -75.8219, name: 'Santiago de Cuba', country: 'Cuba' },
  
  // Bahamas
  'nassau': { lat: 25.0480, lng: -77.3554, name: 'Nassau', country: 'Bahamas' },
  'freeport': { lat: 26.5333, lng: -78.7000, name: 'Freeport', country: 'Bahamas' },
  'exuma': { lat: 23.5000, lng: -75.7667, name: 'Exuma', country: 'Bahamas' },
  
  // Barbados
  'bridgetown': { lat: 13.0969, lng: -59.6145, name: 'Bridgetown', country: 'Barbados' },
  'speightstown': { lat: 13.2500, lng: -59.6500, name: 'Speightstown', country: 'Barbados' },
  'oistins': { lat: 13.0667, lng: -59.5333, name: 'Oistins', country: 'Barbados' },
  
  // Trinidad and Tobago
  'port of spain': { lat: 10.6596, lng: -61.5086, name: 'Port of Spain', country: 'Trinidad and Tobago' },
  'scarborough': { lat: 11.1833, lng: -60.7333, name: 'Scarborough', country: 'Trinidad and Tobago' },
  'san fernando': { lat: 10.2833, lng: -61.4667, name: 'San Fernando', country: 'Trinidad and Tobago' },
  
  // Grenada
  'st george': { lat: 12.0561, lng: -61.7486, name: "St. George's", country: 'Grenada' },
  'gouyave': { lat: 12.1647, lng: -61.7292, name: 'Gouyave', country: 'Grenada' },
  'grenville': { lat: 12.1167, lng: -61.6167, name: 'Grenville', country: 'Grenada' },
  
  // Saint Lucia
  'castries': { lat: 14.0101, lng: -60.9875, name: 'Castries', country: 'Saint Lucia' },
  'soufriere': { lat: 13.8500, lng: -61.0667, name: 'Soufrière', country: 'Saint Lucia' },
  'rodney bay': { lat: 14.0833, lng: -60.9500, name: 'Rodney Bay', country: 'Saint Lucia' },

  // Mexico - Top 30 cities
  'mexico city': { lat: 19.4326, lng: -99.1332, name: 'Mexico City', country: 'Mexico' },
  'cancun': { lat: 21.1619, lng: -86.8515, name: 'Cancún', country: 'Mexico' },
  'cabo': { lat: 22.8905, lng: -109.9167, name: 'Los Cabos', country: 'Mexico' },
  'los cabos': { lat: 22.8905, lng: -109.9167, name: 'Los Cabos', country: 'Mexico' },
  'guadalajara': { lat: 20.6597, lng: -103.3496, name: 'Guadalajara', country: 'Mexico' },
  'monterrey': { lat: 25.6866, lng: -100.3161, name: 'Monterrey', country: 'Mexico' },
  'tulum': { lat: 20.2114, lng: -87.4654, name: 'Tulum', country: 'Mexico' },
  'playa del carmen': { lat: 20.6296, lng: -87.0739, name: 'Playa del Carmen', country: 'Mexico' },
  'oaxaca': { lat: 17.0732, lng: -96.7266, name: 'Oaxaca', country: 'Mexico' },
  'puerto vallarta': { lat: 20.6534, lng: -105.2253, name: 'Puerto Vallarta', country: 'Mexico' },
  'tijuana': { lat: 32.5149, lng: -117.0382, name: 'Tijuana', country: 'Mexico' },
  'puebla': { lat: 19.0414, lng: -98.2063, name: 'Puebla', country: 'Mexico' },
  'leon guanajuato': { lat: 21.1221, lng: -101.6860, name: 'León', country: 'Mexico' },
  'leon mexico': { lat: 21.1221, lng: -101.6860, name: 'León', country: 'Mexico' },
  'ciudad juarez': { lat: 31.6904, lng: -106.4245, name: 'Ciudad Juárez', country: 'Mexico' },
  'juarez': { lat: 31.6904, lng: -106.4245, name: 'Ciudad Juárez', country: 'Mexico' },
  'merida': { lat: 20.9674, lng: -89.5926, name: 'Mérida', country: 'Mexico' },
  'san luis potosi': { lat: 22.1565, lng: -100.9855, name: 'San Luis Potosí', country: 'Mexico' },
  'aguascalientes': { lat: 21.8853, lng: -102.2916, name: 'Aguascalientes', country: 'Mexico' },
  'hermosillo': { lat: 29.0729, lng: -110.9559, name: 'Hermosillo', country: 'Mexico' },
  'saltillo': { lat: 25.4267, lng: -100.9924, name: 'Saltillo', country: 'Mexico' },
  'mexicali': { lat: 32.6245, lng: -115.4523, name: 'Mexicali', country: 'Mexico' },
  'culiacan': { lat: 24.8091, lng: -107.3940, name: 'Culiacán', country: 'Mexico' },
  'queretaro': { lat: 20.5888, lng: -100.3899, name: 'Querétaro', country: 'Mexico' },
  'morelia': { lat: 19.7060, lng: -101.1950, name: 'Morelia', country: 'Mexico' },
  'chihuahua': { lat: 28.6353, lng: -106.0889, name: 'Chihuahua', country: 'Mexico' },
  'acapulco': { lat: 16.8531, lng: -99.8237, name: 'Acapulco', country: 'Mexico' },
  'veracruz': { lat: 19.1738, lng: -96.1342, name: 'Veracruz', country: 'Mexico' },
  'mazatlan': { lat: 23.2494, lng: -106.4111, name: 'Mazatlán', country: 'Mexico' },
  'san miguel de allende': { lat: 20.9144, lng: -100.7452, name: 'San Miguel de Allende', country: 'Mexico' },
  'guanajuato': { lat: 21.0190, lng: -101.2574, name: 'Guanajuato', country: 'Mexico' },
  'cozumel': { lat: 20.4230, lng: -86.9223, name: 'Cozumel', country: 'Mexico' },
  'ixtapa': { lat: 17.6667, lng: -101.6167, name: 'Ixtapa', country: 'Mexico' },
  'zihuatanejo': { lat: 17.6417, lng: -101.5514, name: 'Zihuatanejo', country: 'Mexico' },
  'ensenada': { lat: 31.8667, lng: -116.5964, name: 'Ensenada', country: 'Mexico' },
  'campeche': { lat: 19.8301, lng: -90.5349, name: 'Campeche', country: 'Mexico' },
  'villahermosa': { lat: 17.9892, lng: -92.9475, name: 'Villahermosa', country: 'Mexico' },

  'paris': { lat: 48.8566, lng: 2.3522, name: 'Paris', country: 'France' },
  'london': { lat: 51.5074, lng: -0.1278, name: 'London', country: 'United Kingdom' },
  'dublin': { lat: 53.3498, lng: -6.2603, name: 'Dublin', country: 'Ireland' },
  'edinburgh': { lat: 55.9533, lng: -3.1883, name: 'Edinburgh', country: 'United Kingdom' },
  'barcelona': { lat: 41.3851, lng: 2.1734, name: 'Barcelona', country: 'Spain' },
  'madrid': { lat: 40.4168, lng: -3.7038, name: 'Madrid', country: 'Spain' },
  'lisbon': { lat: 38.7223, lng: -9.1393, name: 'Lisbon', country: 'Portugal' },
  'porto': { lat: 41.1579, lng: -8.6291, name: 'Porto', country: 'Portugal' },
  'amsterdam': { lat: 52.3676, lng: 4.9041, name: 'Amsterdam', country: 'Netherlands' },
  'brussels': { lat: 50.8503, lng: 4.3517, name: 'Brussels', country: 'Belgium' },
  'berlin': { lat: 52.5200, lng: 13.4050, name: 'Berlin', country: 'Germany' },
  'munich': { lat: 48.1351, lng: 11.5820, name: 'Munich', country: 'Germany' },
  'prague': { lat: 50.0755, lng: 14.4378, name: 'Prague', country: 'Czech Republic' },
  'vienna': { lat: 48.2082, lng: 16.3738, name: 'Vienna', country: 'Austria' },
  'budapest': { lat: 47.4979, lng: 19.0402, name: 'Budapest', country: 'Hungary' },
  'warsaw': { lat: 52.2297, lng: 21.0122, name: 'Warsaw', country: 'Poland' },
  'krakow': { lat: 50.0647, lng: 19.9450, name: 'Kraków', country: 'Poland' },
  'copenhagen': { lat: 55.6761, lng: 12.5683, name: 'Copenhagen', country: 'Denmark' },
  'stockholm': { lat: 59.3293, lng: 18.0686, name: 'Stockholm', country: 'Sweden' },
  'gothenburg': { lat: 57.7089, lng: 11.9746, name: 'Gothenburg', country: 'Sweden' },
  'malmo': { lat: 55.6050, lng: 13.0038, name: 'Malmö', country: 'Sweden' },
  'lulea': { lat: 65.5848, lng: 22.1547, name: 'Luleå', country: 'Sweden' },
  'oslo': { lat: 59.9139, lng: 10.7522, name: 'Oslo', country: 'Norway' },
  'helsinki': { lat: 60.1699, lng: 24.9384, name: 'Helsinki', country: 'Finland' },
  'reykjavik': { lat: 64.1466, lng: -21.9426, name: 'Reykjavík', country: 'Iceland' },
  'zurich': { lat: 47.3769, lng: 8.5417, name: 'Zürich', country: 'Switzerland' },
  'geneva': { lat: 46.2044, lng: 6.1432, name: 'Geneva', country: 'Switzerland' },

  'rome': { lat: 41.9028, lng: 12.4964, name: 'Rome', country: 'Italy' },
  'milan': { lat: 45.4642, lng: 9.1900, name: 'Milan', country: 'Italy' },
  'florence': { lat: 43.7696, lng: 11.2558, name: 'Florence', country: 'Italy' },
  'venice': { lat: 45.4408, lng: 12.3155, name: 'Venice', country: 'Italy' },

  'tokyo': { lat: 35.6762, lng: 139.6503, name: 'Tokyo', country: 'Japan' },
  'osaka': { lat: 34.6937, lng: 135.5023, name: 'Osaka', country: 'Japan' },
  'kyoto': { lat: 35.0116, lng: 135.7681, name: 'Kyoto', country: 'Japan' },
  'seoul': { lat: 37.5665, lng: 126.9780, name: 'Seoul', country: 'Korea, South' },
  'busan': { lat: 35.1796, lng: 129.0756, name: 'Busan', country: 'Korea, South' },
  'taipei': { lat: 25.0330, lng: 121.5654, name: 'Taipei', country: 'Taiwan' },
  'hong kong': { lat: 22.3193, lng: 114.1694, name: 'Hong Kong', country: 'Hong Kong' },
  'singapore': { lat: 1.3521, lng: 103.8198, name: 'Singapore', country: 'Singapore' },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869, name: 'Kuala Lumpur', country: 'Malaysia' },
  'manila': { lat: 14.5995, lng: 120.9842, name: 'Manila', country: 'Philippines' },
  'jakarta': { lat: -6.2088, lng: 106.8456, name: 'Jakarta', country: 'Indonesia' },
  'denpasar': { lat: -8.6705, lng: 115.2126, name: 'Denpasar (Bali)', country: 'Indonesia' },
  'hanoi': { lat: 21.0278, lng: 105.8342, name: 'Hanoi', country: 'Vietnam' },
  'ho chi minh city': { lat: 10.8231, lng: 106.6297, name: 'Ho Chi Minh City', country: 'Vietnam' },
  'beijing': { lat: 39.9042, lng: 116.4074, name: 'Beijing', country: 'China' },
  'shanghai': { lat: 31.2304, lng: 121.4737, name: 'Shanghai', country: 'China' },
  'delhi': { lat: 28.6139, lng: 77.2090, name: 'Delhi', country: 'India' },
  'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai', country: 'India' },

  'bangkok': { lat: 13.7563, lng: 100.5018, name: 'Bangkok', country: 'Thailand' },
  'phuket': { lat: 7.8804, lng: 98.3923, name: 'Phuket', country: 'Thailand' },
  'chiang mai': { lat: 18.7883, lng: 98.9853, name: 'Chiang Mai', country: 'Thailand' },

  'dubai': { lat: 25.2048, lng: 55.2708, name: 'Dubai', country: 'United Arab Emirates' },
  'abu dhabi': { lat: 24.4539, lng: 54.3773, name: 'Abu Dhabi', country: 'United Arab Emirates' },
  'doha': { lat: 25.2854, lng: 51.5310, name: 'Doha', country: 'Qatar' },
  'istanbul': { lat: 41.0082, lng: 28.9784, name: 'Istanbul', country: 'Turkey' },
  'athens': { lat: 37.9838, lng: 23.7275, name: 'Athens', country: 'Greece' },
  'cairo': { lat: 30.0444, lng: 31.2357, name: 'Cairo', country: 'Egypt' },
  'marrakech': { lat: 31.6295, lng: -7.9811, name: 'Marrakech', country: 'Morocco' },
  'casablanca': { lat: 33.5731, lng: -7.5898, name: 'Casablanca', country: 'Morocco' },
  'nairobi': { lat: -1.2921, lng: 36.8219, name: 'Nairobi', country: 'Kenya' },
  'cape town': { lat: -33.9249, lng: 18.4241, name: 'Cape Town', country: 'South Africa' },
  'johannesburg': { lat: -26.2041, lng: 28.0473, name: 'Johannesburg', country: 'South Africa' },

  'new york': { lat: 40.7128, lng: -74.0060, name: 'New York', country: 'United States' },
  'los angeles': { lat: 34.0522, lng: -118.2437, name: 'Los Angeles', country: 'United States' },
  'chicago': { lat: 41.8781, lng: -87.6298, name: 'Chicago', country: 'United States' },
  'san francisco': { lat: 37.7749, lng: -122.4194, name: 'San Francisco', country: 'United States' },
  'miami': { lat: 25.7617, lng: -80.1918, name: 'Miami', country: 'United States' },
  'washington dc': { lat: 38.9072, lng: -77.0369, name: 'Washington, DC', country: 'United States' },
  'las vegas': { lat: 36.1699, lng: -115.1398, name: 'Las Vegas', country: 'United States' },
  'boston': { lat: 42.3601, lng: -71.0589, name: 'Boston', country: 'United States' },
  'seattle': { lat: 47.6062, lng: -122.3321, name: 'Seattle', country: 'United States' },
  'austin': { lat: 30.2672, lng: -97.7431, name: 'Austin', country: 'United States' },
  'denver': { lat: 39.7392, lng: -104.9903, name: 'Denver', country: 'United States' },
  'new orleans': { lat: 29.9511, lng: -90.0715, name: 'New Orleans', country: 'United States' },
  'honolulu': { lat: 21.3069, lng: -157.8583, name: 'Honolulu', country: 'United States' },
  'orlando': { lat: 28.5383, lng: -81.3792, name: 'Orlando', country: 'United States' },
  'atlanta': { lat: 33.7490, lng: -84.3880, name: 'Atlanta', country: 'United States' },
  'phoenix': { lat: 33.4484, lng: -112.0740, name: 'Phoenix', country: 'United States' },
  'san diego': { lat: 32.7157, lng: -117.1611, name: 'San Diego', country: 'United States' },
  'toronto': { lat: 43.6532, lng: -79.3832, name: 'Toronto', country: 'Canada' },
  'vancouver': { lat: 49.2827, lng: -123.1207, name: 'Vancouver', country: 'Canada' },
  'montreal': { lat: 45.5017, lng: -73.5673, name: 'Montreal', country: 'Canada' },
  'calgary': { lat: 51.0447, lng: -114.0719, name: 'Calgary', country: 'Canada' },

  // Australia & Pacific
  'sydney': { lat: -33.8688, lng: 151.2093, name: 'Sydney', country: 'Australia' },
  'melbourne': { lat: -37.8136, lng: 144.9631, name: 'Melbourne', country: 'Australia' },
  'brisbane': { lat: -27.4698, lng: 153.0251, name: 'Brisbane', country: 'Australia' },
  'perth': { lat: -31.9505, lng: 115.8605, name: 'Perth', country: 'Australia' },
  'gold coast': { lat: -28.0167, lng: 153.4000, name: 'Gold Coast', country: 'Australia' },
  'auckland': { lat: -36.8485, lng: 174.7633, name: 'Auckland', country: 'New Zealand' },
  'wellington': { lat: -41.2865, lng: 174.7762, name: 'Wellington', country: 'New Zealand' },
  'queenstown': { lat: -45.0312, lng: 168.6626, name: 'Queenstown', country: 'New Zealand' },
  'fiji': { lat: -17.7134, lng: 178.0650, name: 'Suva', country: 'Fiji' },

  // Middle East (high safety concern region)
  'tel aviv': { lat: 32.0853, lng: 34.7818, name: 'Tel Aviv', country: 'Israel' },
  'jerusalem': { lat: 31.7683, lng: 35.2137, name: 'Jerusalem', country: 'Israel' },
  'beirut': { lat: 33.8938, lng: 35.5018, name: 'Beirut', country: 'Lebanon' },
  'amman': { lat: 31.9454, lng: 35.9284, name: 'Amman', country: 'Jordan' },
  'petra': { lat: 30.3285, lng: 35.4444, name: 'Petra', country: 'Jordan' },
  'riyadh': { lat: 24.7136, lng: 46.6753, name: 'Riyadh', country: 'Saudi Arabia' },
  'jeddah': { lat: 21.4858, lng: 39.1925, name: 'Jeddah', country: 'Saudi Arabia' },
  'kuwait city': { lat: 29.3759, lng: 47.9774, name: 'Kuwait City', country: 'Kuwait' },
  'muscat': { lat: 23.5880, lng: 58.3829, name: 'Muscat', country: 'Oman' },
  'bahrain': { lat: 26.0667, lng: 50.5577, name: 'Manama', country: 'Bahrain' },

  // Eastern Europe & Balkans (conflict-adjacent regions)
  'kyiv': { lat: 50.4501, lng: 30.5234, name: 'Kyiv', country: 'Ukraine' },
  'lviv': { lat: 49.8397, lng: 24.0297, name: 'Lviv', country: 'Ukraine' },
  'bucharest': { lat: 44.4268, lng: 26.1025, name: 'Bucharest', country: 'Romania' },
  'sofia': { lat: 42.6977, lng: 23.3219, name: 'Sofia', country: 'Bulgaria' },
  'belgrade': { lat: 44.7866, lng: 20.4489, name: 'Belgrade', country: 'Serbia' },
  'zagreb': { lat: 45.8150, lng: 15.9819, name: 'Zagreb', country: 'Croatia' },
  'split': { lat: 43.5081, lng: 16.4402, name: 'Split', country: 'Croatia' },
  'dubrovnik': { lat: 42.6507, lng: 18.0944, name: 'Dubrovnik', country: 'Croatia' },
  'ljubljana': { lat: 46.0569, lng: 14.5058, name: 'Ljubljana', country: 'Slovenia' },
  'sarajevo': { lat: 43.8563, lng: 18.4131, name: 'Sarajevo', country: 'Bosnia and Herzegovina' },
  'tirana': { lat: 41.3275, lng: 19.8187, name: 'Tirana', country: 'Albania' },
  'skopje': { lat: 41.9981, lng: 21.4254, name: 'Skopje', country: 'North Macedonia' },
  'podgorica': { lat: 42.4304, lng: 19.2594, name: 'Podgorica', country: 'Montenegro' },
  'pristina': { lat: 42.6629, lng: 21.1655, name: 'Pristina', country: 'Kosovo' },

  // Russia & Caucasus
  'moscow': { lat: 55.7558, lng: 37.6173, name: 'Moscow', country: 'Russia' },
  'st petersburg': { lat: 59.9311, lng: 30.3609, name: 'St. Petersburg', country: 'Russia' },
  'tbilisi': { lat: 41.7151, lng: 44.8271, name: 'Tbilisi', country: 'Georgia' },
  'batumi': { lat: 41.6168, lng: 41.6367, name: 'Batumi', country: 'Georgia' },
  'yerevan': { lat: 40.1792, lng: 44.4991, name: 'Yerevan', country: 'Armenia' },
  'baku': { lat: 40.4093, lng: 49.8671, name: 'Baku', country: 'Azerbaijan' },

  // Central Asia
  'almaty': { lat: 43.2220, lng: 76.8512, name: 'Almaty', country: 'Kazakhstan' },
  'tashkent': { lat: 41.2995, lng: 69.2401, name: 'Tashkent', country: 'Uzbekistan' },
  'samarkand': { lat: 39.6542, lng: 66.9597, name: 'Samarkand', country: 'Uzbekistan' },

  // More Africa (safety concerns + tourism)
  'lagos': { lat: 6.5244, lng: 3.3792, name: 'Lagos', country: 'Nigeria' },
  'accra': { lat: 5.6037, lng: -0.1870, name: 'Accra', country: 'Ghana' },
  'addis ababa': { lat: 9.0320, lng: 38.7469, name: 'Addis Ababa', country: 'Ethiopia' },
  'dar es salaam': { lat: -6.7924, lng: 39.2083, name: 'Dar es Salaam', country: 'Tanzania' },
  'zanzibar': { lat: -6.1659, lng: 39.2026, name: 'Zanzibar', country: 'Tanzania' },
  'kigali': { lat: -1.9403, lng: 29.8739, name: 'Kigali', country: 'Rwanda' },
  'dakar': { lat: 14.7167, lng: -17.4677, name: 'Dakar', country: 'Senegal' },
  'tunis': { lat: 36.8065, lng: 10.1815, name: 'Tunis', country: 'Tunisia' },
  'algiers': { lat: 36.7538, lng: 3.0588, name: 'Algiers', country: 'Algeria' },
  'kampala': { lat: 0.3476, lng: 32.5825, name: 'Kampala', country: 'Uganda' },
  'lusaka': { lat: -15.3875, lng: 28.3228, name: 'Lusaka', country: 'Zambia' },
  'victoria falls': { lat: -17.9243, lng: 25.8572, name: 'Victoria Falls', country: 'Zimbabwe' },

  // More Southeast Asia (popular + safety concerns)
  'phnom penh': { lat: 11.5564, lng: 104.9282, name: 'Phnom Penh', country: 'Cambodia' },
  'siem reap': { lat: 13.3671, lng: 103.8448, name: 'Siem Reap', country: 'Cambodia' },
  'vientiane': { lat: 17.9757, lng: 102.6331, name: 'Vientiane', country: 'Laos' },
  'luang prabang': { lat: 19.8830, lng: 102.1347, name: 'Luang Prabang', country: 'Laos' },
  'yangon': { lat: 16.8661, lng: 96.1951, name: 'Yangon', country: 'Myanmar' },
  'colombo': { lat: 6.9271, lng: 79.8612, name: 'Colombo', country: 'Sri Lanka' },
  'kathmandu': { lat: 27.7172, lng: 85.3240, name: 'Kathmandu', country: 'Nepal' },
  'dhaka': { lat: 23.8103, lng: 90.4125, name: 'Dhaka', country: 'Bangladesh' },
  'cebu': { lat: 10.3157, lng: 123.8854, name: 'Cebu', country: 'Philippines' },
  'boracay': { lat: 11.9674, lng: 121.9248, name: 'Boracay', country: 'Philippines' },

  // More China
  'shenzhen': { lat: 22.5431, lng: 114.0579, name: 'Shenzhen', country: 'China' },
  'guangzhou': { lat: 23.1291, lng: 113.2644, name: 'Guangzhou', country: 'China' },
  'macau': { lat: 22.1987, lng: 113.5439, name: 'Macau', country: 'Macau' },
  'xian': { lat: 34.3416, lng: 108.9398, name: "Xi'an", country: 'China' },
  'chengdu': { lat: 30.5728, lng: 104.0668, name: 'Chengdu', country: 'China' },

  // More India
  'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bangalore', country: 'India' },
  'goa': { lat: 15.2993, lng: 74.1240, name: 'Goa', country: 'India' },
  'jaipur': { lat: 26.9124, lng: 75.7873, name: 'Jaipur', country: 'India' },
  'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata', country: 'India' },
  'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai', country: 'India' },
  'agra': { lat: 27.1767, lng: 78.0081, name: 'Agra', country: 'India' },

  // More Europe
  'nice': { lat: 43.7102, lng: 7.2620, name: 'Nice', country: 'France' },
  'marseille': { lat: 43.2965, lng: 5.3698, name: 'Marseille', country: 'France' },
  'lyon': { lat: 45.7640, lng: 4.8357, name: 'Lyon', country: 'France' },
  'seville': { lat: 37.3891, lng: -5.9845, name: 'Seville', country: 'Spain' },
  'valencia spain': { lat: 39.4699, lng: -0.3763, name: 'Valencia', country: 'Spain' },
  'malaga': { lat: 36.7213, lng: -4.4214, name: 'Málaga', country: 'Spain' },
  'naples': { lat: 40.8518, lng: 14.2681, name: 'Naples', country: 'Italy' },
  'amalfi': { lat: 40.6340, lng: 14.6027, name: 'Amalfi', country: 'Italy' },
  'frankfurt': { lat: 50.1109, lng: 8.6821, name: 'Frankfurt', country: 'Germany' },
  'hamburg': { lat: 53.5511, lng: 9.9937, name: 'Hamburg', country: 'Germany' },
  'cologne': { lat: 50.9375, lng: 6.9603, name: 'Cologne', country: 'Germany' },
  'manchester': { lat: 53.4808, lng: -2.2426, name: 'Manchester', country: 'United Kingdom' },
  'liverpool': { lat: 53.4084, lng: -2.9916, name: 'Liverpool', country: 'United Kingdom' },
  'glasgow': { lat: 55.8642, lng: -4.2518, name: 'Glasgow', country: 'United Kingdom' },
  'antwerp': { lat: 51.2194, lng: 4.4025, name: 'Antwerp', country: 'Belgium' },
  'bruges': { lat: 51.2093, lng: 3.2247, name: 'Bruges', country: 'Belgium' },
  'rotterdam': { lat: 51.9244, lng: 4.4777, name: 'Rotterdam', country: 'Netherlands' },
  'salzburg': { lat: 47.8095, lng: 13.0550, name: 'Salzburg', country: 'Austria' },
  'innsbruck': { lat: 47.2692, lng: 11.4041, name: 'Innsbruck', country: 'Austria' },

  // ========== DO NOT TRAVEL / CONFLICT ZONES (Level 4) ==========
  // North Korea
  'pyongyang': { lat: 39.0392, lng: 125.7625, name: 'Pyongyang', country: 'North Korea' },
  'north korea': { lat: 39.0392, lng: 125.7625, name: 'Pyongyang', country: 'North Korea' },
  
  // Afghanistan
  'kabul': { lat: 34.5553, lng: 69.2075, name: 'Kabul', country: 'Afghanistan' },
  'kandahar': { lat: 31.6289, lng: 65.7372, name: 'Kandahar', country: 'Afghanistan' },
  'herat': { lat: 34.3529, lng: 62.2040, name: 'Herat', country: 'Afghanistan' },
  'mazar-i-sharif': { lat: 36.7069, lng: 67.1147, name: 'Mazar-i-Sharif', country: 'Afghanistan' },
  
  // Syria
  'damascus': { lat: 33.5138, lng: 36.2765, name: 'Damascus', country: 'Syria' },
  'aleppo': { lat: 36.2021, lng: 37.1343, name: 'Aleppo', country: 'Syria' },
  'homs': { lat: 34.7324, lng: 36.7137, name: 'Homs', country: 'Syria' },
  
  // Yemen
  'sanaa': { lat: 15.3694, lng: 44.1910, name: "Sana'a", country: 'Yemen' },
  'aden': { lat: 12.7855, lng: 45.0187, name: 'Aden', country: 'Yemen' },
  
  // Somalia
  'mogadishu': { lat: 2.0469, lng: 45.3182, name: 'Mogadishu', country: 'Somalia' },
  'hargeisa': { lat: 9.5600, lng: 44.0650, name: 'Hargeisa', country: 'Somalia' },
  
  // Libya
  'tripoli libya': { lat: 32.8872, lng: 13.1913, name: 'Tripoli', country: 'Libya' },
  'benghazi': { lat: 32.1194, lng: 20.0868, name: 'Benghazi', country: 'Libya' },
  
  // South Sudan
  'juba': { lat: 4.8594, lng: 31.5713, name: 'Juba', country: 'South Sudan' },
  
  // Sudan
  'khartoum': { lat: 15.5007, lng: 32.5599, name: 'Khartoum', country: 'Sudan' },
  'omdurman': { lat: 15.6445, lng: 32.4777, name: 'Omdurman', country: 'Sudan' },
  
  // Iraq
  'baghdad': { lat: 33.3152, lng: 44.3661, name: 'Baghdad', country: 'Iraq' },
  'basra': { lat: 30.5085, lng: 47.7804, name: 'Basra', country: 'Iraq' },
  'mosul': { lat: 36.3350, lng: 43.1189, name: 'Mosul', country: 'Iraq' },
  'erbil': { lat: 36.1901, lng: 44.0091, name: 'Erbil', country: 'Iraq' },
  
  // Iran
  'tehran': { lat: 35.6892, lng: 51.3890, name: 'Tehran', country: 'Iran' },
  'isfahan': { lat: 32.6546, lng: 51.6680, name: 'Isfahan', country: 'Iran' },
  'shiraz': { lat: 29.5918, lng: 52.5837, name: 'Shiraz', country: 'Iran' },
  'mashhad': { lat: 36.2605, lng: 59.6168, name: 'Mashhad', country: 'Iran' },
  
  // Russia (additional cities)
  'sochi': { lat: 43.6028, lng: 39.7342, name: 'Sochi', country: 'Russia' },
  'kazan': { lat: 55.8304, lng: 49.0661, name: 'Kazan', country: 'Russia' },
  
  // Ukraine (additional conflict cities)
  'kharkiv': { lat: 49.9935, lng: 36.2304, name: 'Kharkiv', country: 'Ukraine' },
  'odesa': { lat: 46.4825, lng: 30.7233, name: 'Odesa', country: 'Ukraine' },
  'dnipro': { lat: 48.4647, lng: 35.0462, name: 'Dnipro', country: 'Ukraine' },
  
  // Belarus
  'minsk': { lat: 53.9006, lng: 27.5590, name: 'Minsk', country: 'Belarus' },
  
  // Myanmar (additional cities)
  'mandalay': { lat: 21.9588, lng: 96.0891, name: 'Mandalay', country: 'Myanmar' },
  'naypyidaw': { lat: 19.7633, lng: 96.0785, name: 'Naypyidaw', country: 'Myanmar' },
  
  // Central African Republic
  'bangui': { lat: 4.3947, lng: 18.5582, name: 'Bangui', country: 'Central African Republic' },
  
  // Mali
  'bamako': { lat: 12.6392, lng: -8.0029, name: 'Bamako', country: 'Mali' },
  'timbuktu': { lat: 16.7666, lng: -3.0026, name: 'Timbuktu', country: 'Mali' },
  
  // Burkina Faso
  'ouagadougou': { lat: 12.3714, lng: -1.5197, name: 'Ouagadougou', country: 'Burkina Faso' },
  
  // Niger
  'niamey': { lat: 13.5137, lng: 2.1098, name: 'Niamey', country: 'Niger' },
  
  // Chad
  'ndjamena': { lat: 12.1348, lng: 15.0557, name: "N'Djamena", country: 'Chad' },
  
  // Ethiopia (conflict areas)
  // 'addis ababa' is already defined above

  // Eritrea
  'asmara': { lat: 15.3229, lng: 38.9251, name: 'Asmara', country: 'Eritrea' },

  // Lebanon (high risk)
  // 'beirut' is already defined above

  // Gaza/Palestinian Territories
  'gaza': { lat: 31.5017, lng: 34.4668, name: 'Gaza City', country: 'Palestinian Territories' },
  'gaza city': { lat: 31.5017, lng: 34.4668, name: 'Gaza City', country: 'Palestinian Territories' },
  
  // Pakistan (high-risk areas)
  'karachi': { lat: 24.8607, lng: 67.0011, name: 'Karachi', country: 'Pakistan' },
  'lahore': { lat: 31.5497, lng: 74.3436, name: 'Lahore', country: 'Pakistan' },
  'islamabad': { lat: 33.6844, lng: 73.0479, name: 'Islamabad', country: 'Pakistan' },
  'peshawar': { lat: 34.0151, lng: 71.5249, name: 'Peshawar', country: 'Pakistan' },
  
  // Democratic Republic of Congo
  'kinshasa': { lat: -4.4419, lng: 15.2663, name: 'Kinshasa', country: 'Democratic Republic of Congo' },
  'goma': { lat: -1.6771, lng: 29.2386, name: 'Goma', country: 'Democratic Republic of Congo' },
  'lubumbashi': { lat: -11.6647, lng: 27.4794, name: 'Lubumbashi', country: 'Democratic Republic of Congo' },
};

const CITY_ALIASES: Record<string, string> = {
  'nyc': 'new york',
  'new york city': 'new york',
  'la': 'los angeles',
  'l.a.': 'los angeles',
  'sf': 'san francisco',
  'san fran': 'san francisco',
  'dc': 'washington dc',
  'washington': 'washington dc',
  'saigon': 'ho chi minh city',
  'bali': 'denpasar',
  'kiev': 'kyiv',
  'bombay': 'mumbai',
  'madras': 'chennai',
  'calcutta': 'kolkata',
  'peking': 'beijing',
  'saint petersburg': 'st petersburg',
  'hawaii': 'honolulu',
};

// Calculate distance between two points in km (Haversine formula)
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get nearby cities within 500km
function getNearbyCities(cityKey: string, maxDistance: number = 500): string[] {
  const origin = CITY_COORDINATES[cityKey];
  if (!origin) return [];
  
  return Object.entries(CITY_COORDINATES)
    .filter(([key, coords]) => {
      if (key === cityKey) return false;
      const dist = getDistanceKm(origin.lat, origin.lng, coords.lat, coords.lng);
      return dist <= maxDistance;
    })
    .sort((a, b) => {
      const distA = getDistanceKm(origin.lat, origin.lng, a[1].lat, a[1].lng);
      const distB = getDistanceKm(origin.lat, origin.lng, b[1].lat, b[1].lng);
      return distA - distB;
    })
    .slice(0, 4) // Max 4 nearby cities
    .map(([key]) => key);
}

// Country to city mapping for common searches
const CITY_TO_COUNTRY: Record<string, string> = {
  ...Object.fromEntries(Object.entries(CITY_COORDINATES).map(([key, info]) => [key, info.country])),
  'santorini': 'Greece',
  'sydney': 'Australia',
  'melbourne': 'Australia',
  'mumbai': 'India',
  'goa': 'India',
  'kathmandu': 'Nepal',
  'havana': 'Cuba',
  'san juan': 'Puerto Rico',
  'kingston': 'Jamaica',
  'nassau': 'Bahamas',
  'punta cana': 'Dominican Republic',
  'santo domingo': 'Dominican Republic',
};

interface TravelAdvisory {
  country: string;
  country_code: string;
  advisory_level: number;
  advisory_text: string;
  date_updated: string;
  url: string;
}

interface UKTravelAdvice {
  country: string;
  alert_status: string[];
  change_description: string;
  last_updated: string;
  url: string;
}

interface ACLEDData {
  country: string;
  location?: string; // City or region name
  total_events: number;
  fatalities: number;
  events_last_30_days: number;
  event_types: { [key: string]: number };
  last_updated: string;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface AdvisoryData {
  [key: string]: TravelAdvisory;
}

interface UKAdvisoryData {
  [key: string]: UKTravelAdvice;
}

interface ACLEDAdvisoryData {
  [key: string]: ACLEDData;
}

interface GDELTHeadline {
  title: string;
  url: string;
  source: string;
  date: string;
  tone: number;
}

interface GDELTData {
  location: string;
  country: string;
  tone_score: number; // -100 to +100, negative = concerning
  volume_level: 'normal' | 'elevated' | 'spike';
  article_count_24h: number;
  themes: { [key: string]: number }; // theme name -> percentage
  headlines: GDELTHeadline[];
  trend_7day: 'improving' | 'worsening' | 'stable';
  last_updated: string;
}

interface GDELTAdvisoryData {
  [key: string]: GDELTData;
}

const UK_COUNTRY_SLUG_OVERRIDES: Record<string, string> = {
  'united states': 'usa',
  'korea, south': 'south-korea',
  'korea south': 'south-korea',
};

function toUkSlug(countryKey: string): string {
  const normalized = countryKey.toLowerCase().trim();
  if (UK_COUNTRY_SLUG_OVERRIDES[normalized]) return UK_COUNTRY_SLUG_OVERRIDES[normalized];
  return normalized
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

async function fetchUKAdvice(countryKey: string): Promise<UKTravelAdvice | null> {
  try {
    const slug = toUkSlug(countryKey);

    // Prefer server proxy (avoids CORS)
    const proxy = await fetch(`/api/uk?country=${encodeURIComponent(slug)}`);
    if (proxy.ok) return await proxy.json();

    // Fallback to direct
    const direct = await fetch(`https://www.gov.uk/api/content/foreign-travel-advice/${encodeURIComponent(slug)}`);
    if (!direct.ok) return null;
    const data: any = await direct.json();
    if (!data?.details) return null;
    return {
      country: data.title || countryKey,
      alert_status: data.details.alert_status || [],
      change_description: data.details.change_description || '',
      last_updated: data.public_updated_at || new Date().toISOString(),
      url: data.web_url || `https://www.gov.uk/foreign-travel-advice/${slug}`,
    };
  } catch {
    return null;
  }
}

// Fetch GDELT news data for a location
async function fetchGDELTData(location: string): Promise<GDELTData | null> {
  try {
    // Prefer server proxy (avoids CORS)
    try {
      const proxy = await fetch(`/api/gdelt?location=${encodeURIComponent(location)}`);
      if (proxy.ok) return await proxy.json();
    } catch {
      // ignore and fall back
    }

    // GDELT DOC 2.0 API - get articles and tone
    const response = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(location)}&mode=artlist&maxrecords=10&format=json&timespan=7d`
    );
    
    if (!response.ok) {
      console.log(`GDELT API not available for ${location}, using fallback`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.articles && Array.isArray(data.articles)) {
      const articles = data.articles;
      
      // Calculate average tone
      const tones = articles.map((a: any) => a.tone || 0);
      const avgTone = tones.length > 0 ? tones.reduce((a: number, b: number) => a + b, 0) / tones.length : 0;
      
      // Extract headlines
      const headlines: GDELTHeadline[] = articles.slice(0, 5).map((a: any) => ({
        title: a.title || 'Untitled',
        url: a.url || '',
        source: a.domain || 'Unknown',
        date: a.seendate || new Date().toISOString(),
        tone: a.tone || 0,
      }));
      
      // Determine volume level based on article count
      const volumeLevel = articles.length > 50 ? 'spike' : articles.length > 20 ? 'elevated' : 'normal';
      
      return {
        location,
        country: '',
        tone_score: Math.round(avgTone * 10) / 10,
        volume_level: volumeLevel,
        article_count_24h: articles.length,
        themes: {}, // Would need separate API call for themes
        headlines,
        trend_7day: avgTone > 0 ? 'improving' : avgTone < -5 ? 'worsening' : 'stable',
        last_updated: new Date().toISOString(),
      };
    }
    
    return null;
  } catch (error) {
    console.log(`Failed to fetch GDELT data for ${location}:`, error);
    return null;
  }
}

// Fetch ACLED conflict data
// Note: ACLED requires API key for full access. Set ACLED_API_KEY env var or use fallback data.
async function fetchACLEDData(country: string): Promise<ACLEDData | null> {
  try {
    // Prefer server proxy (avoids CORS and uses env var ACLED_API_KEY)
    try {
      const proxy = await fetch(`/api/acled?country=${encodeURIComponent(country)}`);
      if (proxy.ok) return await proxy.json();
    } catch {
      // ignore and fall back
    }

    // ACLED API requires authentication for full access.
    // To avoid hardcoding secrets into a static bundle, you can set it at runtime:
    // localStorage.setItem('ACLED_API_KEY', '<your_key>')
    const apiKey = typeof window !== 'undefined' ? window.localStorage?.getItem('ACLED_API_KEY') : null;

    // This will try the public endpoint (may fail) and include a key when provided.
    const currentYear = new Date().getFullYear();
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
    const response = await fetch(
      `https://api.acleddata.com/acled/read?event_date=${currentYear}&event_date_where=>=&country=${encodeURIComponent(country)}&fields=event_type|fatalities|event_date&limit=500${keyParam}`
    );
    
    if (!response.ok) {
      console.log(`ACLED API not available for ${country}, using fallback`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      const events = data.data;
      const eventTypes: { [key: string]: number } = {};
      let totalFatalities = 0;
      
      events.forEach((event: any) => {
        const type = event.event_type || 'Unknown';
        eventTypes[type] = (eventTypes[type] || 0) + 1;
        totalFatalities += parseInt(event.fatalities || '0', 10);
      });
      
      // Calculate events in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentEvents = events.filter((e: any) => new Date(e.event_date) >= thirtyDaysAgo).length;
      
      return {
        country,
        total_events: events.length,
        fatalities: totalFatalities,
        events_last_30_days: recentEvents,
        event_types: eventTypes,
        last_updated: new Date().toISOString(),
        trend: recentEvents > events.length / 12 ? 'increasing' : 'stable',
      };
    }
    
    return null;
  } catch (error) {
    console.log(`Failed to fetch ACLED data for ${country}:`, error);
    return null;
  }
}

// Fetch UK Foreign Office travel advice
async function fetchUKAdvisories(): Promise<UKAdvisoryData> {
  try {
    const ukAdvisories: UKAdvisoryData = {};
    
    // Common countries to fetch UK advice for
    const countries = [
      'colombia', 'mexico', 'france', 'japan', 'italy', 
      'spain', 'germany', 'thailand', 'brazil', 'united-kingdom'
    ];
    
    for (const country of countries) {
      try {
        const response = await fetch(`https://www.gov.uk/api/content/foreign-travel-advice/${country}`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.details) {
            ukAdvisories[country] = {
              country: data.title || country.charAt(0).toUpperCase() + country.slice(1),
              alert_status: data.details.alert_status || [],
              change_description: data.details.change_description || '',
              last_updated: data.public_updated_at || new Date().toISOString(),
              url: data.web_url || `https://www.gov.uk/foreign-travel-advice/${country}`,
            };
          }
        }
      } catch (error) {
        console.log(`Failed to fetch UK advice for ${country}:`, error);
      }
    }
    
    return ukAdvisories;
  } catch (error) {
    console.error('Failed to fetch UK advisories:', error);
    return {};
  }
}

// Fetch State Department advisories
async function fetchStateAdvisories(): Promise<AdvisoryData> {
  try {
    const response = await fetch('https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html/_jcr_content/traveladvisories.json');
    const data = await response.json();
    
    const advisories: AdvisoryData = {};
    
    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        const countryName = item.title || item.country;
        if (countryName) {
          // Extract level from the advisory text or level field
          let level = 1;
          const levelMatch = item.travel_advisory?.level || item.level;
          if (levelMatch) {
            level = parseInt(levelMatch, 10);
          } else if (item.travel_advisory?.advisory) {
            const textMatch = item.travel_advisory.advisory.match(/Level (\d)/i);
            if (textMatch) level = parseInt(textMatch[1], 10);
          }
          
          advisories[countryName.toLowerCase()] = {
            country: countryName,
            country_code: item.country_code || item.iso_code || '',
            advisory_level: Math.min(Math.max(level, 1), 4),
            advisory_text: item.travel_advisory?.advisory || item.advisory || `Level ${level} - ${ADVISORY_LEVELS[level as keyof typeof ADVISORY_LEVELS]?.label || 'Unknown'}`,
            date_updated: item.date_updated || item.last_updated || new Date().toISOString().split('T')[0],
            url: item.url || `https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/${countryName.toLowerCase().replace(/\s+/g, '-')}.html`,
          };
        }
      });
    }
    
    return advisories;
  } catch (error) {
    console.error('Failed to fetch State Department advisories:', error);
    return {};
  }
}

// Fallback UK advisory data for common countries
const FALLBACK_UK_ADVISORIES: UKAdvisoryData = {
  'colombia': {
    country: 'Colombia',
    alert_status: ['avoid_all_but_essential_travel_to_parts'],
    change_description: 'FCO advises against all but essential travel to parts of Colombia due to crime and terrorism.',
    last_updated: '2025-12-29T16:17:16Z',
    url: 'https://www.gov.uk/foreign-travel-advice/colombia',
  },
  'mexico': {
    country: 'Mexico',
    alert_status: ['avoid_all_but_essential_travel_to_parts'],
    change_description: 'FCO advises against all but essential travel to parts of Mexico due to crime.',
    last_updated: '2025-12-10T13:43:01Z',
    url: 'https://www.gov.uk/foreign-travel-advice/mexico',
  },
  'france': {
    country: 'France',
    alert_status: [],
    change_description: 'Terrorists are very likely to try to carry out attacks in France.',
    last_updated: '2025-11-20T10:15:00Z',
    url: 'https://www.gov.uk/foreign-travel-advice/france',
  },
  'japan': {
    country: 'Japan',
    alert_status: [],
    change_description: 'Japan is generally a safe country with low crime rates.',
    last_updated: '2025-10-15T09:30:00Z',
    url: 'https://www.gov.uk/foreign-travel-advice/japan',
  },
  'thailand': {
    country: 'Thailand',
    alert_status: ['avoid_all_but_essential_travel_to_parts'],
    change_description: 'FCO advises against all but essential travel to parts of Thailand (the southern provinces) due to ongoing violence.',
    last_updated: '2025-01-15T10:00:00Z',
    url: 'https://www.gov.uk/foreign-travel-advice/thailand',
  },
};

// Fallback ACLED conflict data for countries AND cities
const FALLBACK_ACLED_DATA: ACLEDAdvisoryData = {
  // Country-level data
  'colombia': {
    country: 'Colombia',
    total_events: 1247,
    fatalities: 892,
    events_last_30_days: 98,
    event_types: {
      'Violence against civilians': 312,
      'Battles': 245,
      'Explosions/Remote violence': 189,
      'Protests': 287,
      'Riots': 124,
      'Strategic developments': 90,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'mexico': {
    country: 'Mexico',
    total_events: 2156,
    fatalities: 1834,
    events_last_30_days: 187,
    event_types: {
      'Violence against civilians': 892,
      'Battles': 534,
      'Explosions/Remote violence': 245,
      'Protests': 312,
      'Riots': 98,
      'Strategic developments': 75,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'increasing',
  },
  'france': {
    country: 'France',
    total_events: 423,
    fatalities: 12,
    events_last_30_days: 45,
    event_types: {
      'Protests': 287,
      'Riots': 89,
      'Violence against civilians': 23,
      'Strategic developments': 24,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'japan': {
    country: 'Japan',
    total_events: 34,
    fatalities: 2,
    events_last_30_days: 3,
    event_types: {
      'Protests': 28,
      'Strategic developments': 6,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'thailand': {
    country: 'Thailand',
    total_events: 312,
    fatalities: 89,
    events_last_30_days: 28,
    event_types: {
      'Violence against civilians': 78,
      'Battles': 45,
      'Protests': 134,
      'Riots': 34,
      'Strategic developments': 21,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'decreasing',
  },
  'brazil': {
    country: 'Brazil',
    total_events: 1876,
    fatalities: 1245,
    events_last_30_days: 156,
    event_types: {
      'Violence against civilians': 923,
      'Battles': 312,
      'Protests': 412,
      'Riots': 167,
      'Strategic developments': 62,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  // City-level data - Colombia
  'medellin': {
    country: 'Colombia',
    location: 'Medellín',
    total_events: 156,
    fatalities: 89,
    events_last_30_days: 12,
    event_types: {
      'Violence against civilians': 67,
      'Protests': 45,
      'Riots': 23,
      'Strategic developments': 21,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'decreasing',
  },
  'bogota': {
    country: 'Colombia',
    location: 'Bogotá',
    total_events: 234,
    fatalities: 45,
    events_last_30_days: 18,
    event_types: {
      'Protests': 134,
      'Violence against civilians': 45,
      'Riots': 34,
      'Strategic developments': 21,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'cali': {
    country: 'Colombia',
    location: 'Cali',
    total_events: 198,
    fatalities: 134,
    events_last_30_days: 15,
    event_types: {
      'Violence against civilians': 89,
      'Battles': 45,
      'Protests': 34,
      'Riots': 30,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'cartagena': {
    country: 'Colombia',
    location: 'Cartagena',
    total_events: 34,
    fatalities: 12,
    events_last_30_days: 3,
    event_types: {
      'Violence against civilians': 18,
      'Protests': 12,
      'Strategic developments': 4,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  // City-level data - Mexico
  'mexico city': {
    country: 'Mexico',
    location: 'Mexico City',
    total_events: 312,
    fatalities: 156,
    events_last_30_days: 28,
    event_types: {
      'Violence against civilians': 134,
      'Protests': 98,
      'Riots': 45,
      'Strategic developments': 35,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'cancun': {
    country: 'Mexico',
    location: 'Cancún',
    total_events: 67,
    fatalities: 34,
    events_last_30_days: 6,
    event_types: {
      'Violence against civilians': 45,
      'Protests': 12,
      'Strategic developments': 10,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'cabo': {
    country: 'Mexico',
    location: 'Los Cabos',
    total_events: 23,
    fatalities: 8,
    events_last_30_days: 2,
    event_types: {
      'Violence against civilians': 15,
      'Strategic developments': 8,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'decreasing',
  },
  // City-level data - Brazil
  'rio de janeiro': {
    country: 'Brazil',
    location: 'Rio de Janeiro',
    total_events: 456,
    fatalities: 312,
    events_last_30_days: 38,
    event_types: {
      'Violence against civilians': 234,
      'Battles': 89,
      'Protests': 78,
      'Riots': 55,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'sao paulo': {
    country: 'Brazil',
    location: 'São Paulo',
    total_events: 389,
    fatalities: 198,
    events_last_30_days: 32,
    event_types: {
      'Violence against civilians': 178,
      'Protests': 134,
      'Riots': 45,
      'Strategic developments': 32,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  // City-level data - Thailand
  'bangkok': {
    country: 'Thailand',
    location: 'Bangkok',
    total_events: 89,
    fatalities: 12,
    events_last_30_days: 8,
    event_types: {
      'Protests': 67,
      'Riots': 12,
      'Strategic developments': 10,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  'phuket': {
    country: 'Thailand',
    location: 'Phuket',
    total_events: 12,
    fatalities: 2,
    events_last_30_days: 1,
    event_types: {
      'Protests': 8,
      'Strategic developments': 4,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  // City-level data - France
  'paris': {
    country: 'France',
    location: 'Paris',
    total_events: 187,
    fatalities: 5,
    events_last_30_days: 21,
    event_types: {
      'Protests': 134,
      'Riots': 34,
      'Violence against civilians': 12,
      'Strategic developments': 7,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
  // City-level data - Japan
  'tokyo': {
    country: 'Japan',
    location: 'Tokyo',
    total_events: 18,
    fatalities: 0,
    events_last_30_days: 2,
    event_types: {
      'Protests': 15,
      'Strategic developments': 3,
    },
    last_updated: '2025-12-30T00:00:00Z',
    trend: 'stable',
  },
};

// Fallback GDELT news data for cities and countries
const FALLBACK_GDELT_DATA: GDELTAdvisoryData = {
  // City-level data - Colombia
  'medellin': {
    location: 'Medellín',
    country: 'Colombia',
    tone_score: -2.8,
    volume_level: 'normal',
    article_count_24h: 23,
    themes: {
      'Tourism': 34,
      'Crime': 22,
      'Business': 18,
      'Culture': 15,
      'Politics': 11,
    },
    headlines: [
      { title: 'Medellín named top destination for digital nomads in 2025', url: 'https://example.com/1', source: 'Travel Weekly', date: '2025-12-30', tone: 4.2 },
      { title: 'Security concerns persist in Comuna 13 despite tourism boom', url: 'https://example.com/2', source: 'Colombia Reports', date: '2025-12-29', tone: -3.5 },
      { title: 'New metro line expansion connects Medellín neighborhoods', url: 'https://example.com/3', source: 'Reuters', date: '2025-12-28', tone: 2.1 },
      { title: 'Local authorities crack down on tourist scams', url: 'https://example.com/4', source: 'El Tiempo', date: '2025-12-27', tone: -1.8 },
      { title: 'Medellín tech scene attracts international investment', url: 'https://example.com/5', source: 'Bloomberg', date: '2025-12-26', tone: 3.4 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  'bogota': {
    location: 'Bogotá',
    country: 'Colombia',
    tone_score: -3.2,
    volume_level: 'elevated',
    article_count_24h: 45,
    themes: {
      'Politics': 32,
      'Crime': 24,
      'Economy': 20,
      'Protests': 14,
      'Culture': 10,
    },
    headlines: [
      { title: 'Colombia government announces new security measures for capital', url: 'https://example.com/1', source: 'AP News', date: '2025-12-30', tone: -2.1 },
      { title: 'Bogotá mayor addresses rising theft concerns in tourist areas', url: 'https://example.com/2', source: 'Colombia Reports', date: '2025-12-29', tone: -4.5 },
      { title: 'International film festival draws crowds to Bogotá', url: 'https://example.com/3', source: 'Variety', date: '2025-12-28', tone: 3.8 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  'colombia': {
    location: 'Colombia',
    country: 'Colombia',
    tone_score: -4.1,
    volume_level: 'elevated',
    article_count_24h: 156,
    themes: {
      'Politics': 28,
      'Violence': 24,
      'Economy': 18,
      'Drug Trade': 15,
      'Tourism': 15,
    },
    headlines: [
      { title: 'Colombia peace process faces new challenges', url: 'https://example.com/1', source: 'Reuters', date: '2025-12-30', tone: -5.2 },
      { title: 'Colombian exports reach record high in 2025', url: 'https://example.com/2', source: 'Bloomberg', date: '2025-12-29', tone: 4.1 },
      { title: 'Rural violence continues in border regions', url: 'https://example.com/3', source: 'AP News', date: '2025-12-28', tone: -7.8 },
    ],
    trend_7day: 'worsening',
    last_updated: '2025-12-30T12:00:00Z',
  },
  // City-level data - Mexico
  'mexico city': {
    location: 'Mexico City',
    country: 'Mexico',
    tone_score: -1.9,
    volume_level: 'normal',
    article_count_24h: 67,
    themes: {
      'Culture': 28,
      'Politics': 24,
      'Tourism': 20,
      'Crime': 16,
      'Business': 12,
    },
    headlines: [
      { title: 'Mexico City ranked among top culinary destinations', url: 'https://example.com/1', source: 'Food & Wine', date: '2025-12-30', tone: 5.2 },
      { title: 'Air quality improvements in capital credited to new policies', url: 'https://example.com/2', source: 'Reuters', date: '2025-12-29', tone: 3.1 },
      { title: 'Pickpocketing on metro remains concern for tourists', url: 'https://example.com/3', source: 'Travel Safety', date: '2025-12-28', tone: -4.2 },
    ],
    trend_7day: 'improving',
    last_updated: '2025-12-30T12:00:00Z',
  },
  'cancun': {
    location: 'Cancún',
    country: 'Mexico',
    tone_score: 1.2,
    volume_level: 'normal',
    article_count_24h: 34,
    themes: {
      'Tourism': 45,
      'Weather': 20,
      'Business': 18,
      'Crime': 12,
      'Environment': 5,
    },
    headlines: [
      { title: 'Cancún hotels report record bookings for holiday season', url: 'https://example.com/1', source: 'Travel Weekly', date: '2025-12-30', tone: 4.8 },
      { title: 'New coral reef restoration project launches near Cancún', url: 'https://example.com/2', source: 'National Geographic', date: '2025-12-29', tone: 5.2 },
      { title: 'Tourist zone security increased ahead of New Year', url: 'https://example.com/3', source: 'Mexico News Daily', date: '2025-12-28', tone: 0.5 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  'mexico': {
    location: 'Mexico',
    country: 'Mexico',
    tone_score: -5.3,
    volume_level: 'elevated',
    article_count_24h: 234,
    themes: {
      'Crime': 32,
      'Politics': 25,
      'Economy': 18,
      'Drug Trade': 15,
      'Tourism': 10,
    },
    headlines: [
      { title: 'Cartel violence surges in northern border states', url: 'https://example.com/1', source: 'AP News', date: '2025-12-30', tone: -8.5 },
      { title: 'Mexican peso strengthens against dollar', url: 'https://example.com/2', source: 'Bloomberg', date: '2025-12-29', tone: 3.2 },
      { title: 'Travel advisory updated for several Mexican states', url: 'https://example.com/3', source: 'State Dept', date: '2025-12-28', tone: -5.1 },
    ],
    trend_7day: 'worsening',
    last_updated: '2025-12-30T12:00:00Z',
  },
  // City-level data - France
  'paris': {
    location: 'Paris',
    country: 'France',
    tone_score: 0.8,
    volume_level: 'normal',
    article_count_24h: 89,
    themes: {
      'Culture': 35,
      'Tourism': 28,
      'Politics': 18,
      'Protests': 12,
      'Business': 7,
    },
    headlines: [
      { title: 'Louvre sets new visitor record in 2025', url: 'https://example.com/1', source: 'France 24', date: '2025-12-30', tone: 4.5 },
      { title: 'Paris public transport strike ends after negotiations', url: 'https://example.com/2', source: 'Reuters', date: '2025-12-29', tone: 1.2 },
      { title: 'New Year celebrations planned across Paris landmarks', url: 'https://example.com/3', source: 'Le Monde', date: '2025-12-28', tone: 3.8 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  'france': {
    location: 'France',
    country: 'France',
    tone_score: -1.2,
    volume_level: 'normal',
    article_count_24h: 178,
    themes: {
      'Politics': 32,
      'Economy': 24,
      'Protests': 18,
      'Culture': 16,
      'Terrorism': 10,
    },
    headlines: [
      { title: 'French government faces confidence vote', url: 'https://example.com/1', source: 'Reuters', date: '2025-12-30', tone: -3.2 },
      { title: 'French tourism sector posts strong recovery', url: 'https://example.com/2', source: 'Bloomberg', date: '2025-12-29', tone: 4.1 },
      { title: 'Security heightened at major attractions following threats', url: 'https://example.com/3', source: 'AP News', date: '2025-12-28', tone: -4.5 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  // City-level data - Japan
  'tokyo': {
    location: 'Tokyo',
    country: 'Japan',
    tone_score: 3.2,
    volume_level: 'normal',
    article_count_24h: 56,
    themes: {
      'Culture': 32,
      'Business': 28,
      'Tourism': 22,
      'Technology': 12,
      'Politics': 6,
    },
    headlines: [
      { title: 'Tokyo named safest major city for travelers in 2025', url: 'https://example.com/1', source: 'Travel + Leisure', date: '2025-12-30', tone: 6.2 },
      { title: 'Japanese yen weakness draws record foreign tourists', url: 'https://example.com/2', source: 'Bloomberg', date: '2025-12-29', tone: 2.8 },
      { title: 'New bullet train route connects Tokyo to regional cities', url: 'https://example.com/3', source: 'Japan Times', date: '2025-12-28', tone: 4.5 },
    ],
    trend_7day: 'improving',
    last_updated: '2025-12-30T12:00:00Z',
  },
  'japan': {
    location: 'Japan',
    country: 'Japan',
    tone_score: 2.8,
    volume_level: 'normal',
    article_count_24h: 134,
    themes: {
      'Economy': 30,
      'Culture': 25,
      'Politics': 20,
      'Tourism': 18,
      'Technology': 7,
    },
    headlines: [
      { title: 'Japan tourism boom continues despite yen fluctuations', url: 'https://example.com/1', source: 'Reuters', date: '2025-12-30', tone: 3.5 },
      { title: 'Japanese companies report strong Q4 earnings', url: 'https://example.com/2', source: 'Nikkei', date: '2025-12-29', tone: 4.2 },
      { title: 'Japan maintains strict entry requirements for some countries', url: 'https://example.com/3', source: 'AP News', date: '2025-12-28', tone: -1.2 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  // City-level data - Thailand
  'bangkok': {
    location: 'Bangkok',
    country: 'Thailand',
    tone_score: 1.5,
    volume_level: 'normal',
    article_count_24h: 45,
    themes: {
      'Tourism': 38,
      'Politics': 22,
      'Culture': 20,
      'Crime': 12,
      'Business': 8,
    },
    headlines: [
      { title: 'Bangkok street food scene draws global attention', url: 'https://example.com/1', source: 'CNN Travel', date: '2025-12-30', tone: 5.1 },
      { title: 'New airport express line reduces travel times', url: 'https://example.com/2', source: 'Bangkok Post', date: '2025-12-29', tone: 3.2 },
      { title: 'Police warn tourists about common scams in tourist areas', url: 'https://example.com/3', source: 'Thailand News', date: '2025-12-28', tone: -2.1 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  'thailand': {
    location: 'Thailand',
    country: 'Thailand',
    tone_score: 0.8,
    volume_level: 'normal',
    article_count_24h: 98,
    themes: {
      'Tourism': 35,
      'Politics': 28,
      'Economy': 18,
      'Crime': 12,
      'Environment': 7,
    },
    headlines: [
      { title: 'Thailand extends visa-free entry for more countries', url: 'https://example.com/1', source: 'Reuters', date: '2025-12-30', tone: 3.8 },
      { title: 'Southern provinces see uptick in separatist activity', url: 'https://example.com/2', source: 'AP News', date: '2025-12-29', tone: -5.2 },
      { title: 'Thai tourism authority launches new safety campaign', url: 'https://example.com/3', source: 'Travel Weekly', date: '2025-12-28', tone: 2.5 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  // City-level data - Brazil
  'rio de janeiro': {
    location: 'Rio de Janeiro',
    country: 'Brazil',
    tone_score: -3.8,
    volume_level: 'normal',
    article_count_24h: 56,
    themes: {
      'Crime': 32,
      'Tourism': 25,
      'Culture': 20,
      'Politics': 15,
      'Sports': 8,
    },
    headlines: [
      { title: 'Rio police launch new favela pacification program', url: 'https://example.com/1', source: 'Reuters', date: '2025-12-30', tone: -2.5 },
      { title: 'Copacabana beach preps for massive New Year celebration', url: 'https://example.com/2', source: 'BBC', date: '2025-12-29', tone: 4.2 },
      { title: 'Tourist robbed at gunpoint near Christ the Redeemer', url: 'https://example.com/3', source: 'O Globo', date: '2025-12-28', tone: -7.8 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
  'brazil': {
    location: 'Brazil',
    country: 'Brazil',
    tone_score: -4.5,
    volume_level: 'elevated',
    article_count_24h: 189,
    themes: {
      'Crime': 30,
      'Politics': 28,
      'Economy': 22,
      'Environment': 12,
      'Sports': 8,
    },
    headlines: [
      { title: 'Brazil struggles with rising urban violence', url: 'https://example.com/1', source: 'AP News', date: '2025-12-30', tone: -6.5 },
      { title: 'Brazilian real stabilizes after central bank intervention', url: 'https://example.com/2', source: 'Bloomberg', date: '2025-12-29', tone: 2.1 },
      { title: 'Amazon deforestation rates show slight decline', url: 'https://example.com/3', source: 'Reuters', date: '2025-12-28', tone: 1.5 },
    ],
    trend_7day: 'stable',
    last_updated: '2025-12-30T12:00:00Z',
  },
};

// Fallback advisory data for common countries (used when API fails)
const FALLBACK_ADVISORIES: AdvisoryData = {
  'colombia': {
    country: 'Colombia',
    country_code: 'CO',
    advisory_level: 3,
    advisory_text: 'Reconsider travel due to crime and terrorism. Some areas have increased risk.',
    date_updated: '2024-12-15',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/colombia-travel-advisory.html',
  },
  'mexico': {
    country: 'Mexico',
    country_code: 'MX',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime and kidnapping. Some areas have increased risk.',
    date_updated: '2024-12-10',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/mexico-travel-advisory.html',
  },
  'france': {
    country: 'France',
    country_code: 'FR',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to terrorism and civil unrest.',
    date_updated: '2024-11-20',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/france-travel-advisory.html',
  },
  'japan': {
    country: 'Japan',
    country_code: 'JP',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-10-15',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/japan-travel-advisory.html',
  },
  'italy': {
    country: 'Italy',
    country_code: 'IT',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to terrorism.',
    date_updated: '2024-11-05',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/italy-travel-advisory.html',
  },
  'thailand': {
    country: 'Thailand',
    country_code: 'TH',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-15',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/thailand-travel-advisory.html',
  },
  'united kingdom': {
    country: 'United Kingdom',
    country_code: 'GB',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to terrorism.',
    date_updated: '2024-10-20',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/united-kingdom-travel-advisory.html',
  },
  'spain': {
    country: 'Spain',
    country_code: 'ES',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to terrorism.',
    date_updated: '2024-11-10',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/spain-travel-advisory.html',
  },
  'united states': {
    country: 'United States',
    country_code: 'US',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html',
  },
  // Central America
  'guatemala': {
    country: 'Guatemala',
    country_code: 'GT',
    advisory_level: 3,
    advisory_text: 'Reconsider travel due to crime. Some areas have increased risk.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/guatemala-travel-advisory.html',
  },
  'el salvador': {
    country: 'El Salvador',
    country_code: 'SV',
    advisory_level: 3,
    advisory_text: 'Reconsider travel due to crime.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/el-salvador-travel-advisory.html',
  },
  'honduras': {
    country: 'Honduras',
    country_code: 'HN',
    advisory_level: 3,
    advisory_text: 'Reconsider travel due to crime and kidnapping.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/honduras-travel-advisory.html',
  },
  'nicaragua': {
    country: 'Nicaragua',
    country_code: 'NI',
    advisory_level: 3,
    advisory_text: 'Reconsider travel due to limited healthcare availability and arbitrary enforcement of laws.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/nicaragua-travel-advisory.html',
  },
  'costa rica': {
    country: 'Costa Rica',
    country_code: 'CR',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/costa-rica-travel-advisory.html',
  },
  'panama': {
    country: 'Panama',
    country_code: 'PA',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/panama-travel-advisory.html',
  },
  'belize': {
    country: 'Belize',
    country_code: 'BZ',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/belize-travel-advisory.html',
  },
  // South America
  'venezuela': {
    country: 'Venezuela',
    country_code: 'VE',
    advisory_level: 4,
    advisory_text: 'Do not travel due to crime, civil unrest, kidnapping, and the arbitrary enforcement of local laws.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/venezuela-travel-advisory.html',
  },
  'ecuador': {
    country: 'Ecuador',
    country_code: 'EC',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime and civil unrest.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/ecuador-travel-advisory.html',
  },
  'peru': {
    country: 'Peru',
    country_code: 'PE',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime and civil unrest.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/peru-travel-advisory.html',
  },
  'bolivia': {
    country: 'Bolivia',
    country_code: 'BO',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to civil unrest.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/bolivia-travel-advisory.html',
  },
  'chile': {
    country: 'Chile',
    country_code: 'CL',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime and civil unrest.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/chile-travel-advisory.html',
  },
  'argentina': {
    country: 'Argentina',
    country_code: 'AR',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/argentina-travel-advisory.html',
  },
  'uruguay': {
    country: 'Uruguay',
    country_code: 'UY',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/uruguay-travel-advisory.html',
  },
  'paraguay': {
    country: 'Paraguay',
    country_code: 'PY',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/paraguay-travel-advisory.html',
  },
  'brazil': {
    country: 'Brazil',
    country_code: 'BR',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/brazil-travel-advisory.html',
  },
  // Caribbean
  'jamaica': {
    country: 'Jamaica',
    country_code: 'JM',
    advisory_level: 3,
    advisory_text: 'Reconsider travel due to crime. Some areas have increased risk.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/jamaica-travel-advisory.html',
  },
  'aruba': {
    country: 'Aruba',
    country_code: 'AW',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/aruba-travel-advisory.html',
  },
  'curaçao': {
    country: 'Curaçao',
    country_code: 'CW',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/curacao-travel-advisory.html',
  },
  'dominican republic': {
    country: 'Dominican Republic',
    country_code: 'DO',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/dominican-republic-travel-advisory.html',
  },
  'haiti': {
    country: 'Haiti',
    country_code: 'HT',
    advisory_level: 4,
    advisory_text: 'Do not travel due to kidnapping, crime, and civil unrest.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/haiti-travel-advisory.html',
  },
  'puerto rico': {
    country: 'Puerto Rico',
    country_code: 'PR',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html',
  },
  'cuba': {
    country: 'Cuba',
    country_code: 'CU',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/cuba-travel-advisory.html',
  },
  'bahamas': {
    country: 'Bahamas',
    country_code: 'BS',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/bahamas-travel-advisory.html',
  },
  'barbados': {
    country: 'Barbados',
    country_code: 'BB',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/barbados-travel-advisory.html',
  },
  'trinidad and tobago': {
    country: 'Trinidad and Tobago',
    country_code: 'TT',
    advisory_level: 2,
    advisory_text: 'Exercise increased caution due to crime and terrorism.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/trinidad-and-tobago-travel-advisory.html',
  },
  'grenada': {
    country: 'Grenada',
    country_code: 'GD',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/grenada-travel-advisory.html',
  },
  'saint lucia': {
    country: 'Saint Lucia',
    country_code: 'LC',
    advisory_level: 1,
    advisory_text: 'Exercise normal precautions.',
    date_updated: '2024-12-01',
    url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/saint-lucia-travel-advisory.html',
  },
};

function AdvisoryLevelBadge({ level }: { level: number }) {
  const config = ADVISORY_LEVELS[level as keyof typeof ADVISORY_LEVELS] || ADVISORY_LEVELS[1];
  const Icon = config.icon;
  
  return (
    <div 
      className="advisory-badge"
      style={{ 
        backgroundColor: config.style.bg,
        color: config.style.text,
        border: `1px solid ${config.style.border}`,
        borderRadius: UI.radius.pill,
        padding: '8px 14px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: 700,
        fontSize: '12px',
        letterSpacing: '0.02em',
        boxShadow: '0 6px 16px rgba(17, 24, 39, 0.06)',
      }}
    >
      <Icon size={16} strokeWidth={2.25} style={{ color: config.style.icon }} />
      <span>Level {level}</span>
    </div>
  );
}

function SafetyMeter({ level }: { level: number }) {
  const percentage = ((4 - level + 1) / 4) * 100;
  const config = ADVISORY_LEVELS[level as keyof typeof ADVISORY_LEVELS] || ADVISORY_LEVELS[1];
  
  return (
    <div style={{ width: '100%', marginTop: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: COLORS.slate[500], fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        <span>Safety Score</span>
        <span style={{ color: config.style.text }}>{Math.round(percentage)}%</span>
      </div>
      <div style={{ 
        width: '100%', 
        height: '10px', 
        backgroundColor: COLORS.slate[100],
        borderRadius: UI.radius.pill,
        overflow: 'hidden',
        border: `1px solid ${COLORS.slate[200]}`,
      }}>
        <div style={{ 
          width: `${percentage}%`, 
          height: '100%', 
          background: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.blue} 100%)`,
          borderRadius: UI.radius.pill,
          transition: 'width 0.5s ease-out',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: COLORS.slate[400], fontWeight: 500 }}>
        <span>HIGH RISK</span>
        <span>LOW RISK</span>
      </div>
    </div>
  );
}

// ... (rest of the code remains the same)
function DashboardCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: any }) {
  return (
    <div style={{
      backgroundColor: COLORS.white,
      borderRadius: UI.radius.lg,
      padding: '18px',
      boxShadow: UI.shadow.soft,
      border: `1px solid ${COLORS.slate[100]}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        {Icon && <Icon size={20} style={{ color: COLORS.slate[400] }} />}
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: COLORS.slate[900], letterSpacing: '-0.01em' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Nearby Cities Comparison Component
function NearbyCitiesComparison({ currentCity, acledData, gdeltData, advisories, onCityClick }: { 
  currentCity: string; 
  acledData?: ACLEDData; 
  gdeltData?: GDELTData;
  advisories: TravelAdvisory;
  onCityClick?: (cityKey: string) => void;
}) {
  const nearbyCities = getNearbyCities(currentCity);
  
  if (nearbyCities.length === 0) return null;
  
  return (
    <div style={{ marginBottom: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: COLORS.slate[500], marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nearby Cities</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {nearbyCities.map((cityKey) => {
          const cityInfo = CITY_COORDINATES[cityKey];
          if (!cityInfo) return null;
          
          // Get city's data for score calculation
          const cityAcled = FALLBACK_ACLED_DATA[cityKey];
          const cityGdelt = FALLBACK_GDELT_DATA[cityKey];
          
          // Calculate score for this city (simplified - uses country advisory)
          const countryKey = cityInfo.country.toLowerCase();
          const cityAdvisory = FALLBACK_ADVISORIES[countryKey] || advisories;
          const score = calculateSafetyScore(cityAdvisory, cityAcled, cityGdelt);
          const config = getScoreConfig(score);
          
          return (
            <button
              key={cityKey}
              onClick={() => onCityClick?.(cityKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: COLORS.white,
                borderRadius: '6px',
                border: `1px solid ${COLORS.slate[200]}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={`View ${cityInfo.name}, ${cityInfo.country}`}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                color: config.text,
              }}>
                {score}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.slate[700] }}>{cityInfo.name}</div>
                <div style={{ fontSize: '11px', color: COLORS.slate[400] }}>{cityInfo.country}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Cities in Country Component
function CitiesInCountry({ country, advisories, onCityClick }: { 
  country: string; 
  advisories: TravelAdvisory;
  onCityClick?: (cityKey: string) => void;
}) {
  // Find all cities in this country
  const citiesInCountry = Object.entries(CITY_COORDINATES)
    .filter(([_, info]) => info.country.toLowerCase() === country.toLowerCase())
    .slice(0, 6); // Max 6 cities
  
  if (citiesInCountry.length === 0) return null;
  
  return (
    <div style={{ marginBottom: '24px', textAlign: 'center' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: COLORS.slate[500], marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cities in {advisories.country}</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {citiesInCountry.map(([cityKey, cityInfo]) => {
          // Get city's data for score calculation
          const cityAcled = FALLBACK_ACLED_DATA[cityKey];
          const cityGdelt = FALLBACK_GDELT_DATA[cityKey];
          
          const score = calculateSafetyScore(advisories, cityAcled, cityGdelt);
          const config = getScoreConfig(score);
          
          return (
            <button
              key={cityKey}
              onClick={() => onCityClick?.(cityKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: COLORS.white,
                borderRadius: '6px',
                border: `1px solid ${COLORS.slate[200]}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={`View ${cityInfo.name}`}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: config.bg,
                border: `1px solid ${config.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
                color: config.text,
              }}>
                {score}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.slate[700] }}>{cityInfo.name}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Community Sentiment Component
function CommunitySentiment({ location }: { location: string }) {
  const [sentiment, setSentiment] = React.useState<{ safe: number; unsafe: number; total: number; safePercent: number } | null>(null);
  const [hasVoted, setHasVoted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const API_BASE = window.location.hostname === 'localhost' 
    ? `http://localhost:${window.location.port || '8000'}`
    : '';

  React.useEffect(() => {
    const votedLocations = JSON.parse(localStorage.getItem('sentimentVotes') || '{}');
    if (votedLocations[location.toLowerCase()]) {
      setHasVoted(true);
    } else {
      setHasVoted(false);
    }
    
    fetch(`${API_BASE}/api/sentiment?location=${encodeURIComponent(location)}`)
      .then(res => res.json())
      .then(data => setSentiment(data))
      .catch(err => console.error('Failed to load sentiment:', err));
  }, [location]);

  const handleVote = async (vote: 'safe' | 'unsafe') => {
    if (hasVoted || isLoading) return;
    setIsLoading(true);
    
    // Track the vote
    trackEvent('safety_vote', {
      location,
      vote,
      isCity: !!CITY_TO_COUNTRY[location.toLowerCase()],
      country: CITY_TO_COUNTRY[location.toLowerCase()] || location,
    });
    
    try {
      const res = await fetch(`${API_BASE}/api/sentiment?location=${encodeURIComponent(location)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json();
      setSentiment(data);
      setHasVoted(true);
      
      const votedLocations = JSON.parse(localStorage.getItem('sentimentVotes') || '{}');
      votedLocations[location.toLowerCase()] = vote;
      localStorage.setItem('sentimentVotes', JSON.stringify(votedLocations));
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const safePercent = sentiment?.safePercent ?? 50;
  const unsafePercent = 100 - safePercent;

  return (
    <div style={{
      backgroundColor: COLORS.white,
      borderRadius: UI.radius.lg,
      padding: '16px 18px',
      marginBottom: '24px',
      boxShadow: UI.shadow.soft,
      border: `1px solid ${COLORS.slate[100]}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: UI.radius.md, backgroundColor: COLORS.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={14} style={{ color: COLORS.primary }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.slate[900], letterSpacing: '-0.01em' }}>Community Sentiment</span>
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: COLORS.slate[400], textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          {sentiment?.total || 0} votes
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.safe.text, minWidth: '36px' }}>{safePercent}%</span>
        <div style={{ flex: 1, height: '10px', borderRadius: UI.radius.pill, overflow: 'hidden', display: 'flex', backgroundColor: COLORS.slate[100], border: `1px solid ${COLORS.slate[200]}` }}>
          <div style={{ width: `${safePercent}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.safe.text} 0%, #34d399 100%)`, transition: 'width 0.3s' }} />
          <div style={{ width: `${unsafePercent}%`, height: '100%', background: `linear-gradient(90deg, #f87171 0%, ${COLORS.danger.text} 100%)`, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: COLORS.danger.text, minWidth: '36px', textAlign: 'right' }}>{unsafePercent}%</span>
      </div>

      {!hasVoted ? (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => handleVote('safe')}
            disabled={isLoading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: COLORS.safe.bg,
              border: `1px solid ${COLORS.safe.border}`,
              borderRadius: UI.radius.md,
              color: COLORS.safe.text,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ThumbsUp size={15} />
            Safe
          </button>
          <button
            onClick={() => handleVote('unsafe')}
            disabled={isLoading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 16px',
              backgroundColor: COLORS.danger.bg,
              border: `1px solid ${COLORS.danger.border}`,
              borderRadius: UI.radius.md,
              color: COLORS.danger.text,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ThumbsDown size={15} />
            Unsafe
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: '12px', color: COLORS.slate[500], fontWeight: 500, padding: '8px 0' }}>
          Thanks for voting!
        </div>
      )}
    </div>
  );
}

// Calculate composite safety score (1-100) from all data sources
function calculateSafetyScore(advisory: TravelAdvisory, acledData?: ACLEDData, gdeltData?: GDELTData): number {
  let score = 100;
  
  // State Dept advisory level (major factor for country-level)
  // Level 1 = -0, Level 2 = -15, Level 3 = -30, Level 4 = -50
  score -= (advisory.advisory_level - 1) * 15;
  
  // ACLED conflict data (local factor - weighted higher for cities)
  if (acledData) {
    // Events impact: more events = lower score
    if (acledData.total_events > 1000) score -= 15;
    else if (acledData.total_events > 500) score -= 10;
    else if (acledData.total_events > 100) score -= 5;
    
    // Fatalities impact
    if (acledData.fatalities > 500) score -= 10;
    else if (acledData.fatalities > 100) score -= 5;
    
    // Trend impact
    if (acledData.trend === 'increasing') score -= 5;
    else if (acledData.trend === 'decreasing') score += 3;
  }
  
  // GDELT news tone (local sentiment indicator)
  if (gdeltData) {
    // Tone impact: negative tone = concerning
    if (gdeltData.tone_score < -5) score -= 10;
    else if (gdeltData.tone_score < -2) score -= 5;
    else if (gdeltData.tone_score > 2) score += 3;
    
    // Volume spike = something happening
    if (gdeltData.volume_level === 'spike') score -= 8;
    else if (gdeltData.volume_level === 'elevated') score -= 3;
    
    // Trend
    if (gdeltData.trend_7day === 'worsening') score -= 5;
    else if (gdeltData.trend_7day === 'improving') score += 3;
  }
  
  return Math.max(1, Math.min(100, Math.round(score)));
}

function getScoreConfig(score: number) {
  if (score >= 75) return COLORS.safe;
  if (score >= 50) return COLORS.caution;
  if (score >= 25) return COLORS.warning;
  return COLORS.danger;
}

function getScoreLabel(score: number): string {
  if (score >= 75) return 'Low Risk';
  if (score >= 50) return 'Moderate Risk';
  if (score >= 25) return 'Elevated Risk';
  return 'High Risk';
}

 function normalizeExternalUrl(rawUrl: string): string | null {
   const s = (rawUrl || '').trim();
   if (!s) return null;
   if (/^https?:\/\//i.test(s)) {
     try {
       const u = new URL(s);
       if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
       if (u.hostname.toLowerCase() === 'example.com') return null;
       return u.toString();
     } catch {
       return null;
     }
   }

   // Handle scheme-less URLs like //domain.com/path
   if (s.startsWith('//')) {
     return normalizeExternalUrl(`https:${s}`);
   }

   // Do not attempt to guess scheme for relative/other formats
   return null;
 }

function SearchResult({ advisory, ukAdvisory, acledData, gdeltData, searchTerm, isCity, onBack, onCityClick }: { advisory: TravelAdvisory; ukAdvisory?: UKTravelAdvice; acledData?: ACLEDData; gdeltData?: GDELTData; searchTerm: string; isCity: boolean; onBack?: () => void; onCityClick?: (cityKey: string) => void }) {
  const [showMore, setShowMore] = useState(false);
  const config = ADVISORY_LEVELS[advisory.advisory_level as keyof typeof ADVISORY_LEVELS] || ADVISORY_LEVELS[1];
  
  // Calculate composite safety score
  const safetyScore = calculateSafetyScore(advisory, acledData, gdeltData);
  const scoreConfig = getScoreConfig(safetyScore);
  const scoreLabel = getScoreLabel(safetyScore);

   const validHeadlines = useMemo(() => {
     const list = gdeltData?.headlines ?? [];
     return list
       .map((h) => ({ ...h, url: normalizeExternalUrl(h.url) || '' }))
       .filter((h) => Boolean(h.url));
   }, [gdeltData]);
  
  return (
    <div style={{
      backgroundColor: COLORS.white,
      borderRadius: UI.radius.xl,
      padding: '22px',
      boxShadow: UI.shadow.card,
      border: `1px solid ${COLORS.slate[100]}`,
      maxWidth: '600px',
      margin: '0 auto',
    }}>
      {/* Compact Header with Home button and Location on same line */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '16px',
        gap: '12px',
      }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: COLORS.slate[50],
              color: COLORS.slate[600],
              border: `1px solid ${COLORS.slate[200]}`,
              borderRadius: UI.radius.pill,
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          >
            <ChevronUp size={16} style={{ transform: 'rotate(-90deg)' }} />
            Home
          </button>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: onBack ? 'center' : 'flex-start' }}>
          <MapPin size={20} style={{ color: COLORS.slate[400] }} />
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: COLORS.slate[900], letterSpacing: '-0.02em' }}>
            {isCity ? (
              <>
                <span style={{ textTransform: 'capitalize' }}>{searchTerm}</span>
                <span style={{ color: COLORS.slate[500], fontWeight: 400, fontSize: '18px' }}>, {advisory.country}</span>
              </>
            ) : (
              advisory.country
            )}
          </h1>
        </div>
        
        {/* Spacer to balance layout when home button is present */}
        {onBack && <div style={{ width: '80px', flexShrink: 0 }} />}
      </div>
      
      {/* COMPACT SAFETY SCORE - Clean Minimal Layout */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '20px',
        marginBottom: '24px',
        padding: '18px',
        background: `linear-gradient(135deg, ${COLORS.lavender} 0%, ${COLORS.slate[50]} 100%)`,
        borderRadius: UI.radius.lg,
        border: `1px solid ${COLORS.slate[100]}`,
      }}>
        <div style={{ 
          width: '72px', 
          height: '72px', 
          borderRadius: '50%', 
          backgroundColor: COLORS.white,
          border: `4px solid ${scoreConfig.text}`,
          boxShadow: '0 10px 18px rgba(17, 24, 39, 0.10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: scoreConfig.text, lineHeight: 1 }}>{safetyScore}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.slate[900], marginBottom: '4px', letterSpacing: '-0.01em' }}>{scoreLabel}</div>
          <div style={{ fontSize: '14px', color: COLORS.slate[500], lineHeight: 1.5 }}>
            {safetyScore >= 75 ? 'Likely safe for travel. Exercise normal precautions.' :
             safetyScore >= 50 ? 'Exercise increased caution. Be aware of surroundings.' :
             safetyScore >= 25 ? 'Reconsider travel. Significant safety concerns exist.' :
             'Do not travel. Extreme risks present.'}
          </div>
        </div>
      </div>

      {/* Community Sentiment */}
      <CommunitySentiment location={isCity ? searchTerm : advisory.country} />
      
      {/* KEY INSIGHTS - Minimal Grid */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {/* Local News (GDELT) */}
          {gdeltData && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: COLORS.white, 
              borderRadius: UI.radius.md,
              border: `1px solid ${COLORS.slate[100]}`,
              boxShadow: '0 6px 16px rgba(17, 24, 39, 0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: COLORS.slate[500], marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase' }}>News Tone</div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 700, 
                color: gdeltData.tone_score > 0 ? COLORS.safe.text : gdeltData.tone_score < -3 ? COLORS.danger.text : COLORS.warning.text,
              }}>
                {gdeltData.tone_score > 0 ? '+' : ''}{gdeltData.tone_score}
              </div>
              <div style={{ fontSize: '11px', color: COLORS.slate[400] }}>
                {gdeltData.volume_level === 'spike' ? 'High Volume' : 'Normal Vol'}
              </div>
            </div>
          )}
          
          {/* Local Incidents (ACLED) */}
          {acledData && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: COLORS.white, 
              borderRadius: UI.radius.md,
              border: `1px solid ${COLORS.slate[100]}`,
              boxShadow: '0 6px 16px rgba(17, 24, 39, 0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '11px', color: COLORS.slate[500], marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase' }}>Events</div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 700, 
                color: acledData.total_events > 500 ? COLORS.danger.text : acledData.total_events > 100 ? COLORS.warning.text : COLORS.safe.text,
              }}>
                {acledData.total_events.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: COLORS.slate[400] }}>
                Past Year
              </div>
            </div>
          )}
          
          {/* US Advisory Level */}
          <div style={{ 
            padding: '12px', 
            backgroundColor: COLORS.white, 
            borderRadius: UI.radius.md,
            border: `1px solid ${COLORS.slate[100]}`,
            boxShadow: '0 6px 16px rgba(17, 24, 39, 0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', color: COLORS.slate[500], marginBottom: '4px', fontWeight: 500, textTransform: 'uppercase' }}>US Advisory</div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 700, 
              color: config.style.text,
            }}>
              Level {advisory.advisory_level}
            </div>
            <div style={{ fontSize: '11px', color: COLORS.slate[400] }}>
              of 4
            </div>
          </div>
        </div>
      </div>
      
      {/* COMPARE NEARBY CITIES (for city view) */}
      {isCity && (
        <NearbyCitiesComparison 
          currentCity={searchTerm} 
          acledData={acledData}
          gdeltData={gdeltData}
          advisories={advisory}
          onCityClick={onCityClick}
        />
      )}
      
      {/* CITIES IN COUNTRY (for country view) */}
      {!isCity && (
        <CitiesInCountry 
          country={advisory.country}
          advisories={advisory}
          onCityClick={onCityClick}
        />
      )}
      
      {/* Top Headline (just 1 to save space) */}
      {gdeltData && validHeadlines.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <a
            href={validHeadlines[0].url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 12px',
              backgroundColor: COLORS.slate[50],
              borderRadius: '8px',
              border: `1px solid ${COLORS.slate[200]}`,
              textDecoration: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: COLORS.slate[900], fontWeight: 500, lineHeight: 1.3 }}>{validHeadlines[0].title}</div>
              <div style={{ fontSize: '11px', color: COLORS.slate[500], marginTop: '2px' }}>{validHeadlines[0].source}</div>
            </div>
            <ExternalLink size={14} style={{ color: COLORS.slate[400], flexShrink: 0, marginLeft: '8px' }} />
          </a>
        </div>
      )}
      
      {/* SEE MORE BUTTON */}
      <div style={{ textAlign: 'center', marginBottom: showMore ? '24px' : '0' }}>
        <button
          onClick={() => setShowMore(!showMore)}
          style={{
            padding: '10px 24px',
            backgroundColor: showMore ? COLORS.slate[100] : COLORS.white,
            color: showMore ? COLORS.slate[600] : COLORS.primary,
            border: `1px solid ${showMore ? COLORS.slate[300] : COLORS.slate[200]}`,
            borderRadius: '50px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: showMore ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          {showMore ? (
            <>
              <ChevronUp size={16} />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Full Analysis
            </>
          )}
        </button>
      </div>
      
      {/* EXPANDED SECTION - Only visible when showMore is true */}
      {showMore && (
        <div style={{ borderTop: `1px solid ${COLORS.slate[200]}`, paddingTop: '32px' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600, color: COLORS.slate[900] }}>Detailed Analysis</h3>
          
          {/* Full Data Grid - Stack vertically */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
            {/* ACLED Conflict Data Card */}
        {acledData && (
          <DashboardCard title="ACLED Conflict Data" icon={AlertTriangle}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: COLORS.slate[50], 
              borderRadius: '8px',
              border: `1px solid ${COLORS.slate[200]}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: COLORS.warning.icon,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.white,
                  fontSize: '16px',
                  fontWeight: 700,
                }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: COLORS.slate[900] }}>
                    {acledData.location ? `${acledData.location}, ${acledData.country}` : acledData.country}
                  </div>
                  <div style={{ fontSize: '14px', color: COLORS.slate[500] }}>
                    Conflict Data {acledData.location ? '(City-level)' : '(Country-level)'}
                  </div>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: COLORS.white, borderRadius: '6px', border: `1px solid ${COLORS.slate[200]}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.danger.text }}>{acledData.total_events.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: COLORS.slate[500], fontWeight: 500 }}>Events (2025)</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: COLORS.white, borderRadius: '6px', border: `1px solid ${COLORS.slate[200]}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.danger.text }}>{acledData.fatalities.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: COLORS.slate[500], fontWeight: 500 }}>Fatalities</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: COLORS.white, borderRadius: '6px', border: `1px solid ${COLORS.slate[200]}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.warning.text }}>{acledData.events_last_30_days}</div>
                  <div style={{ fontSize: '12px', color: COLORS.slate[500], fontWeight: 500 }}>Last 30 Days</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: COLORS.white, borderRadius: '6px', border: `1px solid ${COLORS.slate[200]}`, textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 700, 
                    color: acledData.trend === 'increasing' ? COLORS.danger.text : acledData.trend === 'decreasing' ? COLORS.safe.text : COLORS.slate[500] 
                  }}>
                    {acledData.trend === 'increasing' ? '↑ Increasing' : acledData.trend === 'decreasing' ? '↓ Decreasing' : '→ Stable'}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.slate[500], fontWeight: 500 }}>Trend</div>
                </div>
              </div>
              
              {/* Event Types */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.slate[900], marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Types</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {Object.entries(acledData.event_types).slice(0, 5).map(([type, count]) => (
                    <div key={type} style={{ 
                      padding: '6px 10px', 
                      backgroundColor: COLORS.white, 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      border: `1px solid ${COLORS.slate[200]}`,
                      color: COLORS.slate[700],
                      fontWeight: 500,
                    }}>
                      <span style={{ color: COLORS.slate[500] }}>{type}:</span>{' '}
                      <span style={{ fontWeight: 600, color: COLORS.slate[900] }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate[500], fontSize: '13px', marginBottom: '16px' }}>
                <Calendar size={14} />
                <span>Updated: {new Date(acledData.last_updated).toLocaleDateString()}</span>
              </div>
              <a 
                href={`https://acleddata.com/curated-data-files/#regional-overviews`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: COLORS.white,
                  color: COLORS.primary,
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: `1px solid ${COLORS.slate[200]}`,
                  transition: 'all 0.2s',
                }}
              >
                <ExternalLink size={14} />
                View ACLED Dashboard
              </a>
            </div>
          </DashboardCard>
        )}
        
        {/* GDELT News Analysis Card */}
        {gdeltData && (
          <DashboardCard title="GDELT News Analysis" icon={Globe}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: COLORS.slate[50], 
              borderRadius: '8px',
              border: `1px solid ${COLORS.slate[200]}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: COLORS.safe.icon,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.white,
                  fontSize: '16px',
                  fontWeight: 700,
                }}>
                  <Globe size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: COLORS.slate[900] }}>
                    {gdeltData.location}
                  </div>
                  <div style={{ fontSize: '14px', color: COLORS.slate[500] }}>
                    Global News Monitoring {gdeltData.location !== gdeltData.country ? '(City-level)' : '(Country-level)'}
                  </div>
                </div>
              </div>
              
              {/* Sentiment & Volume Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ padding: '12px', backgroundColor: COLORS.white, borderRadius: '6px', border: `1px solid ${COLORS.slate[200]}`, textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 700, 
                    color: gdeltData.tone_score > 0 ? COLORS.safe.text : gdeltData.tone_score < -3 ? COLORS.danger.text : COLORS.warning.text 
                  }}>
                    {gdeltData.tone_score > 0 ? '+' : ''}{gdeltData.tone_score}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.slate[500], fontWeight: 500 }}>News Tone</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: COLORS.white, borderRadius: '6px', border: `1px solid ${COLORS.slate[200]}`, textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 700, 
                    color: gdeltData.volume_level === 'spike' ? COLORS.danger.text : gdeltData.volume_level === 'elevated' ? COLORS.warning.text : COLORS.safe.text 
                  }}>
                    {gdeltData.volume_level === 'spike' ? '🔴 Spike' : gdeltData.volume_level === 'elevated' ? '🟡 Elevated' : '🟢 Normal'}
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.slate[500], fontWeight: 500 }}>Volume</div>
                </div>
                <div style={{ padding: '12px', backgroundColor: COLORS.white, borderRadius: '6px', border: `1px solid ${COLORS.slate[200]}`, textAlign: 'center', minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 700, 
                    color: gdeltData.trend_7day === 'worsening' ? COLORS.danger.text : gdeltData.trend_7day === 'improving' ? COLORS.safe.text : COLORS.slate[500],
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}>
                    <span>{gdeltData.trend_7day === 'worsening' ? '↓' : gdeltData.trend_7day === 'improving' ? '↑' : '→'}</span>
                    <span>{gdeltData.trend_7day === 'worsening' ? 'Worsening' : gdeltData.trend_7day === 'improving' ? 'Improving' : 'Stable'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: COLORS.slate[500], fontWeight: 500 }}>7-Day Trend</div>
                </div>
              </div>
              
              {/* Theme Breakdown */}
              {Object.keys(gdeltData.themes).length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.slate[900], marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Themes</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(gdeltData.themes).slice(0, 5).map(([theme, pct]) => (
                      <div key={theme} style={{ 
                        padding: '6px 10px', 
                        backgroundColor: COLORS.white, 
                        borderRadius: '6px', 
                        fontSize: '12px',
                        border: `1px solid ${COLORS.slate[200]}`,
                        color: COLORS.slate[700],
                        fontWeight: 500,
                      }}>
                        <span style={{ color: COLORS.slate[500] }}>{theme}:</span>{' '}
                        <span style={{ fontWeight: 600, color: COLORS.slate[900] }}>{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recent Headlines */}
              {validHeadlines.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.slate[900], marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Headlines</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {validHeadlines.slice(0, 3).map((headline, index) => (
                      <a
                        key={index}
                        href={headline.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '12px',
                          backgroundColor: COLORS.white,
                          borderRadius: '6px',
                          border: `1px solid ${COLORS.slate[200]}`,
                          textDecoration: 'none',
                          display: 'block',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ 
                          fontSize: '14px', 
                          color: COLORS.slate[900], 
                          fontWeight: 500,
                          marginBottom: '4px',
                          lineHeight: 1.4,
                        }}>
                          {headline.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: COLORS.slate[500] }}>
                          <span>{headline.source}</span>
                          <span style={{ color: COLORS.slate[300] }}>•</span>
                          <span style={{ 
                            color: headline.tone > 0 ? COLORS.safe.text : headline.tone < -3 ? COLORS.danger.text : COLORS.warning.text,
                            fontWeight: 500,
                          }}>
                            Tone: {headline.tone > 0 ? '+' : ''}{headline.tone.toFixed(1)}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate[500], fontSize: '13px', marginBottom: '16px' }}>
                <Calendar size={14} />
                <span>Data from GDELT • {gdeltData.article_count_24h} articles in 24h</span>
              </div>
              <a 
                href={`https://gdeltproject.org/`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: COLORS.white,
                  color: COLORS.primary,
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: `1px solid ${COLORS.slate[200]}`,
                  transition: 'all 0.2s',
                }}
              >
                <ExternalLink size={14} />
                View GDELT Project
              </a>
            </div>
          </DashboardCard>
        )}
            
            {/* US State Department Card - Combined with Advisory Details */}
            <DashboardCard title="US State Department" icon={Shield}>
              <div style={{ 
                padding: '16px', 
                backgroundColor: config.style.bg, 
                borderRadius: '8px',
                border: `1px solid ${config.style.border}`,
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: config.style.icon,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.white,
                    fontSize: '18px',
                    fontWeight: 700,
                  }}>
                    {advisory.advisory_level}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: COLORS.slate[900] }}>Level {advisory.advisory_level}</div>
                    <div style={{ fontSize: '14px', color: config.style.text }}>{config.label}</div>
                  </div>
                </div>
              </div>
              <SafetyMeter level={advisory.advisory_level} />
              <p style={{ margin: '16px 0', color: COLORS.slate[700], lineHeight: 1.6, fontSize: '14px' }}>
                {advisory.advisory_text}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate[500], fontSize: '13px' }}>
                <Calendar size={14} />
                <span>Updated: {advisory.date_updated}</span>
              </div>
              <a 
                href={advisory.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '16px',
                  padding: '8px 16px',
                  backgroundColor: COLORS.white,
                  color: COLORS.primary,
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: `1px solid ${COLORS.slate[200]}`,
                  transition: 'all 0.2s',
                }}
              >
                <ExternalLink size={14} />
                View Full Advisory
              </a>
            </DashboardCard>
        
        {/* UK Foreign Office Card */}
        {ukAdvisory && (
          <DashboardCard title="UK Foreign Office" icon={Shield}>
            <div style={{ 
              padding: '16px', 
              backgroundColor: COLORS.slate[50], 
              borderRadius: '8px',
              border: `1px solid ${COLORS.slate[200]}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: COLORS.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.white,
                  fontSize: '16px',
                  fontWeight: 700,
                }}>
                  UK
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: COLORS.slate[900] }}>FCO Travel Advice</div>
                  <div style={{ fontSize: '14px', color: COLORS.slate[500] }}>Foreign, Commonwealth & Development Office</div>
                </div>
              </div>
              {ukAdvisory.alert_status.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.danger.text, marginBottom: '8px', textTransform: 'uppercase' }}>
                    Travel Alerts
                  </div>
                  {ukAdvisory.alert_status.map((status, index) => (
                    <div key={index} style={{ 
                      padding: '8px 12px', 
                      backgroundColor: COLORS.danger.bg, 
                      borderRadius: '6px', 
                      fontSize: '13px', 
                      color: COLORS.danger.text,
                      marginBottom: '6px',
                      border: `1px solid ${COLORS.danger.border}`,
                      fontWeight: 500,
                    }}>
                      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  ))}
                </div>
              )}
              <p style={{ margin: '0 0 16px 0', color: COLORS.slate[700], lineHeight: 1.6, fontSize: '14px' }}>
                {ukAdvisory.change_description}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.slate[500], fontSize: '13px', marginBottom: '16px' }}>
                <Calendar size={14} />
                <span>Updated: {new Date(ukAdvisory.last_updated).toLocaleDateString()}</span>
              </div>
              <a 
                href={ukAdvisory.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: COLORS.white,
                  color: COLORS.primary,
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: `1px solid ${COLORS.slate[200]}`,
                  transition: 'all 0.2s',
                }}
              >
                <ExternalLink size={14} />
                View UK Advice
              </a>
            </div>
          </DashboardCard>
        )}
          </div>
          
          {/* Advisory Level Legend */}
          <div style={{ 
            padding: '16px', 
            backgroundColor: COLORS.slate[50], 
            borderRadius: '12px',
            border: `1px solid ${COLORS.slate[200]}`,
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: COLORS.slate[900], textTransform: 'uppercase', letterSpacing: '0.05em' }}>Advisory Levels</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {Object.entries(ADVISORY_LEVELS).map(([level, info]) => {
                const Icon = info.icon;
                const isCurrentLevel = Number(level) === advisory.advisory_level;
                return (
                  <div 
                    key={level}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      backgroundColor: info.style.bg,
                      borderRadius: '6px',
                      fontSize: '13px',
                      border: isCurrentLevel ? `3px solid ${info.style.icon}` : `1px solid ${info.style.border}`,
                      boxShadow: isCurrentLevel ? `0 0 12px ${info.style.icon}40` : 'none',
                      transform: isCurrentLevel ? 'scale(1.02)' : 'scale(1)',
                      position: 'relative',
                    }}
                  >
                    <Icon size={16} style={{ color: info.style.icon }} />
                    <span style={{ fontWeight: 600, color: info.style.text }}>Level {level}:</span>
                    <span style={{ color: COLORS.slate[600] }}>{info.label}</span>
                    {isCurrentLevel && (
                      <span style={{ 
                        marginLeft: 'auto', 
                        padding: '2px 8px', 
                        backgroundColor: info.style.icon, 
                        color: COLORS.white, 
                        borderRadius: '12px', 
                        fontSize: '10px', 
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* City-specific note in expanded */}
          {isCity && (
            <div style={{
              marginTop: '16px',
              padding: '14px',
              backgroundColor: COLORS.primary + '10', // 10% opacity
              borderRadius: '10px',
              border: `1px solid ${COLORS.primary}30`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}>
              <Info size={18} style={{ color: COLORS.primary, flexShrink: 0, marginTop: '2px' }} />
              <div style={{ color: COLORS.slate[700], fontSize: '13px', lineHeight: 1.5 }}>
                <strong style={{ color: COLORS.primary }}>Note:</strong> Government advisories apply to {advisory.country} as a whole. 
                Local data (ACLED, GDELT) is specific to <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{searchTerm}</span>.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TravelSafety({ initialData }: { initialData?: any }) {
  // Extract location from hydration data
  const initialLocation = initialData?.location || initialData?.city || initialData?.country || '';
  const [searchQuery, setSearchQuery] = useState(initialLocation);
  const [searchResult, setSearchResult] = useState<{ advisory: TravelAdvisory; ukAdvisory?: UKTravelAdvice; acledData?: ACLEDData; gdeltData?: GDELTData; isCity: boolean; searchTerm: string } | null>(null);
  const [advisories, setAdvisories] = useState<AdvisoryData>(FALLBACK_ADVISORIES);
  const [ukAdvisories, setUkAdvisories] = useState<UKAdvisoryData>(FALLBACK_UK_ADVISORIES);
  const [acledData, setAcledData] = useState<ACLEDAdvisoryData>(FALLBACK_ACLED_DATA);
  const [gdeltData, setGdeltData] = useState<GDELTAdvisoryData>(FALLBACK_GDELT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  // Footer modal states
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [email, setEmail] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscribeMessage, setSubscribeMessage] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  // App enjoyment vote state
  const [enjoyVote, setEnjoyVote] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem('enjoyVote');
      if (v === 'up' || v === 'down') setEnjoyVote(v);
    } catch {}
  }, []);

  const handleEnjoyVote = (vote: 'up' | 'down') => {
    if (enjoyVote) return;

    setEnjoyVote(vote);
    try { localStorage.setItem('enjoyVote', vote); } catch {}

    trackEvent('app_enjoyment_vote', {
      vote,
      location: searchResult?.searchTerm || null,
      isCity: searchResult?.isCity ?? null,
    });

    // Open feedback modal after voting
    setShowFeedbackModal(true);
  };

  // Footer handlers
  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setSubscribeMessage('Please enter a valid email.');
      setSubscribeStatus('error');
      return;
    }
    setSubscribeStatus('loading');
    try {
      const response = await fetch(`${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          settlementId: 'travel-safety-alerts',
          settlementName: 'Travel Safety Alerts'
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubscribeStatus('success');
        setSubscribeMessage(data.message || 'Successfully subscribed!');
        trackEvent('subscribe', { email: email.split('@')[1] }); // Track domain only for privacy
        setTimeout(() => {
          setShowSubscribeModal(false);
          setEmail('');
          setSubscribeStatus('idle');
          setSubscribeMessage('');
        }, 3000);
      } else {
        setSubscribeStatus('error');
        setSubscribeMessage(data.error || 'Failed to subscribe.');
      }
    } catch (e) {
      setSubscribeStatus('error');
      setSubscribeMessage('Network error. Please try again.');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackStatus('submitting');
    try {
      const response = await fetch(`${API_BASE}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'user_feedback',
          data: { 
            feedback: feedbackText, 
            location: searchResult?.searchTerm || 'none',
            enjoymentVote: enjoyVote || null, // Include the thumbs up/down vote if present
          }
        })
      });
      if (response.ok) {
        setFeedbackStatus('success');
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackText('');
          setFeedbackStatus('idle');
        }, 2000);
      } else {
        setFeedbackStatus('error');
      }
    } catch (e) {
      setFeedbackStatus('error');
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setSearchResult(null);
    setError(null);
    trackEvent('reset', {});
  };

  const createPlaceholderAdvisory = (countryKey: string, countryName: string): TravelAdvisory => {
    return {
      country: countryName,
      country_code: '',
      advisory_level: 2,
      advisory_text: `Official advisory data is not available for ${countryName} right now. This is a placeholder summary — verify via official sources before traveling.`,
      date_updated: new Date().toISOString().split('T')[0],
      url: 'https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html',
    };
  };

  // Track app open and session duration
  useEffect(() => {
    const sessionStart = Date.now();
    const sessionId = Math.random().toString(36).substring(2, 15);
    
    // Track app open
    trackEvent('app_open', {
      sessionId,
      referrer: document.referrer || 'direct',
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    });

    // Track session end on unload
    const handleUnload = () => {
      const duration = Math.round((Date.now() - sessionStart) / 1000);
      // Use sendBeacon for reliable tracking on page unload
      const data = JSON.stringify({
        event: 'session_end',
        data: {
          sessionId,
          durationSeconds: duration,
          timestamp: new Date().toISOString(),
        },
      });
      navigator.sendBeacon(`${API_BASE}/api/track`, data);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // Load advisories on mount
  useEffect(() => {
    Promise.all([
      fetchStateAdvisories(),
      fetchUKAdvisories()
    ]).then(([usData, ukData]) => {
      if (Object.keys(usData).length > 0) {
        setAdvisories({ ...FALLBACK_ADVISORIES, ...usData });
      }
      if (Object.keys(ukData).length > 0) {
        setUkAdvisories({ ...FALLBACK_UK_ADVISORIES, ...ukData });
      }
      setApiLoaded(true);
    });
  }, []);

  // Auto-search if initialData has a location (hydration from ChatGPT prompt)
  useEffect(() => {
    if (initialLocation && apiLoaded) {
      console.log("[TravelSafety] Auto-searching for:", initialLocation);
      searchFor(initialLocation);
    }
  }, [initialLocation, apiLoaded]);

  const searchFor = async (rawQuery: string) => {
    if (!rawQuery.trim()) return;

    setLoading(true);
    setError(null);

    let query = rawQuery.trim().toLowerCase();
    
    // Handle "City, Country" format from ChatGPT (e.g., "Bali, Indonesia" -> "bali")
    if (query.includes(',')) {
      const parts = query.split(',').map(p => p.trim());
      const cityPart = parts[0];
      // Try the city part first with aliases
      const aliasedCity = CITY_ALIASES[cityPart] || cityPart;
      if (CITY_TO_COUNTRY[aliasedCity] || CITY_COORDINATES[aliasedCity]) {
        query = cityPart;
      } else if (parts.length > 1) {
        // Try the country part (in case format is "Country, Region")
        const countryPart = parts[1];
        if (advisories[countryPart] || FALLBACK_ADVISORIES[countryPart]) {
          query = countryPart;
        }
      }
    }
    
    const normalizedQuery = CITY_ALIASES[query] || query;
    
    // Track the search
    const isCity = !!CITY_TO_COUNTRY[normalizedQuery];
    trackEvent('search_location', {
      query: rawQuery,
      normalizedQuery,
      isCity,
      country: isCity ? CITY_TO_COUNTRY[normalizedQuery] : normalizedQuery,
      city: isCity ? normalizedQuery : undefined,
    });
    
    // Check if it's a city
    const countryFromCity = CITY_TO_COUNTRY[normalizedQuery];
    if (countryFromCity) {
      const countryKey = countryFromCity.toLowerCase();
      const advisory = advisories[countryKey] || FALLBACK_ADVISORIES[countryKey] || createPlaceholderAdvisory(countryKey, countryFromCity);
      let ukAdvisory = ukAdvisories[countryKey];
      if (!ukAdvisory) {
        const fetchedUk = await fetchUKAdvice(countryKey);
        if (fetchedUk) {
          ukAdvisory = fetchedUk;
          setUkAdvisories((prev) => ({ ...prev, [countryKey]: fetchedUk }));
        }
      }
      // Use city-specific ACLED and GDELT data if available, otherwise fall back to country
      const cityInfo = CITY_COORDINATES[normalizedQuery];
      const locationQuery = cityInfo ? `${cityInfo.name}, ${countryFromCity}` : `${normalizedQuery}, ${countryFromCity}`;

      const acled =
        acledData[normalizedQuery] ||
        acledData[countryKey] ||
        FALLBACK_ACLED_DATA[normalizedQuery] ||
        FALLBACK_ACLED_DATA[countryKey] ||
        (await fetchACLEDData(countryFromCity)) ||
        undefined;

      const gdelt =
        gdeltData[normalizedQuery] ||
        gdeltData[countryKey] ||
        FALLBACK_GDELT_DATA[normalizedQuery] ||
        FALLBACK_GDELT_DATA[countryKey] ||
        (await fetchGDELTData(locationQuery)) ||
        undefined;


      setSearchResult({ advisory, ukAdvisory, acledData: acled, gdeltData: gdelt, isCity: true, searchTerm: normalizedQuery });
      setLoading(false);
      return;
    }
    
    // Check if it's a country
    const advisory = advisories[normalizedQuery];
    const ukAdvisory = ukAdvisories[normalizedQuery];
    const acled = acledData[normalizedQuery];
    const gdelt = gdeltData[normalizedQuery];
    if (advisory) {
      setSearchResult({ advisory, ukAdvisory, acledData: acled, gdeltData: gdelt, isCity: false, searchTerm: normalizedQuery });
      setLoading(false);
      return;
    }
    
    // Fuzzy match - find countries that contain the search term
    const partialMatch = Object.entries(advisories).find(([key, value]) => 
      key.includes(query) || value.country.toLowerCase().includes(query)
    );
    
    if (partialMatch) {
      const ukAdvisory = ukAdvisories[partialMatch[0]];
      const acled = acledData[partialMatch[0]];
      const gdelt = gdeltData[partialMatch[0]];
      setSearchResult({ advisory: partialMatch[1], ukAdvisory, acledData: acled, gdeltData: gdelt, isCity: false, searchTerm: partialMatch[1].country.toLowerCase() });
      setLoading(false);
      return;
    }
    
    setError(`No travel advisory found for "${rawQuery}". Try searching for a country name like "Colombia" or a major city like "Medellin".`);
    setSearchResult(null);
    setLoading(false);
  };

  const handleSearch = () => searchFor(searchQuery);

  const geoInsights = useMemo(() => {
    type CityInsight = {
      key: string;
      name: string;
      country: string;
      score: number;
      momentum: number;
    };

    const cities: CityInsight[] = Object.entries(CITY_COORDINATES)
      .map(([cityKey, info]) => {
        const countryKey = info.country.toLowerCase();
        const advisory = advisories[countryKey] || FALLBACK_ADVISORIES[countryKey];
        const acled = acledData[cityKey] || acledData[countryKey] || FALLBACK_ACLED_DATA[cityKey];
        const gdelt = gdeltData[cityKey] || gdeltData[countryKey] || FALLBACK_GDELT_DATA[cityKey];

        // Only include cities with all 4 data points (advisory, UK advisory via country, ACLED, GDELT)
        if (!advisory || !acled || !gdelt) return null;

        const score = calculateSafetyScore(advisory, acled, gdelt);

        let momentum = 0;
        if (gdelt.trend_7day === 'improving') momentum += 2;
        if (gdelt.trend_7day === 'worsening') momentum -= 2;
        if (gdelt.tone_score >= 2) momentum += 1;
        if (gdelt.tone_score <= -3) momentum -= 1;
        if (gdelt.volume_level === 'spike') momentum -= 1;
        if (acled.trend === 'decreasing') momentum += 2;
        if (acled.trend === 'increasing') momentum -= 2;
        if (acled.events_last_30_days <= 5) momentum += 1;
        if (acled.events_last_30_days >= 30) momentum -= 1;

        return {
          key: cityKey,
          name: info.name,
          country: info.country,
          score,
          momentum,
        };
      })
      .filter((c): c is CityInsight => c !== null);

    const safest = [...cities].sort((a, b) => b.score - a.score).slice(0, 5);
    const dangerous = [...cities].sort((a, b) => a.score - b.score).slice(0, 5);
    const improving = [...cities].sort((a, b) => b.momentum - a.momentum).slice(0, 5);
    const worsening = [...cities].sort((a, b) => a.momentum - b.momentum).slice(0, 5);

    return { safest, dangerous, improving, worsening };
  }, [acledData, advisories, gdeltData]);

  const citySuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as Array<{ key: string; label: string; sublabel: string; canonicalKey: string }>;

    const entries = Object.entries(CITY_COORDINATES).map(([key, info]) => ({
      key,
      label: info.name,
      sublabel: info.country,
      canonicalKey: key,
    }));

    const aliasEntries = Object.entries(CITY_ALIASES)
      .filter(([alias, canonical]) => {
        if (!CITY_COORDINATES[canonical]) return false;
        const info = CITY_COORDINATES[canonical];
        return alias.includes(q) || canonical.includes(q) || info.name.toLowerCase().includes(q);
      })
      .map(([alias, canonical]) => {
        const info = CITY_COORDINATES[canonical];
        return {
          key: alias,
          label: info.name,
          sublabel: info.country,
          canonicalKey: canonical,
        };
      });

    const all = [...aliasEntries, ...entries].filter((c) => {
      const name = c.label.toLowerCase();
      const country = c.sublabel.toLowerCase();
      return c.key.includes(q) || c.canonicalKey.includes(q) || name.includes(q) || country.includes(q);
    });

    const uniq = new Map<string, { key: string; label: string; sublabel: string; canonicalKey: string }>();
    for (const c of all) {
      if (!uniq.has(c.canonicalKey)) uniq.set(c.canonicalKey, c);
    }

    const scored = [...uniq.values()].map((c) => {
      const name = c.label.toLowerCase();
      const key = c.key.toLowerCase();
      const canonical = c.canonicalKey.toLowerCase();
      const starts = key.startsWith(q) || canonical.startsWith(q) || name.startsWith(q) ? 0 : 1;
      const exact = key === q || canonical === q ? -1 : 0;
      return { c, s: exact + starts };
    });

    return scored
      .sort((a, b) => a.s - b.s || a.c.label.localeCompare(b.c.label))
      .slice(0, 8)
      .map(({ c }) => c);
  }, [searchQuery]);

  const popularSearches = ['Colombia', 'Mexico', 'Japan', 'France', 'Thailand', 'Italy'];

    return (
    <div style={{
      backgroundColor: COLORS.cream,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif',
      color: COLORS.navy,
      position: 'relative', // Container for sticky pill
      minHeight: '100vh',
    }}>
      {/* Hero Section - Only show when no search result */}
      {!searchResult && (
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.lavender} 0%, ${COLORS.cream} 45%, ${COLORS.white} 100%)`,
        padding: '44px 24px 32px',
        textAlign: 'center',
        borderBottomLeftRadius: '28px',
        borderBottomRightRadius: '28px',
        color: COLORS.navy,
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.blue} 100%)`,
              borderRadius: '14px', 
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: UI.shadow.input,
            }}>
              <Globe size={26} style={{ color: COLORS.white }} />
            </div>
            <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 800, color: COLORS.slate[900], letterSpacing: '-0.03em' }}>
              Travel Safety Index
            </h1>
          </div>
          <p style={{ margin: '0 0 24px 0', fontSize: '16px', color: COLORS.slate[600], maxWidth: '540px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Real-time safety assessments from official government sources and global news data.
          </p>
          
          {/* Search Bar - Vibrant & Bold */}
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 10,
          }}>
            <div style={{
              display: 'flex',
              backgroundColor: COLORS.white,
              borderRadius: UI.radius.pill,
              overflow: 'hidden',
              boxShadow: UI.shadow.input,
              border: `1px solid ${COLORS.slate[100]}`,
            }}>
              <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: COLORS.slate[400] }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setActiveSuggestionIndex(0);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowSuggestions(false), 150);
                }}
                onKeyDown={(e) => {
                  const q = searchQuery.trim().toLowerCase();
                  const isCityQuery = Boolean(CITY_TO_COUNTRY[q] || CITY_TO_COUNTRY[CITY_ALIASES[q] || ''] || CITY_COORDINATES[q]);

                  if (e.key === 'Escape') {
                    setShowSuggestions(false);
                    return;
                  }

                  if (showSuggestions && citySuggestions.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveSuggestionIndex((i) => Math.min(i + 1, citySuggestions.length - 1));
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveSuggestionIndex((i) => Math.max(i - 1, 0));
                      return;
                    }
                    if (e.key === 'Enter' && isCityQuery) {
                      e.preventDefault();
                      const selected = citySuggestions[activeSuggestionIndex];
                      if (selected) {
                        setSearchQuery(selected.key);
                        setShowSuggestions(false);
                        searchFor(selected.canonicalKey);
                      }
                      return;
                    }
                  }

                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="Search city or country..."
                style={{
                  width: '100%',
                  padding: '16px 16px 16px 48px',
                  fontSize: '15px',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: COLORS.slate[900],
                  fontWeight: 600,
                }}
              />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                style={{
                  padding: '0 32px',
                  background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.blue} 100%)`,
                  color: COLORS.white,
                  border: 'none',
                  borderLeft: `1px solid ${COLORS.slate[100]}`,
                  cursor: loading ? 'wait' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  transition: 'all 0.2s',
                  letterSpacing: '0.02em',
                }}
              >
                {loading ? '...' : 'Search'}
              </button>
            </div>

            {showSuggestions && citySuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  left: '0',
                  right: '0',
                  backgroundColor: COLORS.white,
                  borderRadius: UI.radius.lg,
                  border: `1px solid ${COLORS.slate[100]}`,
                  boxShadow: UI.shadow.card,
                  overflow: 'hidden',
                  maxHeight: '280px',
                  zIndex: 50,
                }}
              >
                {citySuggestions.map((c, idx) => {
                  const active = idx === activeSuggestionIndex;
                  return (
                    <button
                      key={c.canonicalKey}
                      onMouseEnter={() => setActiveSuggestionIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSearchQuery(c.key);
                        setShowSuggestions(false);
                        searchFor(c.canonicalKey);
                      }}
                      style={{
                        width: '100%',
                        border: 'none',
                        backgroundColor: active ? COLORS.lavender : COLORS.white,
                        color: COLORS.slate[900],
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.slate[900], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
                        <div style={{ fontSize: '11px', color: COLORS.slate[500], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sublabel}</div>
                      </div>
                      <div style={{ flexShrink: 0, fontSize: '11px', color: COLORS.slate[400], fontWeight: 600 }}>
                        City
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Popular Searches */}
          <div style={{ marginTop: '20px' }}>
            <span style={{ color: COLORS.slate[500], fontSize: '12px', marginRight: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trending:</span>
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term);
                  searchFor(term);
                }}
                style={{
                  padding: '6px 14px',
                  margin: '4px',
                  backgroundColor: COLORS.white,
                  color: COLORS.primary,
                  border: `1px solid ${COLORS.slate[100]}`,
                  borderRadius: UI.radius.pill,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  boxShadow: '0 6px 14px rgba(17, 24, 39, 0.06)',
                }}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}
      
      {/* Results Section */}
      <div style={{ padding: '8px 24px 48px', maxWidth: '1000px', margin: '0 auto' }}>
        {error && (
          <div style={{
            maxWidth: '600px',
            margin: '0 auto 32px',
            padding: '16px 24px',
            backgroundColor: COLORS.danger.bg,
            borderRadius: '8px',
            border: `1px solid ${COLORS.danger.border}`,
            color: COLORS.danger.text,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            fontWeight: 500,
          }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        
        {searchResult && (
          <SearchResult 
            advisory={searchResult.advisory}
            ukAdvisory={searchResult.ukAdvisory}
            acledData={searchResult.acledData}
            gdeltData={searchResult.gdeltData}
            searchTerm={searchResult.searchTerm}
            isCity={searchResult.isCity}
            onBack={() => {
              setSearchResult(null);
              setSearchQuery('');
              setError(null);
            }}
            onCityClick={(cityKey) => {
              setSearchQuery(cityKey);
              searchFor(cityKey);
            }}
          />
        )}
        
        {!searchResult && !error && (
          <div style={{ maxWidth: '880px', margin: '8px auto 0' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: UI.radius.pill, backgroundColor: COLORS.white, border: `1px solid ${COLORS.slate[100]}`, boxShadow: '0 10px 24px rgba(17, 24, 39, 0.06)' }}>
                <Shield size={18} style={{ color: COLORS.primary }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.slate[700], textTransform: 'uppercase', letterSpacing: '0.08em' }}>Geo Insights</span>
              </div>
              <div style={{ marginTop: '10px', fontSize: '14px', color: COLORS.slate[500], lineHeight: 1.6 }}>
                Learn from recent advisories and local signals — click any city to explore.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {/* Safest Cities */}
              <div style={{ backgroundColor: COLORS.white, borderRadius: UI.radius.lg, boxShadow: UI.shadow.soft, border: `1px solid ${COLORS.slate[100]}`, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.slate[900], letterSpacing: '-0.01em' }}>Safest Cities</div>
                  <div style={{ width: '28px', height: '28px', borderRadius: UI.radius.md, backgroundColor: COLORS.safe.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} style={{ color: COLORS.safe.text }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {geoInsights.safest.map((c) => {
                    const s = getScoreConfig(c.score);
                    return (
                      <button
                        key={c.key}
                        onClick={() => {
                          setSearchQuery(c.key);
                          searchFor(c.key);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.slate[50],
                          border: `1px solid ${COLORS.slate[100]}`,
                          borderRadius: UI.radius.md,
                          padding: '10px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.slate[900], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: COLORS.slate[500], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.country}</div>
                        </div>
                        <div style={{ flexShrink: 0, padding: '6px 10px', borderRadius: UI.radius.pill, backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: '12px', fontWeight: 800 }}>
                          {c.score}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Most Dangerous Cities */}
              <div style={{ backgroundColor: COLORS.white, borderRadius: UI.radius.lg, boxShadow: UI.shadow.soft, border: `1px solid ${COLORS.slate[100]}`, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.slate[900], letterSpacing: '-0.01em' }}>Most Dangerous</div>
                  <div style={{ width: '28px', height: '28px', borderRadius: UI.radius.md, backgroundColor: COLORS.danger.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown size={16} style={{ color: COLORS.danger.text }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {geoInsights.dangerous.map((c) => {
                    const s = getScoreConfig(c.score);
                    return (
                      <button
                        key={c.key}
                        onClick={() => {
                          setSearchQuery(c.key);
                          searchFor(c.key);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.slate[50],
                          border: `1px solid ${COLORS.slate[100]}`,
                          borderRadius: UI.radius.md,
                          padding: '10px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.slate[900], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: COLORS.slate[500], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.country}</div>
                        </div>
                        <div style={{ flexShrink: 0, padding: '6px 10px', borderRadius: UI.radius.pill, backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: '12px', fontWeight: 800 }}>
                          {c.score}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Most Improved (30d) */}
              <div style={{ backgroundColor: COLORS.white, borderRadius: UI.radius.lg, boxShadow: UI.shadow.soft, border: `1px solid ${COLORS.slate[100]}`, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.slate[900], letterSpacing: '-0.01em' }}>Most Improved (30d)</div>
                  <div style={{ width: '28px', height: '28px', borderRadius: UI.radius.md, backgroundColor: COLORS.safe.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} style={{ color: COLORS.safe.text }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {geoInsights.improving.map((c) => {
                    const s = getScoreConfig(c.score);
                    return (
                      <button
                        key={c.key}
                        onClick={() => {
                          setSearchQuery(c.key);
                          searchFor(c.key);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.slate[50],
                          border: `1px solid ${COLORS.slate[100]}`,
                          borderRadius: UI.radius.md,
                          padding: '10px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.slate[900], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: COLORS.slate[500], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.country}</div>
                        </div>
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ padding: '6px 10px', borderRadius: UI.radius.pill, backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: '12px', fontWeight: 800 }}>
                            {c.score}
                          </div>
                          <div style={{ width: '28px', height: '28px', borderRadius: UI.radius.md, backgroundColor: COLORS.safe.bg, border: `1px solid ${COLORS.safe.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={14} style={{ color: COLORS.safe.text }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Worsening Conditions (30d) */}
              <div style={{ backgroundColor: COLORS.white, borderRadius: UI.radius.lg, boxShadow: UI.shadow.soft, border: `1px solid ${COLORS.slate[100]}`, padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: COLORS.slate[900], letterSpacing: '-0.01em' }}>Worsening (30d)</div>
                  <div style={{ width: '28px', height: '28px', borderRadius: UI.radius.md, backgroundColor: COLORS.warning.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingDown size={16} style={{ color: COLORS.warning.text }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {geoInsights.worsening.map((c) => {
                    const s = getScoreConfig(c.score);
                    return (
                      <button
                        key={c.key}
                        onClick={() => {
                          setSearchQuery(c.key);
                          searchFor(c.key);
                        }}
                        style={{
                          width: '100%',
                          backgroundColor: COLORS.slate[50],
                          border: `1px solid ${COLORS.slate[100]}`,
                          borderRadius: UI.radius.md,
                          padding: '10px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: COLORS.slate[900], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: COLORS.slate[500], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.country}</div>
                        </div>
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ padding: '6px 10px', borderRadius: UI.radius.pill, backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: '12px', fontWeight: 800 }}>
                            {c.score}
                          </div>
                          <div style={{ width: '28px', height: '28px', borderRadius: UI.radius.md, backgroundColor: COLORS.warning.bg, border: `1px solid ${COLORS.warning.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingDown size={14} style={{ color: COLORS.warning.text }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Action Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        padding: '24px',
        borderTop: `1px solid ${COLORS.slate[200]}`,
        backgroundColor: COLORS.white,
      }} className="no-print">
        <button 
          onClick={() => { trackEvent('button_click', { button: 'subscribe' }); setShowSubscribeModal(true); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: COLORS.slate[500],
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = COLORS.slate[500]}
        >
          <Mail size={16} /> Subscribe
        </button>
        <button 
          onClick={() => trackEvent('button_click', { button: 'donate' })}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: COLORS.slate[500],
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = COLORS.slate[500]}
        >
          <Heart size={16} /> Donate
        </button>
        <button 
          onClick={() => { trackEvent('button_click', { button: 'feedback' }); setShowFeedbackModal(true); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: COLORS.slate[500],
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = COLORS.slate[500]}
        >
          <MessageSquare size={16} /> Feedback
        </button>
        <button 
          onClick={() => { trackEvent('button_click', { button: 'print' }); window.print(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: COLORS.slate[500],
            fontSize: '14px',
            fontWeight: 600,
            padding: '8px',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
          onMouseLeave={(e) => e.currentTarget.style.color = COLORS.slate[500]}
        >
          <Printer size={16} /> Print
        </button>
      </div>

      {/* Sticky App Enjoyment Pill - positioned within iframe, hidden after vote */}
      {!enjoyVote && (
      <div className="no-print" style={{
        position: 'sticky',
        bottom: 12,
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '0 12px 12px 0',
        pointerEvents: 'none', // Allow clicks to pass through container
        zIndex: 900,
      }}>
        <div style={{
          backgroundColor: COLORS.white,
          border: `1px solid ${COLORS.slate[200]}`,
          borderRadius: UI.radius.pill,
          boxShadow: '0 8px 24px rgba(17, 24, 39, 0.12)',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'auto', // Re-enable clicks on the pill itself
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.slate[700], whiteSpace: 'nowrap' }}>
            Enjoying This App?
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => handleEnjoyVote('up')}
              disabled={!!enjoyVote}
              title="Thumbs up"
              style={{
                width: 30,
                height: 28,
                borderRadius: 8,
                border: `1px solid ${COLORS.slate[200]}`,
                backgroundColor: enjoyVote === 'up' ? COLORS.safe.bg : COLORS.white,
                cursor: enjoyVote ? 'not-allowed' : 'pointer',
                opacity: enjoyVote && enjoyVote !== 'up' ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                padding: 0,
              }}
            >
              <ThumbsUp size={14} style={{ color: enjoyVote === 'up' ? COLORS.safe.text : COLORS.slate[500] }} />
            </button>

            <button
              onClick={() => handleEnjoyVote('down')}
              disabled={!!enjoyVote}
              title="Thumbs down"
              style={{
                width: 30,
                height: 28,
                borderRadius: 8,
                border: `1px solid ${COLORS.slate[200]}`,
                backgroundColor: enjoyVote === 'down' ? COLORS.danger.bg : COLORS.white,
                cursor: enjoyVote ? 'not-allowed' : 'pointer',
                opacity: enjoyVote && enjoyVote !== 'down' ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                padding: 0,
              }}
            >
              <ThumbsDown size={14} style={{ color: enjoyVote === 'down' ? COLORS.danger.text : COLORS.slate[500] }} />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Data Sources Footer */}
      <div style={{
        padding: '24px',
        textAlign: 'center',
        backgroundColor: COLORS.slate[50],
      }}>
        <p style={{ margin: 0, color: COLORS.slate[400], fontSize: '13px' }}>
          Data sourced from the{' '}
          <a 
            href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.html" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 500 }}
          >
            US Department of State
          </a>
          ,{' '}
          <a 
            href="https://www.gov.uk/foreign-travel-advice" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 500 }}
          >
            UK Foreign Office
          </a>
          ,{' '}
          <a 
            href="https://acleddata.com" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 500 }}
          >
            ACLED
          </a>
          , and{' '}
          <a 
            href="https://www.gdeltproject.org/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: COLORS.primary, textDecoration: 'none', fontWeight: 500 }}
          >
            GDELT Project
          </a>
          .
        </p>
        <p style={{ margin: '8px 0 0 0', color: COLORS.slate[300], fontSize: '12px' }}>
          For informational purposes only. Always verify with official sources before traveling.
        </p>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSubscribeModal(false)}
        >
          <div 
            style={{
              backgroundColor: COLORS.white,
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowSubscribeModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: COLORS.slate[400],
                padding: '4px',
              }}
            >
              <X size={24} />
            </button>
            
            <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: COLORS.textMain }}>
              Stay Updated
            </div>
            <div style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '24px' }}>
              Get travel safety alerts and updates delivered to your inbox.
            </div>

            {subscribeStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px', color: COLORS.primary, fontWeight: 600 }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
                {subscribeMessage}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: COLORS.textMain }}>
                    Email Address
                  </label>
                  <input 
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: `1px solid ${COLORS.slate[200]}`,
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary}
                    onBlur={(e) => e.currentTarget.style.borderColor = COLORS.slate[200]}
                  />
                </div>

                {subscribeStatus === 'error' && (
                  <div style={{ color: '#EF4444', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
                    {subscribeMessage}
                  </div>
                )}

                <button 
                  onClick={handleSubscribe}
                  disabled={subscribeStatus === 'loading'}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: COLORS.primary,
                    color: COLORS.white,
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: subscribeStatus === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: subscribeStatus === 'loading' ? 0.7 : 1,
                  }}
                >
                  {subscribeStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowFeedbackModal(false)}
        >
          <div 
            style={{
              backgroundColor: COLORS.white,
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowFeedbackModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: COLORS.slate[400],
                padding: '4px',
              }}
            >
              <X size={24} />
            </button>
            
            {/* Show thank you message if user just voted */}
            {enjoyVote && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: enjoyVote === 'up' ? COLORS.safe.bg : COLORS.danger.bg,
                borderRadius: '12px',
                border: `1px solid ${enjoyVote === 'up' ? COLORS.safe.border : COLORS.danger.border}`,
              }}>
                {enjoyVote === 'up' ? (
                  <ThumbsUp size={24} style={{ color: COLORS.safe.text }} />
                ) : (
                  <ThumbsDown size={24} style={{ color: COLORS.danger.text }} />
                )}
                <div style={{ fontSize: '14px', fontWeight: 600, color: enjoyVote === 'up' ? COLORS.safe.text : COLORS.danger.text }}>
                  Thank you for rating the app!
                </div>
              </div>
            )}

            <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: COLORS.textMain }}>
              {enjoyVote ? 'Share Your Thoughts' : 'Feedback'}
            </div>
            <div style={{ fontSize: '14px', color: COLORS.textSecondary, marginBottom: '24px' }}>
              {enjoyVote ? 'Please provide your feedback below to help us improve.' : 'Help us improve the travel safety tool.'}
            </div>

            {feedbackStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: '20px', color: COLORS.primary, fontWeight: 600 }}>
                Thanks for your feedback!
              </div>
            ) : (
              <>
                <textarea 
                  placeholder={enjoyVote === 'up' ? "What do you love about this app?" : enjoyVote === 'down' ? "What can we improve?" : "Tell us what you think..."}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  style={{
                    width: '100%',
                    height: '120px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${COLORS.slate[200]}`,
                    fontSize: '16px',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    marginBottom: '16px',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary}
                  onBlur={(e) => e.currentTarget.style.borderColor = COLORS.slate[200]}
                />

                {feedbackStatus === 'error' && (
                  <div style={{ color: '#EF4444', fontSize: '14px', marginBottom: '10px' }}>
                    Failed to send. Please try again.
                  </div>
                )}

                <button 
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackStatus === 'submitting' || !feedbackText.trim()}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: COLORS.primary,
                    color: COLORS.white,
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: (feedbackStatus === 'submitting' || !feedbackText.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (feedbackStatus === 'submitting' || !feedbackText.trim()) ? 0.7 : 1,
                  }}
                >
                  {feedbackStatus === 'submitting' ? 'Sending...' : 'Send Feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
