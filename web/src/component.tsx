import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Play,
  Minus,
  Plus,
  ChevronDown,
  Printer,
  Heart,
  Camera,
  Upload,
  Loader,
  ShoppingCart,
  Mail,
  MessageSquare
} from "lucide-react";

const COLORS = {
  primary: "#56C596", // Mint Green
  primaryDark: "#3aa87b",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  textMain: "#1A1A1A",
  textSecondary: "#9CA3AF",
  border: "#F3F4F6",
  inputBg: "#F9FAFB",
  accentLight: "#E6F7F0",
  blue: "#5D9CEC",
  yellow: "#F59E0B",
  red: "#FF6B6B",
  orange: "#F2994A",
  orangeLight: "#FFF7ED",
  saveGreen: "#4D7C0F", // Dark green for table header
  tableHeader: "#2563EB" // Blue for table header
};

type UnitSystem = "US" | "Metric";
type Gender = "male" | "female";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active" | "extra_active";
type CalculatorType = "BMI Calculator" | "Ideal Weight Calculator" | "Body Fat Calculator" | "Calorie Calculator" | "My Photo Health Calculator";

interface CalculatorValues {
  units: UnitSystem;
  gender: Gender;
  age: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  weightKg: string;
  weightLbs: string;
  neckCm: string;
  neckIn: string;
  waistCm: string;
  waistIn: string;
  hipCm: string;
  hipIn: string;
  activityLevel: ActivityLevel;
  frontPhoto?: string;
  sidePhoto?: string;
}

interface CalculatorData {
  values: CalculatorValues;
  touched: Partial<Record<keyof CalculatorValues | "height" | "weight" | "neck" | "waist" | "hip", boolean>>;
  result: any | null;
}

// Helper control for number input with +/- buttons
const NumberControl = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 300, 
  step = 1, 
  label,
  suffix,
  displayValue
}: {
  value: string;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  displayValue?: React.ReactNode;
}) => {
  const handleDec = () => {
    const num = parseFloat(value) || 0;
    if (num - step >= min) onChange(Math.round((num - step) * 10) / 10 + "");
  };

  const handleInc = () => {
    const num = parseFloat(value) || 0;
    if (num + step <= max) onChange(Math.round((num + step) * 10) / 10 + "");
  };

  const btnStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "white",
    color: COLORS.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  };

  return (
    <div style={{
      backgroundColor: COLORS.inputBg,
      borderRadius: "12px",
      padding: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      height: "44px"
    }}>
      <button onClick={handleDec} style={btnStyle}><Minus size={16} strokeWidth={3} /></button>
      
      <div style={{flex: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"}}>
         {displayValue ? (
            <span style={{fontSize: "16px", fontWeight: 700, color: COLORS.textMain}}>
              {displayValue}
            </span>
         ) : (
           <>
             <input 
                type="number" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                style={{
                  width: "40px", 
                  border: "none", 
                  background: "transparent", 
                  textAlign: "center", 
                  fontSize: "16px", 
                  fontWeight: 700, 
                  color: COLORS.textMain,
                  outline: "none"
                }}
             />
             {suffix && <span style={{fontSize: "14px", color: COLORS.textSecondary, fontWeight: 500}}>{suffix}</span>}
           </>
         )}
      </div>

      <button onClick={handleInc} style={btnStyle}><Plus size={16} strokeWidth={3} /></button>
    </div>
  );
};

const DEFAULT_VALUES: CalculatorValues = {
  units: "US",
  gender: "male",
  age: "25",
  heightCm: "178",
  weightKg: "75",
  heightFt: "5",
  heightIn: "10",
  weightLbs: "160",
  neckCm: "50",
  waistCm: "96",
  hipCm: "96",
  neckIn: "19",
  waistIn: "37",
  hipIn: "37",
  activityLevel: "moderate",
  frontPhoto: "",
  sidePhoto: ""
};

const CALCULATOR_TYPES: CalculatorType[] = [
  "BMI Calculator", 
  "Ideal Weight Calculator", 
  "Body Fat Calculator", 
  "Calorie Calculator",
  "My Photo Health Calculator"
];

const STORAGE_KEY = "HEALTH_CALCULATOR_DATA";
const EXPIRATION_DAYS = 30;

const loadSavedData = (): Record<CalculatorType, CalculatorData> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { data, timestamp } = JSON.parse(saved);
      const now = new Date().getTime();
      const daysDiff = (now - timestamp) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < EXPIRATION_DAYS) {
        // Merge saved data with default structure to handle potential schema changes
        const merged: Record<CalculatorType, CalculatorData> = {
            "BMI Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null },
            "Ideal Weight Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null },
            "Body Fat Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null },
            "Calorie Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null },
            "My Photo Health Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null }
        };

        // Only copy over values that exist in our current schema
        (Object.keys(merged) as CalculatorType[]).forEach(key => {
            if (data[key]) {
                merged[key] = {
                    ...merged[key],
                    ...data[key],
                    values: { ...merged[key].values, ...data[key].values }
                };
            }
        });
        return merged;
      }
    }
  } catch (e) {
    console.error("Failed to load saved data", e);
  }
  
  return {
    "BMI Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null },
    "Ideal Weight Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null },
    "Body Fat Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null },
    "Calorie Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null },
    "My Photo Health Calculator": { values: { ...DEFAULT_VALUES }, touched: {}, result: null }
  };
};

