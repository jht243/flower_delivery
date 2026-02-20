import React, { useState, useEffect, useRef } from 'react';
import {
  Flower2, Gift, MapPin, CheckCircle2, ChevronRight, Check, Phone,
  ArrowLeft, Star, Heart, Calendar, AtSign, Plus, Search, ShieldCheck, Lock, ZoomIn, X, Info, ChevronDown, CreditCard
} from 'lucide-react';

const COLORS = {
  bg: '#FDFBF7',
  surface: '#FFFFFF',
  textMain: '#2C3A29',
  textMuted: '#6D7C6A',
  primary: '#A3B18A',
  accent: '#E5989B',
  border: '#E8E5DF',
  white: '#FFFFFF',
};

// -- Mock Data --
const MOCK_FLORISTS = [
  { id: 'f1', name: 'Petal & Stem', distance: '1.2 mi', rating: 4.9, image: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=400&q=80', description: 'Artisanal arrangements with locally sourced blooms.' },
  { id: 'f2', name: 'The Wild Rose', distance: '3.4 mi', rating: 4.8, image: 'https://images.unsplash.com/photo-1563241527-200427c3aefb?auto=format&fit=crop&w=400&q=80', description: 'Elegant, classic designs for any special occasion.' },
  { id: 'f3', name: 'Bloom Studio', distance: '5.1 mi', rating: 4.7, image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=400&q=80', description: 'Modern and minimalist floral architecture.' },
];

const AUTOCOMPLETE_DB = [
  "123 Main St, New York, NY 10001",
  "123 Blossom Lane, Floral City, CA 90210",
  "1234 Elm Street, Springfield, IL 62701",
  "123 Washington Ave, Miami, FL 33101",
  "456 Oak Avenue, Austin, TX 78701",
  "789 Pine Road, Seattle, WA 98101"
];

import { FOLDER_COLLECTIONS, ALL_STYLES, FlowerStyle } from './generatedStyles';

const OCCASION_FOLDER_MAP: Record<string, string> = {
  "Anniversary": "Anniversary_and_Valentines_Day",
  "Valentine's Day": "Anniversary_and_Valentines_Day",
  "Birthday": "Birthday",
  "Sympathy": "Sympathy",
  "Mother's Day": "Womens_and_Mothers_Day",
  "Women's Day": "Womens_and_Mothers_Day",
  "Father's Day": "Fathers_Day_and_Just_Because",
  "Just Because": "Fathers_Day_and_Just_Because",
  "Get Well": "Get_Well",
  "Graduation": "Graduation"
};

function getStylesForOccasion(occasion: string, customOccasion: string): FlowerStyle[] {
  const activeOccasion = customOccasion || occasion;
  const folderName = OCCASION_FOLDER_MAP[activeOccasion];

  let baseStyles: FlowerStyle[] = [];
  if (folderName && FOLDER_COLLECTIONS[folderName]) {
    baseStyles = [...FOLDER_COLLECTIONS[folderName]];
  }

  // If we already have 8 or more, just return the first 8
  if (baseStyles.length >= 8) {
    return baseStyles.slice(0, 8);
  }

  // Otherwise, we need to pad it to 8 randomly from ALL_STYLES
  const needed = 8 - baseStyles.length;
  const existingIds = new Set(baseStyles.map(s => s.id));
  const available = ALL_STYLES.filter(s => !existingIds.has(s.id));

  // Use a simple deterministic shuffle based on the occasion string 
  // so the images don't jump around on every single keystroke if they type a custom occasion.
  const seed = activeOccasion.length;
  const deterministicAvailable = [...available].sort((a, b) => {
    return (a.id.charCodeAt(0) + seed) % 2 === 0 ? 1 : -1;
  });

  return [...baseStyles, ...deterministicAvailable.slice(0, needed)];
}

export default function App() {
  const [phase, setPhase] = useState(0);
  const [apiBaseUrl, setApiBaseUrl] = useState('');

  const [budget, setBudget] = useState<number | null>(null);
  const [occasion, setOccasion] = useState<string>('');
  const [customOccasion, setCustomOccasion] = useState('');
  const [showMoreOccasions, setShowMoreOccasions] = useState(false);

  // Store up to 3 selected style IDs
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // State for Lightbox Zoom
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [address, setAddress] = useState<string>('');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [isDelivery, setIsDelivery] = useState<boolean>(true);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [senderContact, setSenderContact] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [selectedFlorist, setSelectedFlorist] = useState<string | null>(null);

  // New states for Phase 3
  const [email, setEmail] = useState<string>('');
  const [recipientDetails, setRecipientDetails] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [isAwaitingPayment, setIsAwaitingPayment] = useState(false);

  // OpenStreetMap (Photon) Autocomplete logic
  useEffect(() => {
    if (!address.trim() || !showDropdown) {
      setAddressSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=15`)
        .then(res => res.json())
        .then(data => {
          if (data && data.features) {
            const suggestions = data.features.map((f: any) => {
              const p = f.properties;

              const countryCode = (p.countrycode || '').toUpperCase();
              const countryName = (p.country || '').toUpperCase();

              if (!['US', 'CA'].includes(countryCode) && !['UNITED STATES', 'CANADA'].includes(countryName)) {
                return null;
              }

              // Build a clean, readable address string from the raw OSM components
              const parts = [
                p.housenumber ? `${p.housenumber} ${p.street || p.name}` : (p.name || p.street),
                p.city || p.town || p.district,
                p.state,
                p.postcode,
                p.countrycode
              ].filter(Boolean);

              return parts.join(', ');
            }).filter(Boolean);
            // Eliminate exact text duplicates
            setAddressSuggestions(Array.from(new Set(suggestions)) as string[]);
          }
        })
        .catch(err => {
          console.error("Photon API Error:", err);
          setAddressSuggestions([]);
        });
    }, 400); // 400ms debounce to respect the free API rate limits

    return () => clearTimeout(delayDebounceFn);
  }, [address, showDropdown]);

  // MCP Hydration
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { data } = event;
      if (data && data.type === 'ai_state_update' && data.state) {
        if (data.state.api_base_url) setApiBaseUrl(data.state.api_base_url);
        if (data.state.budget) setBudget(data.state.budget);
        if (data.state.occasion) {
          setOccasion(data.state.occasion);
          setSelectedStyles([]); // reset styles when AI hydrates a new occasion
        }
        if (data.state.flower_preference) {
          // If the AI sets a preference, map it to a mock selected state
          setSelectedStyles([data.state.flower_preference]);
        }
        if (data.state.delivery_date) setDeliveryDate(data.state.delivery_date);
        if (data.state.sender_contact) setSenderContact(data.state.sender_contact);
        if (data.state.gift_note) setNote(data.state.gift_note);

        if (data.state.recipient_address) {
          setAddress(data.state.recipient_address);
          setShowDropdown(false);
        }

        if (data.state.budget && data.state.occasion && phase === 0) {
          if (data.state.recipient_address) setPhase(2);
          else setPhase(1);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'component_loaded', component: 'flower-delivery' }, '*');
    }
    return () => window.removeEventListener('message', handleMessage);
  }, [phase]);

  // Loading Animation Logic (Phase 2)
  useEffect(() => {
    let timeout: number;

    if (phase === 2) {
      timeout = window.setTimeout(() => {
        // Auto-assign top florist and advance
        setSelectedFlorist(MOCK_FLORISTS[0].id);
        setPhase(3);
      }, 2500);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [phase]);

  // Poll for payment success
  useEffect(() => {
    if (!isAwaitingPayment || !checkoutSessionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3000/check-payment-status?session_id=${checkoutSessionId}`);
        const data = await res.json();
        if (data.paid) {
          setIsAwaitingPayment(false);
          handleNext();
        }
      } catch (err) {
        console.error('Error polling payment status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAwaitingPayment, checkoutSessionId]);

  const handleNext = () => setPhase(p => Math.min(p + 1, 5));
  const handleBack = () => setPhase(p => Math.max(p - 1, 0));
  const handleBackFromPhase3 = () => setPhase(1); // Skip loading screen if backing up from Phase 3

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const floristName = MOCK_FLORISTS.find(f => f.id === selectedFlorist)?.name || 'Local Artisan';
      const subtotal = budget || 0;
      const deliveryFee = isDelivery ? 15 : 0;
      const tax = subtotal * 0.08;

      const response = await fetch('http://localhost:3000/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: subtotal,
          occasion: customOccasion || occasion,
          deliveryFee,
          tax,
          floristName
        })
      });

      const data = await response.json();
      if (data.url && data.sessionId) {
        window.open(data.url, '_blank');
        setCheckoutSessionId(data.sessionId);
        setIsAwaitingPayment(true);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const effectiveOccasion = customOccasion || occasion;
  const currentStyleCollection = React.useMemo(() => getStylesForOccasion(occasion, customOccasion), [occasion, customOccasion]);

  const handleOccasionSelect = (occ: string) => {
    setOccasion(occ);
    setCustomOccasion('');
    setSelectedStyles([]); // Reset photo selections on new occasion
  };

  const handleCustomOccasionChange = (val: string) => {
    setCustomOccasion(val);
    setOccasion('');
    if (val.trim() === '') setSelectedStyles([]);
  };

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length < 3) return [...prev, id];
      return prev;
    });
  };

  // Render Phases
  const renderPhase0 = () => {
    const primaryOccasions = ["Anniversary", "Birthday", "Sympathy", "Mother's Day"];
    const extraOccasions = ["Valentine's Day", "Father's Day", "Women's Day", "Graduation", "Get Well", "Just Because"];
    const budgets = [50, 75, 100, 150, 200];

    return (
      <div className="fade-in" style={{ padding: '0 16px' }}>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, color: COLORS.textMain, fontWeight: 600, marginTop: 10, marginBottom: 8 }}>
          What are we celebrating?
        </h2>
        <p style={{ color: COLORS.textMuted, fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
          Tell us about the occasion and we'll help you find the perfect arrangement.
        </p>

        <SectionTitle title="Occasion" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {primaryOccasions.map(occ => (
            <SelectPill key={occ} label={occ} selected={occasion === occ && !customOccasion} onClick={() => handleOccasionSelect(occ)} />
          ))}
          {showMoreOccasions && extraOccasions.map(occ => (
            <SelectPill key={occ} label={occ} selected={occasion === occ && !customOccasion} onClick={() => handleOccasionSelect(occ)} />
          ))}
          {!showMoreOccasions && (
            <button
              className="btn-press" onClick={() => setShowMoreOccasions(true)}
              style={{
                padding: '10px 18px', borderRadius: 24, border: `1.5px dashed ${COLORS.border}`,
                backgroundColor: 'transparent', color: COLORS.textMuted, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <Plus size={14} /> See More
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Or type a custom occasion..."
          value={customOccasion}
          onChange={e => handleCustomOccasionChange(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 14, marginBottom: 24, boxSizing: 'border-box', outline: 'none', background: COLORS.surface }}
        />

        {effectiveOccasion && (
          <div className="fade-in">
            <SectionTitle title="Flower Inspiration (Select up to 3)" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
              {currentStyleCollection.map(s => {
                const isSelected = selectedStyles.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleStyle(s.id)}
                    className="btn-press"
                    style={{
                      position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                      aspectRatio: '1 / 1', border: `3px solid ${isSelected ? COLORS.primary : 'transparent'}`,
                      boxShadow: isSelected ? '0 4px 12px rgba(163, 177, 138, 0.4)' : 'none',
                      transition: 'all 0.2s', boxSizing: 'border-box'
                    }}
                  >
                    <img src={s.image} alt={s.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 12px 10px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                      color: 'white', fontSize: 13, fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                      {s.label}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); setZoomedImage(s.image); }}
                      style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'rgba(255,255,255,0.9)', borderRadius: '50%',
                        width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        transition: 'transform 0.1s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <ZoomIn size={14} color={COLORS.textMain} />
                    </button>

                    {isSelected && (
                      <div className="fade-in" style={{ position: 'absolute', top: 8, right: 8, background: COLORS.primary, borderRadius: 12, padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 color="white" size={16} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedStyles.length > 0 && (
              <div className="fade-in" style={{
                backgroundColor: 'rgba(163, 177, 138, 0.12)',
                border: `1px solid rgba(163, 177, 138, 0.5)`,
                borderRadius: '8px',
                padding: '12px 16px',
                marginTop: '-8px',
                marginBottom: '24px',
                color: '#4A5B47',
                fontSize: '13px',
                lineHeight: '1.5',
              }}>
                <span style={{ fontWeight: 700 }}>Note:</span> This is not the exact bouquet you will receive. We will show these photos to the florist to inspire your custom design.
              </div>
            )}

          </div>
        )}

        <SectionTitle title="Budget" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
          {budgets.map(b => (
            <SelectPill key={b} label={`$${b}`} selected={budget === b} onClick={() => setBudget(b)} />
          ))}
        </div>

        <PrimaryButton
          disabled={!effectiveOccasion || selectedStyles.length === 0 || !budget}
          onClick={handleNext}
          label="Continue"
          icon={<ChevronRight size={18} />}
        />
      </div>
    );
  };

  const renderPhase1 = () => {
    return (
      <div className="fade-in" style={{ padding: '0 16px' }}>
        <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 0, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, color: COLORS.textMain, fontWeight: 600, marginBottom: 8 }}>
          Where are we sending them?
        </h2>
        <p style={{ color: COLORS.textMuted, fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
          Enter the delivery address so we can locate the best independent florists nearby.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, backgroundColor: '#EDF5EB', padding: '6px 12px', borderRadius: 20 }}>
            <ShieldCheck size={14} color={COLORS.primary} />
            <span style={{ fontSize: 12, color: COLORS.textMain, fontWeight: 600 }}>Verified Network of 500+ Independent Florists</span>
          </div>
          <div style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: 500 }}>
            * Currently delivering exclusively to the USA and Canada, but expanding fast!
          </div>
        </div>

        <SectionTitle title="Recipient Address" />
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <Search size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: 14, top: 15 }} />
          <input
            type="text"
            placeholder="Search address or zip code..."
            value={address}
            onFocus={() => setShowDropdown(true)}
            onChange={e => {
              setAddress(e.target.value);
              setShowDropdown(true);
            }}
            style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: 12, border: `2px solid ${showDropdown ? COLORS.primary : COLORS.border}`, fontSize: 15, boxSizing: 'border-box', outline: 'none', background: COLORS.surface, transition: 'all 0.2s' }}
          />

          {showDropdown && addressSuggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              backgroundColor: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}`,
              boxShadow: '0 10px 24px rgba(0,0,0,0.08)', zIndex: 10, overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              {addressSuggestions.map((sug, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setAddress(sug);
                    setShowDropdown(false);
                  }}
                  style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i === addressSuggestions.length - 1 ? 'none' : `1px solid ${COLORS.border}`,
                    cursor: 'pointer', transition: 'background 0.1s'
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#F5F5F5'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = COLORS.surface}
                >
                  <MapPin size={16} color={COLORS.textMuted} />
                  <span style={{ fontSize: 14, color: COLORS.textMain, fontWeight: 500 }}>{sug}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <PrimaryButton
          disabled={!address.trim() || showDropdown}
          onClick={handleNext}
          label="Continue to Payment"
          icon={<ChevronRight size={18} />}
        />
      </div>
    );
  };

  const renderPhase2 = () => {
    return (
      <div className="fade-in" style={{ padding: '64px 16px', textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 40, backgroundColor: `${COLORS.primary}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 40,
          animation: 'pulse 2s infinite ease-in-out'
        }}>
          <Flower2 size={40} color={COLORS.primary} style={{ animation: 'spin 4s linear infinite' }} />
        </div>

        <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h2 className="fade-in" style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, color: COLORS.textMain, fontWeight: 600, margin: 0, lineHeight: 1.4, maxWidth: 320 }}>
            We are searching local florists for you...
          </h2>
        </div>
      </div>
    );
  };

  const renderPhase3 = () => {
    return (
      <div className="fade-in" style={{ padding: '0 16px' }}>
        <button onClick={handleBackFromPhase3} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 0, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Edit Location
        </button>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 26, color: COLORS.textMain, fontWeight: 600, marginBottom: 16 }}>
          Delivery Details
        </h2>

        <div style={{ backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}`, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {isDelivery ? 'Delivery Date' : 'Pickup Date'}
          </label>
          <div style={{ position: 'relative', transition: 'margin 0.3s' }}>
            <Calendar size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: 14, top: 15 }} />
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={deliveryDate}
              onChange={e => setDeliveryDate(e.target.value)}
              style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 15, boxSizing: 'border-box', outline: 'none', background: COLORS.bg, color: COLORS.textMain }}
            />
          </div>

          {deliveryDate === new Date().toISOString().split('T')[0] && (
            <div className="fade-in" style={{ marginTop: 8, backgroundColor: '#FFF4E5', padding: '12px 14px', borderRadius: 8, border: '1px solid #FFD399', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Info size={16} color="#E67E22" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 12, color: '#C0392B', lineHeight: 1.4, fontWeight: 500 }}>
                Same-day delivery selected. We will do our absolute best to fulfill this today, and will contact you immediately if any issues arise.
              </div>
            </div>
          )}

          <div style={{ marginBottom: deliveryDate ? 24 : 0 }}></div>

          {deliveryDate && (
            <div className="fade-in">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Your Details (For receipt & updates)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: (senderName.trim().length > 0 && senderContact.trim().length > 4) ? 24 : 0, transition: 'margin 0.3s' }}>
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 15, boxSizing: 'border-box', outline: 'none', background: COLORS.bg, color: COLORS.textMain }}
                />
                <div style={{ position: 'relative' }}>
                  <AtSign size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: 14, top: 15 }} />
                  <input
                    type="text"
                    placeholder="Email or phone number"
                    value={senderContact}
                    onChange={e => setSenderContact(e.target.value)}
                    style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 15, boxSizing: 'border-box', outline: 'none', background: COLORS.bg, color: COLORS.textMain }}
                  />
                </div>
              </div>
            </div>
          )}

          {(senderName.trim().length > 0 && senderContact.trim().length > 4) && (
            <div className="fade-in">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {isDelivery ? "Recipient Details" : "Pickup Person's Details"}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: (recipientName.trim().length > 0 && recipientContact.trim().length > 0) ? 24 : 0, transition: 'margin 0.3s' }}>
                <input
                  type="text"
                  placeholder="Recipient's Full Name"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 15, boxSizing: 'border-box', outline: 'none', background: COLORS.bg, color: COLORS.textMain }}
                />
                <div style={{ position: 'relative' }}>
                  <Phone size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: 14, top: 15 }} />
                  <input
                    type="text"
                    placeholder={isDelivery ? "Gate code, drop-off, or phone" : "Phone number"}
                    value={recipientContact}
                    onChange={e => setRecipientContact(e.target.value)}
                    style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 15, boxSizing: 'border-box', outline: 'none', background: COLORS.bg, color: COLORS.textMain }}
                  />
                </div>
              </div>
            </div>
          )}

          {(recipientName.trim().length > 0 && recipientContact.trim().length > 0) && (
            <div className="fade-in">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Gift Note (Optional)
              </label>
              <textarea
                placeholder="Write a heartfelt message..."
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 15, height: 100, boxSizing: 'border-box', outline: 'none', resize: 'none', background: COLORS.bg, color: COLORS.textMain }}
              />
            </div>
          )}
        </div>

        <PrimaryButton
          disabled={!deliveryDate || !senderName.trim() || !senderContact.trim() || !recipientName.trim() || !recipientContact.trim()}
          onClick={handleNext}
          label="Review Order"
          icon={<ChevronRight size={18} />}
        />
      </div>
    );
  };

  const renderPhase4 = () => {
    const floristName = MOCK_FLORISTS.find(f => f.id === selectedFlorist)?.name || 'Local Artisan';
    const activeOccasion = customOccasion || occasion;
    const subtotal = budget || 0;
    const deliveryFee = isDelivery ? 15 : 0;
    const tax = subtotal * 0.08;
    const finalTotal = subtotal + deliveryFee + tax;

    return (
      <div className="fade-in" style={{ padding: '0 16px' }}>
        <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 0, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Details
        </button>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 26, color: COLORS.textMain, fontWeight: 600, marginBottom: 24 }}>
          Review Your Order
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 24 }}>
          {/* Order Summary Card */}
          <div style={{ backgroundColor: '#FAF9F5', borderRadius: 16, padding: 24, border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: 20, fontWeight: 700, color: COLORS.textMain, marginBottom: 20 }}>Order Summary</h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 600, color: COLORS.textMain, margin: '0 0 4px' }}>{activeOccasion || "Florist's Choice"}</h4>
                <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>Fulfilling Florist:</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: COLORS.primary, margin: '4px 0 0' }}>{floristName}</p>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.textMain }}>${subtotal}.00</span>
            </div>

            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, paddingBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: COLORS.textMuted }}>
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: COLORS.textMuted }}>
                <span>{isDelivery ? 'Delivery Fee' : 'Pickup'}</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: COLORS.textMuted }}>
                <span>Estimated Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: COLORS.textMain }}>Total</span>
                <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 24, fontWeight: 700, color: COLORS.textMain }}>${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Destination Confirmation */}
            {isDelivery && (
              <div style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MapPin size={14} color={COLORS.primary} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' }}>Delivery Destination</span>
                </div>
                <div style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 500, lineHeight: 1.5 }}>
                  {address || "Recipient Address"}
                </div>
              </div>
            )}

            {/* Delivery Details Summary (From Phase 3) */}
            <div style={{ backgroundColor: '#F3F4F0', borderRadius: 12, padding: 16, border: `1px solid #E8EBE4` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>Delivery Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Date</div>
                  <div style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 600 }}>{deliveryDate}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Sender Contact</div>
                  <div style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 600 }}>{senderName} ({senderContact})</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Recipient Contact</div>
                  <div style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 600 }}>{recipientName} ({recipientContact})</div>
                </div>
                {note && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>Gift Note</div>
                    <div style={{ fontSize: 13, color: COLORS.textMain, fontWeight: 500, fontStyle: 'italic' }}>"{note}"</div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        <div style={{ marginTop: 32 }}>
          {isAwaitingPayment ? (
            <div style={{ backgroundColor: COLORS.surface, borderRadius: 12, padding: 24, textAlign: 'center', border: `1px solid ${COLORS.accent}` }}>
              <style>{`@keyframes pulseText { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }`}</style>
              <h3 style={{ fontFamily: '"Playfair Display", serif', fontSize: 18, color: COLORS.accent, margin: '0 0 8px 0', animation: 'pulseText 2s infinite' }}>Secure Checkout Opened</h3>
              <p style={{ margin: 0, fontSize: 14, color: COLORS.textMuted }}>Waiting for payment confirmation. Please complete your transaction in the new Stripe tab.</p>
            </div>
          ) : (
            <PrimaryButton
              disabled={isCheckingOut}
              onClick={handleCheckout}
              label={isCheckingOut ? 'Loading Stripe...' : `Pay $${finalTotal.toFixed(2)}`}
              icon={<Check size={18} />}
            />
          )}
        </div>

        <div className="fade-in" style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: COLORS.textMuted }}>
          <Lock size={12} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Secure 256-bit AES encryption powered by Stripe</span>
        </div>
      </div>
    );
  };

  const renderPhase5 = () => {
    const floristName = MOCK_FLORISTS.find(f => f.id === selectedFlorist)?.name || 'our local florists';
    const totalFee = isDelivery ? 15 : 0;
    const finalTotal = (budget || 0) + totalFee;

    return (
      <div className="fade-in" style={{ padding: '32px 16px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle2 size={40} color={COLORS.primary} />
        </div>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, color: COLORS.textMain, fontWeight: 600, marginBottom: 12 }}>
          Order Confirmed
        </h2>
        <p style={{ color: COLORS.textMuted, fontSize: 16, marginBottom: 32, lineHeight: 1.6, maxWidth: 300, margin: '0 auto 32px' }}>
          Your artisanal arrangement is being crafted by <strong>{floristName}</strong> and will be {isDelivery ? <span>delivered to <strong>{address}</strong></span> : <span>picked up at <strong>{floristName}</strong></span>} on <strong>{deliveryDate}</strong>.
        </p>

        <div style={{ backgroundColor: COLORS.surface, padding: 20, borderRadius: 16, border: `1px solid ${COLORS.border}`, display: 'inline-block', textAlign: 'left', minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>Flowers Budget</span>
            <span style={{ color: COLORS.textMain, fontWeight: 600 }}>${budget || 0}.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14, paddingBottom: 16, borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>{isDelivery ? 'Delivery Fee' : 'Pickup'}</span>
            <span style={{ color: COLORS.textMain, fontWeight: 600 }}>${totalFee.toFixed(2)}</span>
          </div>

          <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Total Paid</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.textMain, marginBottom: 16 }}>${finalTotal.toFixed(2)}</div>

          <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Occasion</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.textMain, marginBottom: 16 }}>{customOccasion || occasion}</div>

          <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Receipt Sent To</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: COLORS.textMain }}>{senderName} ({senderContact})</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        
        body, html {
          margin: 0; padding: 0;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
          background-color: ${COLORS.bg};
        }
        
        .fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .btn-press:active { transform: scale(0.98); }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(163, 177, 138, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(163, 177, 138, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(163, 177, 138, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', backgroundColor: COLORS.bg, position: 'relative' }}>

        <div style={{ padding: '32px 20px 24px', backgroundColor: '#2C3A29', color: COLORS.white, position: 'relative', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Flower2 color="white" size={24} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.primary }}>
                  Concierge
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.white, fontFamily: '"Playfair Display", serif' }}>
                  Local Floral
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex', color: '#FFD700' }}>
                <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" />
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>4.9/5 from 10,000+ local deliveries</span>
            </div>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: 0, fontWeight: 400 }}>
              Empowering independent florists in your community. Every order directly supports local artisans.
            </p>
          </div>
        </div>

        <div style={{ paddingBottom: 60 }}>
          {phase === 0 && renderPhase0()}
          {phase === 1 && renderPhase1()}
          {phase === 2 && renderPhase2()}
          {phase === 3 && renderPhase3()}
          {phase === 4 && renderPhase4()}
          {phase === 5 && renderPhase5()}
        </div>

        {phase < 2 && (
          <div className="fade-in" style={{ padding: '0 20px 40px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.textMuted, marginBottom: 16 }}>
              Recognized By
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, opacity: 0.4, filter: 'grayscale(100%)' }}>
              <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 18, fontWeight: 700 }}>VOGUE</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 700, letterSpacing: '-0.5px' }}>The Knot</span>
              <span style={{ fontFamily: '"Playfair Display", serif', fontSize: 16, fontStyle: 'italic', fontWeight: 600 }}>Martha Stewart</span>
            </div>
          </div>
        )}

      </div>

      {zoomedImage && (
        <div
          className="fade-in"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, backdropFilter: 'blur(4px)'
          }}
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            style={{
              position: 'fixed', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', borderRadius: '50%',
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', zIndex: 10000, color: 'white'
            }}
          >
            <X size={24} color="white" />
          </button>
          <img
            src={zoomedImage}
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16, objectFit: 'contain', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
            alt="Zoomed arrangement"
          />
        </div>
      )}

    </>
  );
}

function SelectPill({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button
      className="btn-press" onClick={onClick}
      style={{
        padding: '10px 18px', borderRadius: 24, border: `1.5px solid ${selected ? COLORS.primary : COLORS.border}`,
        backgroundColor: selected ? `${COLORS.primary}15` : COLORS.surface,
        color: selected ? COLORS.primary : COLORS.textMuted,
        fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: selected ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
      }}
    >
      {label}
    </button>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      {title}
      <div style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
    </div>
  );
}

function PrimaryButton({ disabled, onClick, label, icon }: { disabled: boolean, onClick: () => void, label: string, icon?: React.ReactNode }) {
  return (
    <button
      className="btn-press" disabled={disabled} onClick={onClick}
      style={{
        width: '100%', padding: '16px', borderRadius: 14, border: 'none',
        backgroundColor: disabled ? COLORS.border : COLORS.primary, color: disabled ? COLORS.textMuted : 'white',
        fontSize: 16, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s ease',
        boxShadow: disabled ? 'none' : '0 8px 20px rgba(163, 177, 138, 0.4)'
      }}
    >
      {label} {icon}
    </button>
  );
}
