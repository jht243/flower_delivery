import React, { useState, useEffect, useRef } from 'react';
import {
  Leaf, Flower2, Gift, MapPin, CheckCircle2, ChevronRight, Check, Phone,
  ArrowLeft, Star, Heart, Calendar, AtSign, Plus, Search, ShieldCheck, Lock, ZoomIn, X, Info, ChevronDown, CreditCard,
  ThumbsUp, ThumbsDown, MessageSquare
} from 'lucide-react';

const COLORS = {
  bg: '#F7F4E9',
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

export default function App({ initialData }: { initialData?: any }) {
  const hydrate = initialData || {};
  const [phase, setPhase] = useState(0);
  const [apiBaseUrl, setApiBaseUrl] = useState(hydrate.api_base_url || '');

  const [budget, setBudget] = useState<number | null>(hydrate.budget ?? null);
  const [occasion, setOccasion] = useState<string>(hydrate.occasion || '');
  const [customOccasion, setCustomOccasion] = useState('');
  const [showMoreOccasions, setShowMoreOccasions] = useState(false);

  // Store up to 3 selected style IDs
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // State for Lightbox Zoom
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [address, setAddress] = useState<string>(hydrate.recipient_address || '');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [isDelivery, setIsDelivery] = useState<boolean>(true);
  const [deliveryDate, setDeliveryDate] = useState<string>(hydrate.delivery_date || '');
  const [senderName, setSenderName] = useState<string>(hydrate.sender_name || '');
  const [senderContact, setSenderContact] = useState<string>(hydrate.sender_contact || '');
  const [recipientName, setRecipientName] = useState<string>(hydrate.recipient_name || '');
  const [recipientContact, setRecipientContact] = useState<string>(hydrate.recipient_contact || '');
  const [note, setNote] = useState<string>(hydrate.gift_note || '');
  const [selectedFlorist, setSelectedFlorist] = useState<string | null>(null);

  // New states for Phase 3
  const [email, setEmail] = useState<string>('');
  const [recipientDetails, setRecipientDetails] = useState<string>('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [isAwaitingPayment, setIsAwaitingPayment] = useState(false);

  // Feedback pill state
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [enjoyVote, setEnjoyVote] = useState<'up' | 'down' | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Hydrate component — ONLY occasion (focused MVP approach)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log("[FlowerDelivery] HYDRATION initialData:", JSON.stringify(initialData));
      console.log("[FlowerDelivery] HYDRATION occasion value:", initialData.occasion);

      // Auto-clear old state
      try { localStorage.removeItem('flowerDeliveryState'); } catch { }

      // ONLY hydrate occasion and api_base_url — stripped to minimum
      if (initialData.occasion && typeof initialData.occasion === 'string' && initialData.occasion.length > 0) {
        console.log("[FlowerDelivery] SETTING occasion to:", initialData.occasion);
        setOccasion(initialData.occasion);
      }
      if (initialData.api_base_url) {
        setApiBaseUrl(initialData.api_base_url);
      }
    }
  }, [initialData]);

  // Auto-scroll on phase change
  useEffect(() => {
    if (phase > 0 && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [phase]);

  // Load persisted enjoy vote
  useEffect(() => {
    try {
      const v = localStorage.getItem('enjoyVote_flower');
      if (v === 'up' || v === 'down') setEnjoyVote(v);
    } catch { }
  }, []);



  // Track helper
  const trackEvent = (event: string, data: Record<string, any> = {}) => {
    const base = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!base) return;
    fetch(`${base}/api/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
    }).catch(() => { });
  };

  const handleEnjoyVote = (vote: 'up' | 'down') => {
    if (enjoyVote) return;
    setEnjoyVote(vote);
    try { localStorage.setItem('enjoyVote_flower', vote); } catch { }
    trackEvent('widget_app_enjoyment_vote', { vote, phase });
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackStatus('submitting');
    const base = apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    try {
      const response = await fetch(`${base}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'widget_user_feedback',
          data: { feedback: feedbackText, enjoymentVote: enjoyVote || null, phase },
        }),
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
    } catch {
      setFeedbackStatus('error');
    }
  };

  // Auto-advance DISABLED: always start on Phase 0 so user can browse flower inspiration
  // even when occasion is pre-filled via hydration

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
    const handleHydration = (statePayload: any) => {
      if (!statePayload) return;
      if (statePayload.api_base_url) setApiBaseUrl(statePayload.api_base_url);
      if (statePayload.budget) setBudget(statePayload.budget);
      if (statePayload.occasion) {
        setOccasion(statePayload.occasion);
        setSelectedStyles([]); // reset styles when AI hydrates a new occasion
      }
      if (statePayload.flower_preference) {
        // If the AI sets a preference, map it to a mock selected state
        setSelectedStyles([statePayload.flower_preference]);
      }
      if (statePayload.delivery_date) setDeliveryDate(statePayload.delivery_date);
      if (statePayload.sender_name) setSenderName(statePayload.sender_name);
      if (statePayload.sender_contact) setSenderContact(statePayload.sender_contact);
      if (statePayload.recipient_name) setRecipientName(statePayload.recipient_name);
      if (statePayload.recipient_contact) setRecipientContact(statePayload.recipient_contact);
      if (statePayload.gift_note) setNote(statePayload.gift_note);

      if (statePayload.recipient_address) {
        setAddress(statePayload.recipient_address);
        setShowDropdown(false);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      const { data } = event;
      if (data && data.type === 'ai_state_update' && data.state) {
        handleHydration(data.state);
        return;
      }

      // MCP Apps SDK JSON-RPC compat
      if (data && data.jsonrpc === "2.0") {
        if (data.method === "ui/notifications/tool-result" || data.method === "ui/notifications/tool-input") {
          const params = data.params;
          const payload = params?.structuredContent || params?.result?.structuredContent || params?.arguments;
          if (payload) handleHydration(payload);
        }
      }
    };

    // Check for pre-loaded window.openai sync context from Host
    const openaiGlobal = (window as any).openai;
    if (openaiGlobal) {
      if (openaiGlobal.toolOutput && openaiGlobal.toolOutput.structuredContent) {
        handleHydration(openaiGlobal.toolOutput.structuredContent);
      } else if (openaiGlobal.toolInput) {
        handleHydration(openaiGlobal.toolInput);
      }
    }

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
        const res = await fetch(`${apiBaseUrl}/check-payment-status?session_id=${checkoutSessionId}`);
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

  const handleMakeAnotherOrder = () => {
    setPhase(0);
    setBudget(null);
    setOccasion('');
    setCustomOccasion('');
    setSelectedStyles([]);
    setAddress('');
    setIsDelivery(true);
    setDeliveryDate('');
    setSenderName('');
    setSenderContact('');
    setRecipientName('');
    setRecipientContact('');
    setNote('');
    setSelectedFlorist(null);
    setIsAwaitingPayment(false);
    setCheckoutSessionId(null);
    setIsCheckingOut(false);
    try { localStorage.removeItem('flowerDeliveryState'); } catch { }
  };
  const handleBackFromPhase3 = () => setPhase(1); // Skip loading screen if backing up from Phase 3

  // When going back from Phase 4 (checkout), clear any pending payment so Pay button reappears
  const handleBackFromPhase4 = () => {
    setIsAwaitingPayment(false);
    setCheckoutSessionId(null);
    setIsCheckingOut(false);
    setPhase(3);
  };

  const cancelPendingPayment = () => {
    setIsAwaitingPayment(false);
    setCheckoutSessionId(null);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const floristName = MOCK_FLORISTS.find(f => f.id === selectedFlorist)?.name || 'Local Artisan';
      const subtotal = budget || 0;
      const deliveryFee = isDelivery ? 15 : 0;
      const tax = subtotal * 0.08;

      const response = await fetch(`${apiBaseUrl}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget: subtotal,
          occasion: customOccasion || occasion,
          deliveryFee,
          tax,
          floristName,
          address,
          deliveryDate,
          senderName,
          senderContact,
          recipientName,
          recipientContact,
          note,
          selectedStyles
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
    const primaryOccasions = ["Anniversary", "Birthday", "Sympathy", "Mother's Day", "Get Well", "Graduation"];
    const extraOccasions = ["Valentine's Day", "Father's Day", "Women's Day", "Just Because"];
    const budgets = [50, 75, 100, 150, 200];

    return (
      <div className="fade-in" style={{ padding: '0 16px' }}>
        <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 28, color: COLORS.textMain, fontWeight: 600, marginTop: 5, marginBottom: 8 }}>
          What are you celebrating?
        </h2>
        <p style={{ color: COLORS.textMuted, fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
          Tell us the occasion and <u>we'll find the perfect arrangement.</u>
        </p>

        <SectionTitle title="Occasion" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
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
                padding: '8px 14px', borderRadius: 24, border: `1.5px dashed ${COLORS.border}`,
                backgroundColor: 'transparent', color: COLORS.textMuted, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <Plus size={14} /> See More
            </button>
          )}
        </div>
        {showMoreOccasions && (
          <div className="fade-in">
            <input
              type="text"
              placeholder="Or type a custom occasion..."
              value={customOccasion}
              onChange={e => handleCustomOccasionChange(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`, fontSize: 14, marginBottom: 24, boxSizing: 'border-box', outline: 'none', background: COLORS.surface }}
            />
          </div>
        )}

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
        {(!effectiveOccasion || selectedStyles.length === 0 || !budget) && (
          <div style={{ textAlign: 'center', color: '#B00020', fontSize: 13, marginTop: 12, fontWeight: 500 }}>
            {!effectiveOccasion ? "Please select the occasion you're purchasing for."
              : selectedStyles.length === 0 ? "Please select at least one inspiration photo."
                : "Please select a budget for your arrangement."}
          </div>
        )}
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
        {(!address.trim() || showDropdown) && (
          <div style={{ textAlign: 'center', color: '#B00020', fontSize: 13, marginTop: 12, fontWeight: 500 }}>
            {!address.trim() ? "Please enter a delivery address." : "Please select an exact address from the suggestions."}
          </div>
        )}
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
                Write A Note To The Recipient (Optional)
              </label>
              <textarea
                placeholder="Keep it brief — about two sentences maximum..."
                maxLength={200}
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
        {(!deliveryDate || !senderName.trim() || !senderContact.trim() || !recipientName.trim() || !recipientContact.trim()) && (
          <div style={{ textAlign: 'center', color: '#B00020', fontSize: 13, marginTop: 12, fontWeight: 500 }}>
            {!deliveryDate ? "Please select a delivery date." :
              (!senderName.trim() || !senderContact.trim()) ? "Please complete the sender details." :
                "Please complete the recipient details."}
          </div>
        )}
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
        <button onClick={handleBackFromPhase4} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: COLORS.textMuted, cursor: 'pointer', padding: 0, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to Details
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 26, color: COLORS.textMain, fontWeight: 600, margin: 0 }}>
            Review Your Order
          </h2>
          {selectedStyles.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {selectedStyles.map(styleId => {
                const styleObj = ALL_STYLES.find(s => s.id === styleId);
                if (!styleObj) return null;
                return (
                  <img
                    key={styleObj.id}
                    src={styleObj.image}
                    alt={styleObj.label}
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: `1px solid ${COLORS.border}` }}
                  />
                );
              })}
            </div>
          )}
        </div>

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
              <p style={{ margin: '0 0 16px 0', fontSize: 14, color: COLORS.textMuted }}>Waiting for payment confirmation. Please complete your transaction in the Stripe tab that just opened.</p>
              <button
                onClick={cancelPendingPayment}
                style={{
                  background: 'none', border: '1px solid #D1D5DB', borderRadius: 8,
                  padding: '8px 20px', fontSize: 13, fontWeight: 600, color: COLORS.textMuted,
                  cursor: 'pointer',
                }}
              >
                ✕ Cancel &amp; Try Again
              </button>
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

        <div style={{ marginTop: 32, maxWidth: 300, margin: '32px auto 0' }}>
          <PrimaryButton
            disabled={false}
            onClick={handleMakeAnotherOrder}
            label="Make Another Order"
            icon={<Flower2 size={18} />}
          />
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
          background-color: #FFFFFF;
          padding: 16px 0;
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
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      <div ref={containerRef} style={{ maxWidth: 540, margin: '0 auto', backgroundColor: COLORS.bg, position: 'relative', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>

        <div style={{ padding: '32px 20px 16px', backgroundColor: '#2C3A29', color: COLORS.white, position: 'relative', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ position: 'absolute', top: -25, right: -20, opacity: 0.1, zIndex: 0, transform: 'rotate(15deg)' }}>
            <Leaf size={160} color="#FFFFFF" strokeWidth={1.5} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <Flower2 color="white" size={24} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: COLORS.primary }}>
                  The Artisan Florist
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.white, fontFamily: '"Playfair Display", serif' }}>
                  Local Flower Delivery
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex', color: '#FFD700' }}>
                <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" />
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>4.9/5 from 10,000+ local deliveries</span>
            </div>

            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.95)', fontStyle: 'italic', marginBottom: 0, lineHeight: 1.4, fontWeight: 500 }}>
              "Sourced directly from verified, independent local growers."
            </div>
          </div>
        </div>

        <div ref={contentRef} style={{ paddingBottom: 40, scrollMarginTop: 65 }}>
          {phase === 0 && renderPhase0()}
          {phase === 1 && renderPhase1()}
          {phase === 2 && renderPhase2()}
          {phase === 3 && renderPhase3()}
          {phase === 4 && renderPhase4()}
          {phase === 5 && renderPhase5()}
        </div>

        {phase < 2 && (
          <div className="fade-in" style={{ padding: '0 20px 24px', textAlign: 'center' }}>
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

        {/* Floating "Enjoying this app?" Pill */}
        {!enjoyVote && (
          <div className="fade-in no-print" style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 900,
            pointerEvents: 'none',
          }}>
            <div style={{
              backgroundColor: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 9999,
              boxShadow: '0 8px 24px rgba(17, 24, 39, 0.14)',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              pointerEvents: 'auto',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                Enjoying this app?
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleEnjoyVote('up')}
                  title="Thumbs up"
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                >
                  <ThumbsUp size={15} style={{ color: '#059669' }} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => handleEnjoyVote('down')}
                  title="Thumbs down"
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#FFF1F2')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
                >
                  <ThumbsDown size={15} style={{ color: '#DC2626' }} strokeWidth={2.5} />
                </button>
              </div>
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



      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowFeedbackModal(false)}
        >
          <div
            style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 32,
              maxWidth: 400, width: '90%', position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFeedbackModal(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9CA3AF', padding: 4,
              }}
            >
              <X size={22} />
            </button>

            {/* Vote banner */}
            {enjoyVote && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
                padding: '12px 16px',
                backgroundColor: enjoyVote === 'up' ? '#F0FDF4' : '#FFF1F2',
                borderRadius: 12,
                border: `1px solid ${enjoyVote === 'up' ? '#86EFAC' : '#FECDD3'}`,
              }}>
                {enjoyVote === 'up'
                  ? <ThumbsUp size={22} style={{ color: '#16A34A' }} />
                  : <ThumbsDown size={22} style={{ color: '#DC2626' }} />}
                <div style={{ fontSize: 14, fontWeight: 600, color: enjoyVote === 'up' ? '#15803D' : '#B91C1C' }}>
                  Thank you for rating the app!
                </div>
              </div>
            )}

            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: COLORS.textMain, fontFamily: '"Playfair Display", serif' }}>
              {enjoyVote ? 'Share Your Thoughts' : 'Feedback'}
            </div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>
              {enjoyVote ? 'Your thoughts help us improve.' : 'Help us improve the Artisan Florist experience.'}
            </div>

            {feedbackStatus === 'success' ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#2C3A29', fontWeight: 600 }}>
                🌸 Thanks for your feedback!
              </div>
            ) : (
              <>
                <textarea
                  placeholder={
                    enjoyVote === 'up' ? 'What do you love about this app?'
                      : enjoyVote === 'down' ? 'What can we improve?'
                        : 'Tell us what you think...'
                  }
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  style={{
                    width: '100%', height: 110, padding: '12px 14px',
                    borderRadius: 10, border: '1px solid #E5E7EB',
                    fontSize: 15, outline: 'none', resize: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#2C3A29')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E5E7EB')}
                />
                {feedbackStatus === 'error' && (
                  <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 10 }}>
                    Failed to send. Please try again.
                  </div>
                )}
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackStatus === 'submitting' || !feedbackText.trim()}
                  style={{
                    width: '100%', padding: 14, borderRadius: 10, border: 'none',
                    backgroundColor: '#2C3A29', color: '#fff',
                    fontSize: 15, fontWeight: 700,
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

    </>
  );
}

function SelectPill({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button
      className="btn-press" onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: 24, border: `1.5px solid ${selected ? COLORS.primary : COLORS.border}`,
        backgroundColor: selected ? `${COLORS.primary}15` : COLORS.surface,
        color: selected ? COLORS.primary : COLORS.textMuted,
        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
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