export default function Calculator() {
  const [calculatorType, setCalculatorType] = useState<CalculatorType>("BMI Calculator");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [calculators, setCalculators] = useState<Record<CalculatorType, CalculatorData>>(loadSavedData);

  // Subscription State
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  useEffect(() => {
    if (showSubscribeModal && (window as any).turnstile) {
      setTimeout(() => {
          try {
            (window as any).turnstile.render('#turnstile-widget', {
              sitekey: (window as any).TURNSTILE_SITE_KEY,
              callback: function(token: string) {
                setTurnstileToken(token);
              },
            });
          } catch (e) {
            // Turnstile might already be rendered
          }
      }, 100);
    }
  }, [showSubscribeModal]);

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
        setSubscribeMessage("Please enter a valid email.");
        setSubscribeStatus("error");
        return;
    }
    if (!turnstileToken) {
        setSubscribeMessage("Please complete the security check.");
        setSubscribeStatus("error");
        return;
    }

    setSubscribeStatus("loading");
    try {
        // In a real app, the base URL might need to be dynamic if not served from root
        const response = await fetch("/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                settlementId: "health-news",
                settlementName: "Health Calculator News",
                turnstileToken
            })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            setSubscribeStatus("success");
            setSubscribeMessage(data.message);
            setTimeout(() => {
                setShowSubscribeModal(false);
                setEmail("");
                setSubscribeStatus("idle");
                setSubscribeMessage("");
                setTurnstileToken(null);
            }, 3000);
        } else {
            setSubscribeStatus("error");
            setSubscribeMessage(data.error || "Failed to subscribe.");
        }
    } catch (e) {
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
            body: JSON.stringify({
                event: "user_feedback",
                data: {
                    feedback: feedbackText,
                    calculatorType
                }
            })
        });

        if (response.ok) {
            setFeedbackStatus("success");
            setTimeout(() => {
                setShowFeedbackModal(false);
                setFeedbackText("");
                setFeedbackStatus("idle");
            }, 2000);
        } else {
            setFeedbackStatus("error");
        }
    } catch (e) {
        setFeedbackStatus("error");
    }
  };

  // Persist data on change
  useEffect(() => {
    const dataToSave = {
        data: calculators,
        timestamp: new Date().getTime()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [calculators]);

  const currentCalc = calculators[calculatorType];
  const { 
    units, gender, age, activityLevel,
    heightCm, heightFt, heightIn,
    weightKg, weightLbs,
    neckCm, neckIn, waistCm, waistIn, hipCm, hipIn,
    frontPhoto, sidePhoto
  } = currentCalc.values;

  const updateVal = (field: keyof CalculatorValues, value: any, logicalGroup?: string) => {
    setCalculators(prev => {
      const next = { ...prev };
      const group = logicalGroup || field;

      // 1. Update current calculator
      next[calculatorType] = {
        ...next[calculatorType],
        values: {
          ...next[calculatorType].values,
          [field]: value
        },
        touched: {
          ...next[calculatorType].touched,
          [group]: true
        }
      };

      // 2. Update defaults on other UNTOUCHED calculators
      CALCULATOR_TYPES.forEach(type => {
        if (type !== calculatorType) {
          const isTouched = next[type].touched[group as keyof typeof next[typeof type]["touched"]];
          if (!isTouched) {
            next[type] = {
              ...next[type],
              values: {
                ...next[type].values,
                [field]: value
              }
            };
          }
        }
      });

      return next;
    });
  };

  const updateResult = (result: any) => {
    setCalculators(prev => ({
      ...prev,
      [calculatorType]: {
        ...prev[calculatorType],
        result
      }
    }));
  };

  const calculate = () => {
    if (calculatorType === "BMI Calculator") {
      calculateBMI();
    } else if (calculatorType === "Ideal Weight Calculator") {
      calculateIdealWeight();
    } else if (calculatorType === "Body Fat Calculator") {
      calculateBodyFat();
    } else if (calculatorType === "Calorie Calculator") {
      calculateCalories();
    } else if (calculatorType === "My Photo Health Calculator") {
      calculatePhotoHealth();
    }
  };

  const calculateBMI = () => {
    let hM = 0;
    let wKg = 0;

    if (units === "Metric") {
      hM = parseFloat(heightCm) / 100;
      wKg = parseFloat(weightKg);
    } else {
      const totalInches = (parseFloat(heightFt || "0") * 12) + parseFloat(heightIn || "0");
      hM = totalInches * 0.0254;
      wKg = parseFloat(weightLbs) * 0.453592;
    }

    if (hM > 0 && wKg > 0) {
      const bmiVal = wKg / (hM * hM);
      updateResult(parseFloat(bmiVal.toFixed(1)));
    } else {
      updateResult(null);
    }
  };

  const calculateIdealWeight = () => {
    let hInches = 0;
    if (units === "Metric") {
      hInches = parseFloat(heightCm) / 2.54;
    } else {
      hInches = (parseFloat(heightFt || "0") * 12) + parseFloat(heightIn || "0");
    }

    if (!hInches || hInches < 0) {
      updateResult(null);
      return;
    }

    const inchesOver60 = Math.max(0, hInches - 60);
    
    const robinson = gender === 'male' 
      ? 52 + 1.9 * inchesOver60 
      : 49 + 1.7 * inchesOver60;
      
    const miller = gender === 'male'
      ? 56.2 + 1.41 * inchesOver60
      : 53.1 + 1.36 * inchesOver60;
      
    const devine = gender === 'male'
      ? 50.0 + 2.3 * inchesOver60
      : 45.5 + 2.3 * inchesOver60;
      
    const hamwi = gender === 'male'
      ? 48.0 + 2.7 * inchesOver60
      : 45.5 + 2.2 * inchesOver60;

    const hM = hInches * 0.0254;
    const minWeightKg = 18.5 * (hM * hM);
    const maxWeightKg = 25 * (hM * hM);

    const format = (kg: number) => {
      if (units === "Metric") return `${kg.toFixed(1)} kg`;
      return `${(kg * 2.20462).toFixed(1)} lbs`;
    };

    updateResult({
      "Robinson (1983)": format(robinson),
      "Miller (1983)": format(miller),
      "Devine (1974)": format(devine),
      "Hamwi (1964)": format(hamwi),
      "Healthy BMI Range": units === "Metric" 
        ? `${minWeightKg.toFixed(1)} - ${maxWeightKg.toFixed(1)} kg`
        : `${(minWeightKg * 2.20462).toFixed(1)} - ${(maxWeightKg * 2.20462).toFixed(1)} lbs`
    });
  };

  const calculateBodyFat = () => {
    let hCm = 0;
    let wKg = 0;
    let nCm = 0;
    let waCm = 0;
    let hipCmVal = 0;

    if (units === "Metric") {
      hCm = parseFloat(heightCm);
      wKg = parseFloat(weightKg);
      nCm = parseFloat(neckCm);
      waCm = parseFloat(waistCm);
      hipCmVal = parseFloat(hipCm);
    } else {
      const totalInches = (parseFloat(heightFt || "0") * 12) + parseFloat(heightIn || "0");
      hCm = totalInches * 2.54;
      wKg = parseFloat(weightLbs) * 0.453592;
      nCm = parseFloat(neckIn) * 2.54;
      waCm = parseFloat(waistIn) * 2.54;
      hipCmVal = parseFloat(hipIn) * 2.54;
    }

    if (!hCm || !wKg || !nCm || !waCm || (gender === 'female' && !hipCmVal)) {
      updateResult(null);
      return;
    }

    let bfPercent = 0;
    if (gender === 'male') {
      const density = 1.0324 - 0.19077 * Math.log10(waCm - nCm) + 0.15456 * Math.log10(hCm);
      bfPercent = (495 / density) - 450;
    } else {
      const density = 1.29579 - 0.35004 * Math.log10(waCm + hipCmVal - nCm) + 0.22100 * Math.log10(hCm);
      bfPercent = (495 / density) - 450;
    }

    bfPercent = Math.max(2, Math.min(60, bfPercent));

    const hM = hCm / 100;
    const bmi = wKg / (hM * hM);
    const bmiBfPercent = (1.20 * bmi) + (0.23 * parseFloat(age)) - (10.8 * (gender === 'male' ? 1 : 0)) - 5.4;

    let category = "";
    if (gender === 'male') {
      if (bfPercent < 6) category = "Essential";
      else if (bfPercent < 14) category = "Athletes";
      else if (bfPercent < 18) category = "Fitness";
      else if (bfPercent < 25) category = "Average";
      else category = "Obese";
    } else {
      if (bfPercent < 14) category = "Essential";
      else if (bfPercent < 21) category = "Athletes";
      else if (bfPercent < 25) category = "Fitness";
      else if (bfPercent < 32) category = "Average";
      else category = "Obese";
    }

    const fatMass = wKg * (bfPercent / 100);
    const leanMass = wKg - fatMass;

    const idealBf = gender === 'male' 
        ? 8.0 + (0.1 * parseFloat(age))
        : 15.0 + (0.1 * parseFloat(age));
    
    const targetWeight = leanMass / (1 - (idealBf/100));
    const weightToLose = wKg - targetWeight;

    const formatWeight = (kg: number) => {
      if (units === "Metric") return `${kg.toFixed(1)} kg`;
      return `${(kg * 2.20462).toFixed(1)} lbs`;
    };

    updateResult({
      percent: bfPercent.toFixed(1),
      category,
      fatMass: formatWeight(fatMass),
      leanMass: formatWeight(leanMass),
      idealBf: idealBf.toFixed(1),
      toLose: weightToLose > 0 ? formatWeight(weightToLose) : "0.0 kg",
      bmiMethod: bmiBfPercent.toFixed(1)
    });
  };

  const calculateCalories = () => {
    let hCm = 0;
    let wKg = 0;

    if (units === "Metric") {
      hCm = parseFloat(heightCm);
      wKg = parseFloat(weightKg);
    } else {
      const totalInches = (parseFloat(heightFt || "0") * 12) + parseFloat(heightIn || "0");
      hCm = totalInches * 2.54;
      wKg = parseFloat(weightLbs) * 0.453592;
    }

    if (!hCm || !wKg) {
      updateResult(null);
      return;
    }

    let bmr = (10 * wKg) + (6.25 * hCm) - (5 * parseFloat(age));
    if (gender === 'male') bmr += 5;
    else bmr -= 161;

    const multipliers: Record<ActivityLevel, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.465,
      active: 1.55,
      very_active: 1.725,
      extra_active: 1.9
    };

    const tdee = Math.round(bmr * multipliers[activityLevel]);

    updateResult({
      maintain: tdee,
      mildLoss: Math.round(tdee * 0.90),
      weightLoss: Math.round(tdee * 0.80),
      extremeLoss: Math.round(tdee * 0.61),
      mildGain: Math.round(tdee * 1.10),
      weightGain: Math.round(tdee * 1.20),
      extremeGain: Math.round(tdee * 1.39)
    });
  };

  const analyzeImage = (imageUrl: string): Promise<{width: number, height: number, bodyRatio: number, centerMass: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({width: 0, height: 0, bodyRatio: 0.5, centerMass: 0.5});
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Find body region by analyzing pixel density and edges
        let bodyPixels = 0;
        let totalPixels = 0;
        let centerX = 0;
        let centerY = 0;
        let minX = canvas.width;
        let maxX = 0;
        let minY = canvas.height;
        let maxY = 0;
        
        // Sample pixels (every 4th pixel for performance)
        for (let i = 0; i < data.length; i += 16) {
          const x = (i / 4) % canvas.width;
          const y = Math.floor((i / 4) / canvas.width);
          
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Skip transparent pixels
          if (a < 128) continue;
          
          totalPixels++;
          
          // Detect skin tones and body-like colors (not background)
          const brightness = (r + g + b) / 3;
          const isLikelyBody = brightness > 50 && brightness < 240 && 
                              (r > 80 || g > 80 || b > 80);
          
          if (isLikelyBody) {
            bodyPixels++;
            centerX += x;
            centerY += y;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        
        const bodyWidth = maxX - minX;
        const bodyHeight = maxY - minY;
        const bodyRatio = bodyHeight > 0 ? bodyWidth / bodyHeight : 0.5;
        const centerMass = bodyPixels > 0 ? centerY / bodyPixels / canvas.height : 0.5;
        
        resolve({
          width: bodyWidth,
          height: bodyHeight,
          bodyRatio: bodyRatio,
          centerMass: centerMass
        });
      };
      img.onerror = () => {
        resolve({width: 0, height: 0, bodyRatio: 0.5, centerMass: 0.5});
      };
      img.src = imageUrl;
    });
  };

  const calculatePhotoHealth = async () => {
    if (!frontPhoto && !sidePhoto) {
      alert("Please upload at least one photo (front or side) to analyze.");
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      let frontAnalysis = {width: 0, height: 0, bodyRatio: 0.5, centerMass: 0.5};
      let sideAnalysis = {width: 0, height: 0, bodyRatio: 0.5, centerMass: 0.5};
      
      if (frontPhoto) {
        frontAnalysis = await analyzeImage(frontPhoto);
      }
      if (sidePhoto) {
        sideAnalysis = await analyzeImage(sidePhoto);
      }
      
      // Combine analyses
      const avgBodyRatio = (frontAnalysis.bodyRatio + sideAnalysis.bodyRatio) / 2;
      const avgCenterMass = (frontAnalysis.centerMass + sideAnalysis.centerMass) / 2;
      
      // Estimate BMI based on body proportions
      // Wider body ratio typically indicates higher BMI
      // Lower center mass (more weight in lower body) can indicate different body types
      let bmiEstimate = 18.5; // Start with minimum healthy BMI
      
      // Body ratio analysis: typical healthy ratio is around 0.35-0.45
      // Higher ratio (wider relative to height) suggests higher BMI
      if (avgBodyRatio > 0.5) {
        bmiEstimate = 28 + (avgBodyRatio - 0.5) * 15; // Overweight to obese range
      } else if (avgBodyRatio > 0.4) {
        bmiEstimate = 22 + (avgBodyRatio - 0.4) * 60; // Normal to overweight
      } else if (avgBodyRatio > 0.3) {
        bmiEstimate = 18.5 + (avgBodyRatio - 0.3) * 35; // Underweight to normal
      } else {
        bmiEstimate = 16 + avgBodyRatio * 25; // Very underweight
      }
      
      // Adjust based on center of mass (posture/body composition)
      if (avgCenterMass > 0.55) {
        bmiEstimate += 1.5; // More weight in lower body
      } else if (avgCenterMass < 0.45) {
        bmiEstimate -= 1.0; // More weight in upper body
      }
      
      // Clamp to reasonable range
      bmiEstimate = Math.max(15, Math.min(35, bmiEstimate));
      
      // Determine fitness level
      let fitness = "";
      let tips: string[] = [];
      
      if (bmiEstimate < 18.5) {
        fitness = "Visual assessment suggests you may be underweight. Consider consulting a healthcare provider.";
        tips = [
          "Focus on nutrient-dense foods to support healthy weight gain.",
          "Incorporate strength training to build muscle mass.",
          "Consider working with a nutritionist to develop a healthy meal plan."
        ];
      } else if (bmiEstimate >= 18.5 && bmiEstimate < 25) {
        fitness = "Your body proportions appear to be within a healthy range.";
        if (avgBodyRatio < 0.38) {
          fitness += " You appear to have a lean, athletic build.";
          tips = [
            "Maintain your current fitness routine.",
            "Continue focusing on balanced nutrition.",
            "Consider adding variety to prevent plateaus."
          ];
        } else {
          tips = [
            "Maintain a balanced diet with regular exercise.",
            "Focus on both cardiovascular and strength training.",
            "Stay hydrated and get adequate sleep for recovery."
          ];
        }
      } else if (bmiEstimate >= 25 && bmiEstimate < 30) {
        fitness = "Visual analysis suggests you may be slightly above ideal weight range.";
        tips = [
          "Consider a moderate calorie deficit (300-500 calories/day).",
          "Increase daily activity with 150+ minutes of moderate exercise per week.",
          "Focus on whole foods and reduce processed food intake.",
          "Strength training can help build muscle while losing fat."
        ];
      } else {
        fitness = "Visual assessment indicates you may benefit from a structured weight management plan.";
        tips = [
          "Consult with a healthcare provider before starting any weight loss program.",
          "Aim for gradual weight loss (1-2 lbs per week).",
          "Combine diet modifications with regular physical activity.",
          "Consider working with a registered dietitian for personalized guidance."
        ];
      }
      
      // Add posture/body composition tips based on center mass
      if (avgCenterMass > 0.55) {
        tips.push("Your body composition suggests focusing on upper body strength training.");
      } else if (avgCenterMass < 0.45) {
        tips.push("Consider lower body and core strengthening exercises.");
      }
      
      // Add general tips
      if (frontPhoto && sidePhoto) {
        tips.push("Having both front and side views provides a more comprehensive assessment.");
      }
      
      updateResult({
        bmiEstimate: bmiEstimate.toFixed(1),
        fitness: fitness,
        tips: tips
      });
    } catch (error) {
      console.error("Error analyzing photos:", error);
      updateResult({
        bmiEstimate: "N/A",
        fitness: "Unable to analyze photos. Please ensure images are clear and well-lit.",
        tips: [
          "Make sure photos are taken in good lighting.",
          "Wear form-fitting clothing for better analysis.",
          "Stand straight with arms at your sides."
        ]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: "frontPhoto" | "sidePhoto") => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      updateVal(field, url);
    }
  };

  const SUPPLEMENTS = [
    {
        id: 1,
        title: "Whey Protein\nIsolate",
        price: "$29.99",
        image: "/assets/whey-protein.jpg",
        link: "https://www.amazon.com/Optimum-Nutrition-Standard-Protein-Isolate/dp/B000QSNYGI/"
    },
    {
        id: 2,
        title: "Multivitamin\nComplex",
        price: "$19.95",
        image: "/assets/multivitamin.jpg",
        link: "https://www.amazon.com/Amazon-Brand-Solimo-Multivitamin-Gummies/dp/B07JGW2JKF/"
    },
    {
        id: 3,
        title: "Omega-3\nFish Oil",
        price: "$24.50",
        image: "/assets/fish-oil.jpg",
        link: "https://www.amazon.com/Nature-Made-Strength-Softgels-count/dp/B004U3Y9FM/"
    }
  ];

  const clearInputs = () => {
    updateResult(null);
    setCalculators(prev => {
        const next = { ...prev };
        // Reset current calculator to defaults
        next[calculatorType] = {
            values: { ...DEFAULT_VALUES },
            touched: {},
            result: null
        };
        return next;
    });
  };

  const totalInches = (parseInt(heightFt) || 0) * 12 + (parseInt(heightIn) || 0);
  const handleTotalInchesChange = (val: string) => {
    const total = parseInt(val);
    if (!isNaN(total)) {
      const ft = Math.floor(total / 12);
      const inches = total % 12;
      
      // Atomic update for both
      setCalculators(prev => {
        const next = { ...prev };
        const group = "height";
        
        // Update current
        next[calculatorType].values.heightFt = ft.toString();
        next[calculatorType].values.heightIn = inches.toString();
        next[calculatorType].touched.height = true;

        // Update others
        CALCULATOR_TYPES.forEach(type => {
            if (type !== calculatorType && !next[type].touched.height) {
                next[type].values.heightFt = ft.toString();
                next[type].values.heightIn = inches.toString();
            }
        });
        return next;
      });
    }
  };

  const isBMI = calculatorType === "BMI Calculator";
  const isIdeal = calculatorType === "Ideal Weight Calculator";
  const isBF = calculatorType === "Body Fat Calculator";
  const isCalorie = calculatorType === "Calorie Calculator";
  const isPhoto = calculatorType === "My Photo Health Calculator";

  // Extract results for rendering
  const calculatedBmi = isBMI ? currentCalc.result : null;
  const idealWeights = isIdeal ? currentCalc.result : null;
  const bodyFatResult = isBF ? currentCalc.result : null;
  const calorieResult = isCalorie ? currentCalc.result : null;
  const photoResult = isPhoto ? currentCalc.result : null;

  // BMI Visualization Data
  let bmiCategory = "";
  let bmiColor = COLORS.primary;
  const BMI_SEGMENTS = [
    { label: "Underweight", min: 14, max: 18.5, color: COLORS.blue, range: "< 18.5" },
    { label: "Normal", min: 18.5, max: 25, color: COLORS.primary, range: "18.5 – 24.9" },
    { label: "Overweight", min: 25, max: 30, color: COLORS.yellow, range: "25 – 29.9" },
    { label: "Obesity", min: 30, max: 40, color: COLORS.red, range: "30 +" }
  ];
  const BMI_MIN = BMI_SEGMENTS[0].min;
  const BMI_MAX = BMI_SEGMENTS[BMI_SEGMENTS.length - 1].max;
  const clampPercent = (val: number) => Math.max(0, Math.min(100, val));
  const bmiPointerPercent =
    isBMI && calculatedBmi !== null
      ? clampPercent(((calculatedBmi - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100)
      : 0;
  if (isBMI && calculatedBmi !== null) {
    if (calculatedBmi < 18.5) {
      bmiCategory = "Underweight";
      bmiColor = COLORS.blue;
    } else if (calculatedBmi >= 18.5 && calculatedBmi < 25) {
      bmiCategory = "Normal";
      bmiColor = COLORS.primary;
    } else if (calculatedBmi >= 25 && calculatedBmi < 30) {
      bmiCategory = "Overweight";
      bmiColor = COLORS.yellow;
    } else {
      bmiCategory = "Obesity";
      bmiColor = COLORS.red;
    }
  }

  const getIdealWeightRangeText = () => {
    let hInches = 0;
    if (units === "Metric") {
      hInches = parseFloat(heightCm) / 2.54;
    } else {
      hInches = (parseFloat(heightFt || "0") * 12) + parseFloat(heightIn || "0");
    }
    if (!hInches) return null;
    const hM = hInches * 0.0254;
    const minWeightKg = 18.5 * (hM * hM);
    const maxWeightKg = 25 * (hM * hM);
    if (units === "Metric") {
      return `${minWeightKg.toFixed(1)} - ${maxWeightKg.toFixed(1)} kg`;
    } else {
      return `${(minWeightKg * 2.20462).toFixed(1)} - ${(maxWeightKg * 2.20462).toFixed(1)} lbs`;
    }
  };

  const styles = {
    container: {
      width: "100%",
      maxWidth: "600px",
      margin: "0 auto",
      backgroundColor: COLORS.bg,
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      padding: "20px",
      boxSizing: "border-box" as const
    },
    title: {
      fontSize: "28px",
      fontWeight: 800,
      color: COLORS.textMain,
      marginBottom: "10px",
      textAlign: "left" as const
    },
    subheader: {
      fontSize: "14px",
      color: COLORS.textSecondary,
      marginBottom: "20px",
      marginTop: "-5px"
    },
    dropdownWrapper: {
      position: "relative" as const,
      marginBottom: "20px"
    },
    dropdownSelect: {
      width: "100%",
      padding: "12px",
      borderRadius: "12px",
      backgroundColor: "white",
      border: `1px solid ${COLORS.orangeLight}`,
      fontSize: "16px",
      fontWeight: 600,
      color: COLORS.textMain,
      appearance: "none" as const,
      cursor: "pointer",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
    },
    dropdownIcon: {
      position: "absolute" as const,
      right: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none" as const,
      color: COLORS.orange
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: "24px",
      padding: "24px",
      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)",
      marginBottom: "20px"
    },
    tabs: {
      display: "flex",
      marginBottom: "20px",
      backgroundColor: "#F3F4F6",
      borderRadius: "12px",
      padding: "4px"
    },
    tab: (isActive: boolean) => ({
      flex: 1,
      padding: "10px 20px",
      cursor: "pointer",
      fontWeight: 600,
      color: isActive ? COLORS.textMain : COLORS.textSecondary,
      backgroundColor: isActive ? COLORS.card : "transparent",
      borderRadius: "8px",
      textAlign: "center" as const,
      transition: "all 0.2s",
      boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
    }),
    row: {
      display: "flex",
      alignItems: "center",
      marginBottom: "20px",
      gap: "16px"
    },
    column: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      gap: "8px"
    },
    label: {
      fontWeight: 600,
      color: COLORS.textMain,
      fontSize: "15px"
    },
    toggleContainer: {
      display: "flex",
      gap: "4px",
      backgroundColor: COLORS.inputBg,
      borderRadius: "12px",
      padding: "4px",
      height: "44px",
      alignItems: "center",
      boxSizing: "border-box" as const
    },
    toggleBtn: (isActive: boolean) => ({
      flex: 1,
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 600,
      color: isActive ? COLORS.textMain : COLORS.textSecondary,
      backgroundColor: isActive ? "white" : "transparent",
      boxShadow: isActive ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
      transition: "all 0.2s"
    }),
    buttonRow: {
      display: "flex",
      gap: "12px",
      marginTop: "10px"
    },
    calcButton: {
      flex: 1,
      backgroundColor: COLORS.primary,
      color: "white",
      border: "none",
      padding: "14px",
      borderRadius: "16px",
      fontSize: "16px",
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      boxShadow: "0 4px 12px rgba(86, 197, 150, 0.2)"
    },
    clearButton: {
      backgroundColor: "transparent",
      color: COLORS.textSecondary,
      border: "1px solid #E5E7EB",
      padding: "14px 24px",
      borderRadius: "16px",
      fontSize: "16px",
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    resultCard: {
      backgroundColor: COLORS.card,
      borderRadius: "24px",
      padding: "24px",
      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)",
      marginTop: "24px"
    },
    resultHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      borderBottom: `1px solid ${COLORS.border}`,
      paddingBottom: "16px"
    },
    resultTitle: {
        fontSize: "18px",
        fontWeight: 700,
        color: COLORS.textMain
    },
    resultContentRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px", // Reduced gap
      marginBottom: "30px"
    },
    bmiValueContainer: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center", // Centered items
      minWidth: "80px", // Reduced minWidth
      textAlign: "center" as const
    },
    bmiValue: {
      fontSize: "48px",
      fontWeight: 800,
      color: COLORS.textMain,
      lineHeight: "1",
      marginBottom: "4px"
    },
    bmiCat: {
      color: bmiColor,
      fontWeight: 700,
      fontSize: "18px",
      marginTop: "0"
    },
    bmiBarWrapper: {
      flex: 1,
      maxWidth: "400px" // Constrain width for better centering
    },
    bmiBarContainer: {
      position: "relative" as const,
      paddingTop: "28px", // Reduced padding
      marginBottom: "8px"
    },
    bmiBarTrack: {
      width: "100%",
      height: "12px", // Slightly thinner for sleeker look
      borderRadius: "6px",
      overflow: "hidden",
      display: "flex",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
      position: "relative" as const
    },
    bmiSegment: {
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    bmiPointer: (percent: number) => ({
      position: "absolute" as const,
      left: `${percent}%`,
      top: "4px", // Positioned above the track
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      zIndex: 10
    }),
    bmiPointerLabel: {
        fontSize: "12px",
        fontWeight: 800,
        color: COLORS.textMain,
        marginBottom: "2px",
        whiteSpace: "nowrap" as const
    },
    bmiPointerShape: {
      width: "0",
      height: "0",
      borderLeft: "6px solid transparent",
      borderRight: "6px solid transparent",
      borderTop: `8px solid ${COLORS.textMain}`
    },
    bmiSegmentLabelRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "8px",
      marginTop: "12px"
    },
    bmiSegmentLabel: {
      textAlign: "center" as const,
      fontSize: "12px",
      fontWeight: 700,
      color: COLORS.textMain,
      lineHeight: "1.2"
    },
    bmiSegmentRange: {
      display: "block",
      fontSize: "11px",
      fontWeight: 500,
      color: COLORS.textSecondary
    },
    list: {
      fontSize: "14px",
      lineHeight: "1.8",
      color: COLORS.textSecondary,
      backgroundColor: COLORS.inputBg,
      padding: "16px",
      borderRadius: "16px"
    },
    listItem: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "8px",
        borderBottom: "1px dashed #E5E7EB",
        paddingBottom: "8px"
    },
    // Table Styles
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "14px",
      marginTop: "10px"
    },
    th: {
      textAlign: "left" as const,
      padding: "12px 16px",
      backgroundColor: "#2563EB", // Blue header like image
      color: "white",
      fontWeight: 600,
      textTransform: "uppercase" as const,
      fontSize: "12px",
      letterSpacing: "0.5px",
      "&:first-child": {
        borderTopLeftRadius: "8px"
      },
      "&:last-child": {
        borderTopRightRadius: "8px"
      }
    },
    td: {
      padding: "12px 16px",
      borderBottom: "1px solid #E5E7EB",
      color: COLORS.textMain,
      fontWeight: 500
    },
    tdValue: {
      padding: "12px 16px",
      borderBottom: "1px solid #E5E7EB",
      color: "#15803D", // Green text for values
      fontWeight: 700,
      textAlign: "right" as const
    },
    idealResultHeader: {
      backgroundColor: "#4D7C0F", // Green header like image
      color: "white",
      padding: "12px 16px",
      fontSize: "18px",
      fontWeight: 700,
      borderTopLeftRadius: "12px",
      borderTopRightRadius: "12px",
      marginBottom: "16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    // Color bar for Body Fat
    colorBar: {
      width: "100%",
      height: "12px",
      borderRadius: "6px",
      background: `linear-gradient(to right, 
        ${COLORS.blue} 0%, 
        ${COLORS.primary} 25%, 
        ${COLORS.yellow} 50%, 
        ${COLORS.orange} 75%,
        ${COLORS.red} 100%)`,
      position: "relative" as const,
      marginTop: "10px",
      marginBottom: "24px"
    },
    colorBarPointer: (percent: number) => ({
      position: "absolute" as const,
      left: `${Math.min(100, Math.max(0, (percent / 40) * 100))}%`, // Scale 0-40% roughly to bar
      top: "-8px",
      transform: "translateX(-50%)",
      width: "0", 
      height: "0", 
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderTop: `10px solid ${COLORS.textMain}`
    }),
    footer: {
      display: "flex",
      justifyContent: "center",
      gap: "24px",
      marginTop: "40px",
      paddingTop: "24px",
      borderTop: `1px solid ${COLORS.border}`
    },
    footerBtn: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: COLORS.textSecondary,
      fontSize: "14px",
      fontWeight: 600,
      transition: "color 0.2s",
      padding: "8px"
    },
    photoUploadArea: {
        border: `2px dashed ${COLORS.primary}`,
        borderRadius: "12px",
        backgroundColor: COLORS.accentLight,
        height: "120px",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative" as const
    },
    sectionTitle: {
      fontSize: "20px",
      fontWeight: 700,
      color: COLORS.textMain,
      marginBottom: "16px",
      paddingLeft: "4px"
    },
    productGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: "16px"
    },
    productCard: {
      backgroundColor: "white",
      borderRadius: "16px",
      padding: "16px",
      boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      transition: "transform 0.2s",
      cursor: "pointer"
    },
    productImageArea: {
      width: "100%",
      aspectRatio: "1/1",
      backgroundColor: "transparent",
      borderRadius: "12px",
      marginBottom: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      padding: "10px",
      boxSizing: "border-box" as const
    },
    productTitle: {
      fontSize: "14px",
      fontWeight: 600,
      color: COLORS.textMain,
      marginBottom: "4px",
      textAlign: "center" as const,
      lineHeight: "1.3",
      whiteSpace: "pre-wrap" as const,
      height: "36px", // Force 2 lines height roughly
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    productPrice: {
      fontSize: "14px",
      fontWeight: 700,
      color: COLORS.primary,
      marginBottom: "12px"
    },
    buyButton: {
      width: "100%",
      backgroundColor: COLORS.blue,
      color: "white",
      border: "none",
      padding: "8px",
      borderRadius: "8px",
      fontSize: "12px",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "6px",
      textDecoration: "none",
      cursor: "pointer",
      transition: "opacity 0.2s"
    },
    modalOverlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px"
    },
    modalContent: {
      backgroundColor: "white",
      borderRadius: "24px",
      padding: "32px",
      width: "100%",
      maxWidth: "400px",
      boxShadow: "0 20px 60px -10px rgba(0,0,0,0.2)",
      position: "relative" as const
    },
    modalClose: {
      position: "absolute" as const,
      top: "20px",
      right: "20px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: COLORS.textSecondary,
      padding: "4px"
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: "12px",
      border: `1px solid ${COLORS.border}`,
      fontSize: "16px",
      backgroundColor: COLORS.inputBg,
      color: COLORS.textMain,
      marginBottom: "16px",
      boxSizing: "border-box" as const,
      outline: "none"
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "10px"
    },
    subscribeBtn: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 12px",
      backgroundColor: COLORS.inputBg,
      color: COLORS.primary,
      borderRadius: "8px",
      border: "none",
      fontSize: "12px",
      fontWeight: 600,
      cursor: "pointer",
      textDecoration: "none",
      transition: "background-color 0.2s"
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div style={styles.title}>{calculatorType}</div>
        <button style={styles.subscribeBtn} className="btn-press" onClick={() => setShowSubscribeModal(true)}>
          <Mail size={14} />
          Subscribe To Health News
        </button>
      </div>
      <div style={styles.subheader}>
        {isBMI ? "Use this calculator to determine your Body Mass Index." : 
         isIdeal ? "Use this calculator to compute ideal body weight ranges." :
         isBF ? "Use this calculator to estimate your body fat percentage." :
         isPhoto ? "Upload photos to get an AI-powered health assessment." :
         "Use this calculator to estimate daily calorie needs."}
      </div>

      <div style={styles.dropdownWrapper}>
        <select 
          style={styles.dropdownSelect}
          value={calculatorType}
          onChange={(e) => {
            setCalculatorType(e.target.value as CalculatorType);
          }}
        >
          <option>BMI Calculator</option>
          <option>Ideal Weight Calculator</option>
          <option>Body Fat Calculator</option>
          <option>Calorie Calculator</option>
          <option>My Photo Health Calculator</option>
        </select>
        <div style={styles.dropdownIcon}>
          <ChevronDown size={20} />
        </div>
      </div>

      {/* Input Section */}
      <div>
        {/* Conditionally render tabs only if NOT photo calculator */}
        {!isPhoto && (
            <div style={styles.tabs}>
            <div
                style={styles.tab(units === "US")}
                onClick={() => updateVal("units", "US")}
            >
                US Units
            </div>
            <div
                style={styles.tab(units === "Metric")}
                onClick={() => updateVal("units", "Metric")}
            >
                Metric Units
            </div>
            </div>
        )}

        <div style={styles.card}>
          
          {/* Conditionally render Age & Gender Row if NOT photo calculator */}
          {!isPhoto && (
              <div style={styles.row}>
                <div style={styles.column}>
                    <div style={styles.label}>Age</div>
                    <NumberControl 
                    value={age} 
                    onChange={(val) => updateVal("age", val)} 
                    min={2} 
                    max={120} 
                    label="Age" 
                    suffix="yrs"
                    />
                </div>

                <div style={styles.column}>
                    <div style={styles.label}>Gender</div>
                    <div style={styles.toggleContainer}>
                        <div 
                            style={styles.toggleBtn(gender === "male")} 
                            onClick={() => updateVal("gender", "male")}
                        >
                            Male
                        </div>
                        <div 
                            style={styles.toggleBtn(gender === "female")} 
                            onClick={() => updateVal("gender", "female")}
                        >
                            Female
                        </div>
                    </div>
                </div>
              </div>
          )}

          {/* Conditional Inputs */}
          {!isPhoto && (
              <>
                {/* Row 2: Height & Weight */}
                <div style={styles.row}>
                    <div style={styles.column}>
                        <div style={styles.label}>Height</div>
                        {units === "US" ? (
                            <NumberControl 
                                value={totalInches.toString()} 
                                onChange={handleTotalInchesChange} 
                                min={12} 
                                max={108} 
                                displayValue={
                                    <span style={{display: 'flex', alignItems: 'center', gap: 2}}>
                                        {heightFt}<span style={{fontSize: 14, color: COLORS.textSecondary, marginRight: 6}}>'</span>
                                        {heightIn}<span style={{fontSize: 14, color: COLORS.textSecondary}}>"</span>
                                    </span>
                                }
                            />
                        ) : (
                            <NumberControl 
                                value={heightCm} 
                                onChange={(val) => updateVal("heightCm", val, "height")} 
                                min={50} max={300} suffix="cm" 
                            />
                        )}
                    </div>

                    {(isBMI || isBF || isCalorie) && (
                    <div style={styles.column}>
                        <div style={styles.label}>Weight</div>
                        {units === "US" ? (
                            <NumberControl 
                                value={weightLbs} 
                                onChange={(val) => updateVal("weightLbs", val, "weight")} 
                                min={20} max={500} suffix="lbs" 
                            />
                        ) : (
                            <NumberControl 
                                value={weightKg} 
                                onChange={(val) => updateVal("weightKg", val, "weight")} 
                                min={10} max={300} suffix="kg" 
                            />
                        )}
                    </div>
                    )}
                </div>

                {/* Activity Level for Calorie Calculator */}
                {isCalorie && (
                    <div style={{marginBottom: "20px"}}>
                    <div style={{...styles.label, marginBottom: "8px"}}>Activity</div>
                    <div style={styles.dropdownWrapper}>
                        <select 
                        style={styles.dropdownSelect}
                        value={activityLevel}
                        onChange={(e) => updateVal("activityLevel", e.target.value as ActivityLevel)}
                        >
                        <option value="sedentary">Sedentary: little or no exercise</option>
                        <option value="light">Light: exercise 1-3 times/week</option>
                        <option value="moderate">Moderate: exercise 4-5 times/week</option>
                        <option value="active">Active: daily exercise or intense exercise 3-4 times/week</option>
                        <option value="very_active">Very Active: intense exercise 6-7 times/week</option>
                        <option value="extra_active">Extra Active: very intense exercise daily, or physical job</option>
                        </select>
                        <div style={styles.dropdownIcon}>
                        <ChevronDown size={20} />
                        </div>
                    </div>
                    </div>
                )}

                {/* Extra Rows for Body Fat */}
                {isBF && (
                    <>
                    <div style={styles.row}>
                        <div style={styles.column}>
                            <div style={styles.label}>Neck</div>
                            {units === "US" ? (
                                <NumberControl 
                                    value={neckIn} 
                                    onChange={(val) => updateVal("neckIn", val, "neck")} 
                                    min={5} max={30} suffix="in" 
                                />
                            ) : (
                                <NumberControl 
                                    value={neckCm} 
                                    onChange={(val) => updateVal("neckCm", val, "neck")} 
                                    min={10} max={80} suffix="cm" 
                                />
                            )}
                        </div>
                        <div style={styles.column}>
                            <div style={styles.label}>Waist</div>
                            {units === "US" ? (
                                <NumberControl 
                                    value={waistIn} 
                                    onChange={(val) => updateVal("waistIn", val, "waist")} 
                                    min={10} max={80} suffix="in" 
                                />
                            ) : (
                                <NumberControl 
                                    value={waistCm} 
                                    onChange={(val) => updateVal("waistCm", val, "waist")} 
                                    min={20} max={200} suffix="cm" 
                                />
                            )}
                        </div>
                    </div>
                    {gender === 'female' && (
                        <div style={styles.row}>
                        <div style={styles.column}>
                            <div style={styles.label}>Hip</div>
                            {units === "US" ? (
                                <NumberControl 
                                    value={hipIn} 
                                    onChange={(val) => updateVal("hipIn", val, "hip")} 
                                    min={10} max={80} suffix="in" 
                                />
                            ) : (
                                <NumberControl 
                                    value={hipCm} 
                                    onChange={(val) => updateVal("hipCm", val, "hip")} 
                                    min={20} max={200} suffix="cm" 
                                />
                            )}
                        </div>
                        <div style={styles.column}></div> {/* Spacer */}
                        </div>
                    )}
                    </>
                )}
              </>
          )}

          {/* Photo Upload Section */}
          {isPhoto && (
              <div style={styles.row}>
                  <div style={styles.column}>
                      <div style={styles.label}>Front Photo</div>
                      <label style={{...styles.photoUploadArea, backgroundImage: frontPhoto ? `url(${frontPhoto})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center'}}>
                          {!frontPhoto && (
                              <>
                                <Camera size={32} color={COLORS.primary} style={{marginBottom: 8}} />
                                <span style={{fontSize: 12, color: COLORS.primary, fontWeight: 600}}>Tap to Upload</span>
                              </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{display: 'none'}}
                            onChange={(e) => handlePhotoUpload(e, 'frontPhoto')}
                          />
                      </label>
                  </div>
                  <div style={styles.column}>
                      <div style={styles.label}>Side Photo</div>
                      <label style={{...styles.photoUploadArea, backgroundImage: sidePhoto ? `url(${sidePhoto})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center'}}>
                          {!sidePhoto && (
                              <>
                                <Camera size={32} color={COLORS.primary} style={{marginBottom: 8}} />
                                <span style={{fontSize: 12, color: COLORS.primary, fontWeight: 600}}>Tap to Upload</span>
                              </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{display: 'none'}}
                            onChange={(e) => handlePhotoUpload(e, 'sidePhoto')}
                          />
                      </label>
                  </div>
              </div>
          )}

          {/* Buttons */}
          <div style={styles.buttonRow}>
            <button className="btn-press" style={styles.calcButton} onClick={calculate} disabled={isAnalyzing}>
              {isAnalyzing ? (
                  <>
                    <Loader size={20} className="spin" /> Analyzing...
                  </>
              ) : (
                  <>
                    {isPhoto ? "Analyze My Photo" : "Analyze"} <Play size={20} fill="white" />
                  </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {isBMI && calculatedBmi !== null && (
        <div style={styles.resultCard}>
          <div style={styles.resultHeader}>
            <span style={styles.resultTitle}>Your Result</span>
          </div>
          
          <div style={styles.resultContentRow}>
             <div style={styles.bmiValueContainer}>
                <div style={styles.bmiValue}>{calculatedBmi}</div>
                <div style={styles.bmiCat}>{bmiCategory}</div>
             </div>

             <div style={styles.bmiBarWrapper}>
                <div style={styles.bmiBarContainer}>
                  {/* Pointer outside the overflow-hidden track */}
                  {calculatedBmi !== null && (
                    <div style={styles.bmiPointer(bmiPointerPercent)}>
                      <div style={styles.bmiPointerLabel}>{calculatedBmi}</div>
                      <div style={styles.bmiPointerShape} />
                    </div>
                  )}
                  <div style={styles.bmiBarTrack}>
                    {BMI_SEGMENTS.map(segment => (
                      <div
                        key={segment.label}
                        style={{
                          ...styles.bmiSegment,
                          backgroundColor: segment.color,
                          flex: segment.max - segment.min
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div style={styles.bmiSegmentLabelRow}>
                  {BMI_SEGMENTS.map(segment => (
                    <div key={`${segment.label}-label`} style={styles.bmiSegmentLabel}>
                      <span>{segment.label}</span>
                      <span style={styles.bmiSegmentRange}>{segment.range}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>

            <div style={styles.list}>
              <div style={styles.listItem}>
                  <span>Healthy BMI range</span>
                  <span style={{fontWeight: 600, color: COLORS.textMain}}>18.5 - 25 kg/m²</span>
              </div>
              <div style={styles.listItem}>
                  <span>Healthy weight</span>
                  <span style={{fontWeight: 600, color: COLORS.textMain}}>{getIdealWeightRangeText()}</span>
              </div>
              <div style={{...styles.listItem, borderBottom: "none", marginBottom: 0}}>
                  <span>Ponderal Index</span>
                  <span style={{fontWeight: 600, color: COLORS.textMain}}>{(calculatedBmi / (parseFloat(heightCm || "178") / 100)).toFixed(1)} kg/m³</span>
              </div>
            </div>
        </div>
      )}

      {isIdeal && idealWeights && (
        <div style={styles.resultCard}>
          <div style={styles.resultHeader}>
            <span style={styles.resultTitle}>Your Result</span>
          </div>
          <div style={{marginBottom: "16px", fontSize: "14px", color: COLORS.textSecondary}}>
            The ideal weight based on popular formulas:
          </div>
          <div style={styles.list}>
            {Object.entries(idealWeights).map(([key, val], index, arr) => (
              <div key={key} style={{
                  ...styles.listItem, 
                  borderBottom: index === arr.length - 1 ? "none" : styles.listItem.borderBottom,
                  marginBottom: index === arr.length - 1 ? 0 : styles.listItem.marginBottom
              }}>
                <span>{key}</span>
                <span style={{fontWeight: 600, color: COLORS.textMain}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isBF && bodyFatResult && (
        <div style={{marginTop: "24px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)", borderRadius: "12px", overflow: "hidden", backgroundColor: "white"}}>
          <div style={styles.idealResultHeader}>
            <span>Result</span>
          </div>
          <div style={{padding: "0 24px 24px 24px"}}>
             <div style={{fontSize: "24px", fontWeight: 800, color: "#15803D", marginBottom: "8px"}}>
               Body Fat: {bodyFatResult.percent}%
             </div>
             
             {/* Visual Bar */}
             <div style={{textAlign: "center", marginBottom: "24px", position: "relative"}}>
                <div style={{fontSize: "14px", fontWeight: 700, marginBottom: "4px"}}>{bodyFatResult.percent}%</div>
                <div style={styles.colorBar}>
                    <div style={styles.colorBarPointer(parseFloat(bodyFatResult.percent))} />
                </div>
                <div style={{display: "flex", justifyContent: "space-between", fontSize: "10px", color: COLORS.textSecondary}}>
                    <span>Essential</span>
                    <span>Athletes</span>
                    <span>Fitness</span>
                    <span>Average</span>
                    <span>Obese</span>
                </div>
             </div>

             <table style={styles.table}>
                <tbody>
                    <tr>
                        <td style={styles.td}>Body Fat (U.S. Navy Method)</td>
                        <td style={{...styles.tdValue, color: COLORS.textMain}}>{bodyFatResult.percent}%</td>
                    </tr>
                    <tr>
                        <td style={styles.td}>Body Fat Category</td>
                        <td style={{...styles.tdValue, color: COLORS.textMain}}>{bodyFatResult.category}</td>
                    </tr>
                    <tr>
                        <td style={styles.td}>Body Fat Mass</td>
                        <td style={{...styles.tdValue, color: COLORS.textMain}}>{bodyFatResult.fatMass}</td>
                    </tr>
                    <tr>
                        <td style={styles.td}>Lean Body Mass</td>
                        <td style={{...styles.tdValue, color: COLORS.textMain}}>{bodyFatResult.leanMass}</td>
                    </tr>
                    <tr>
                        <td style={styles.td}>Ideal Body Fat for Given Age (Jackson & Pollock)</td>
                        <td style={{...styles.tdValue, color: COLORS.textMain}}>{bodyFatResult.idealBf}%</td>
                    </tr>
                    <tr>
                        <td style={styles.td}>Body Fat to Lose to Reach Ideal</td>
                        <td style={{...styles.tdValue, color: COLORS.textMain}}>{bodyFatResult.toLose}</td>
                    </tr>
                    <tr>
                        <td style={{...styles.td, borderBottom: "none"}}>Body Fat (BMI method)</td>
                        <td style={{...styles.tdValue, borderBottom: "none", color: COLORS.textMain}}>{bodyFatResult.bmiMethod}%</td>
                    </tr>
                </tbody>
             </table>
          </div>
        </div>
      )}

      {isCalorie && calorieResult && (
        <div style={styles.resultCard}>
          <div style={styles.resultHeader}>
            <span style={styles.resultTitle}>Your Result</span>
          </div>
          <div style={{marginBottom: "16px", fontSize: "14px", color: COLORS.textSecondary}}>
            The results show a number of daily calorie estimates that can be used as a guideline for how many calories to consume each day to maintain, lose, or gain weight at a chosen rate.
          </div>
          <div style={styles.list}>
            {/* Maintain */}
            <div style={{...styles.listItem, alignItems: "center"}}>
                <span style={{fontWeight: 600}}>Maintain weight</span>
                <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end"}}>
                    <span style={{fontWeight: 800, fontSize: "18px", color: COLORS.primary}}>{calorieResult.maintain.toLocaleString()}</span>
                    <span style={{fontSize: "12px", color: COLORS.textSecondary}}>Calories/day</span>
                </div>
            </div>
            
            {/* Weight Loss */}
            <div style={{...styles.listItem, alignItems: "center"}}>
                <div style={{display: "flex", flexDirection: "column"}}>
                    <span style={{fontWeight: 600}}>Mild weight loss</span>
                    <span style={{fontSize: "12px", color: COLORS.textSecondary}}>0.5 lb/week</span>
                </div>
                <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end"}}>
                    <span style={{fontWeight: 800, fontSize: "18px", color: COLORS.textMain}}>{calorieResult.mildLoss.toLocaleString()}</span>
                    <span style={{fontSize: "12px", color: COLORS.textSecondary}}>90%</span>
                </div>
            </div>

            <div style={{...styles.listItem, alignItems: "center"}}>
                <div style={{display: "flex", flexDirection: "column"}}>
                    <span style={{fontWeight: 600}}>Weight loss</span>
                    <span style={{fontSize: "12px", color: COLORS.textSecondary}}>1 lb/week</span>
                </div>
                <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end"}}>
                    <span style={{fontWeight: 800, fontSize: "18px", color: COLORS.textMain}}>{calorieResult.weightLoss.toLocaleString()}</span>
                    <span style={{fontSize: "12px", color: COLORS.textSecondary}}>80%</span>
                </div>
            </div>

            <div style={{...styles.listItem, borderBottom: "none", marginBottom: 0, alignItems: "center"}}>
                <div style={{display: "flex", flexDirection: "column"}}>
                    <span style={{fontWeight: 600}}>Extreme weight loss</span>
                    <span style={{fontSize: "12px", color: COLORS.textSecondary}}>2 lb/week</span>
                </div>
                <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end"}}>
                    <span style={{fontWeight: 800, fontSize: "18px", color: COLORS.textMain}}>{calorieResult.extremeLoss.toLocaleString()}</span>
                    <span style={{fontSize: "12px", color: COLORS.textSecondary}}>61%</span>
                </div>
            </div>
          </div>
        </div>
      )}

      {isPhoto && photoResult && (
        <>
        <div style={styles.resultCard}>
          <div style={styles.resultHeader}>
            <span style={styles.resultTitle}>Your Health Insights</span>
          </div>
          <div style={{marginBottom: "16px", fontSize: "14px", color: COLORS.textSecondary}}>
            Based on visual analysis of your uploaded photos:
          </div>
          
          <div style={styles.list}>
            <div style={styles.listItem}>
                <span>Visual BMI Estimate</span>
                <span style={{fontWeight: 600, color: COLORS.textMain}}>{photoResult.bmiEstimate}</span>
            </div>
            <div style={styles.listItem}>
                <span>General Fitness</span>
                <span style={{fontWeight: 600, color: COLORS.textMain, maxWidth: "50%", textAlign: "right"}}>{photoResult.fitness}</span>
            </div>
            
            <div style={{marginTop: "16px"}}>
                <div style={{fontWeight: 600, marginBottom: "8px", color: COLORS.primary}}>Recommendations</div>
                {photoResult.tips.map((tip: string, i: number) => (
                    <div key={i} style={{display: "flex", gap: "8px", fontSize: "14px", marginBottom: "4px", color: COLORS.textMain}}>
                        <span style={{color: COLORS.primary}}>•</span>
                        <span>{tip}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>

        <div style={{marginTop: "32px"}}>
            <div style={styles.sectionTitle}>Suggested Supplements</div>
            <div style={styles.productGrid}>
                {SUPPLEMENTS.map(product => (
                <div key={product.id} style={styles.productCard}>
                    <div style={styles.productImageArea}>
                        <img 
                            src={product.image} 
                            alt={product.title.replace('\n', ' ')} 
                            style={{maxWidth: "100%", maxHeight: "100%", objectFit: "contain"}}
                        />
                    </div>
                    <div style={{width: "100%", display: "flex", flexDirection: "column", alignItems: "center"}}>
                        <div style={styles.productTitle}>{product.title}</div>
                        <div style={styles.productPrice}>{product.price}</div>
                        <a href={product.link} target="_blank" rel="noreferrer" style={styles.buyButton} className="btn-press">
                            <ShoppingCart size={16} /> View Product
                        </a>
                    </div>
                </div>
                ))}
            </div>
        </div>
        </>
      )}
      
      <div style={styles.footer} className="no-print">
        <button style={styles.footerBtn} onClick={clearInputs} className="btn-press">
          <RotateCcw size={16} /> Reset Defaults
        </button>
        <button style={styles.footerBtn} className="btn-press">
          <Heart size={16} /> Donate
        </button>
        <button style={styles.footerBtn} onClick={() => setShowFeedbackModal(true)} className="btn-press">
          <MessageSquare size={16} /> Feedback
        </button>
        <button style={styles.footerBtn} onClick={() => window.print()} className="btn-press">
          <Printer size={16} /> Print
        </button>
      </div>

      {showFeedbackModal && (
        <div style={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowFeedbackModal(false)}>
              <Minus size={24} style={{transform: "rotate(45deg)"}} />
            </button>
            
            <div style={{fontSize: "24px", fontWeight: 800, marginBottom: "8px", color: COLORS.textMain}}>
              Feedback
            </div>
            <div style={{fontSize: "14px", color: COLORS.textSecondary, marginBottom: "24px"}}>
              Help us improve the calculator.
            </div>

            {feedbackStatus === "success" ? (
                <div style={{textAlign: "center", padding: "20px", color: COLORS.primary, fontWeight: 600}}>
                    Thanks for your feedback!
                </div>
            ) : (
                <>
                    <textarea 
                        style={{...styles.input, height: "120px", resize: "none", fontFamily: "inherit"}}
                        placeholder="Tell us what you think..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                    />
                    {feedbackStatus === "error" && (
                        <div style={{color: COLORS.red, fontSize: "14px", marginBottom: "10px"}}>
                            Failed to send. Please try again.
                        </div>
                    )}
                    <button 
                        style={{...styles.calcButton, width: "100%"}} 
                        onClick={handleFeedbackSubmit}
                        disabled={feedbackStatus === "submitting" || !feedbackText.trim()}
                        className="btn-press"
                    >
                        {feedbackStatus === "submitting" ? "Sending..." : "Send Feedback"}
                    </button>
                </>
            )}
          </div>
        </div>
      )}

      {showSubscribeModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSubscribeModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowSubscribeModal(false)}>
              <Minus size={24} style={{transform: "rotate(45deg)"}} />
            </button>
            
            <div style={{fontSize: "24px", fontWeight: 800, marginBottom: "8px", color: COLORS.textMain}}>
              Stay Updated
            </div>
            <div style={{fontSize: "14px", color: COLORS.textSecondary, marginBottom: "24px"}}>
              Get the latest health tips and calculator updates delivered to your inbox.
            </div>

            {subscribeStatus === "success" ? (
                <div style={{textAlign: "center", padding: "20px", color: COLORS.primary, fontWeight: 600}}>
                    <div style={{fontSize: "40px", marginBottom: "10px"}}>🎉</div>
                    {subscribeMessage}
                </div>
            ) : (
                <>
                    <div style={{marginBottom: "16px"}}>
                        <label style={{display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: COLORS.textMain}}>Email Address</label>
                        <input 
                            style={styles.input}
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div style={{marginBottom: "20px", minHeight: "120px", display: "flex", justifyContent: "center"}}>
                        <div id="turnstile-widget"></div>
                    </div>

                    {subscribeStatus === "error" && (
                        <div style={{color: COLORS.red, fontSize: "14px", marginBottom: "16px", textAlign: "center"}}>
                            {subscribeMessage}
                        </div>
                    )}

                    <button 
                        style={{...styles.calcButton, width: "100%"}} 
                        onClick={handleSubscribe}
                        disabled={subscribeStatus === "loading"}
                        className="btn-press"
                    >
                        {subscribeStatus === "loading" ? "Subscribing..." : "Subscribe"}
                    </button>
                </>
            )}
          </div>
        </div>
      )}

      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
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
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .spin {
            animation: spin 1s linear infinite;
        }
        @media print {
          body {
            background-color: white;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
