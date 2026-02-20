# Golden Prompt Set - Flower Delivery & Sourcing

This document contains test prompts to validate the Flower Delivery connector's metadata and behavior.

## Purpose
Use these prompts to test:
- **Precision**: Does the right tool get called?
- **Recall**: Does the tool get called when it should?
- **Accuracy**: Are the right parameters passed?

---

## Direct Prompts (Should ALWAYS trigger the connector)

### 1. Explicit Tool Name
**Prompt**: "Help me order flowers"
**Expected**: ✅ Calls `flower-delivery` with default values
**Status**: [ ] Pass / [ ] Fail

### 2. Round Trip with Cities
**Prompt**: "Plan a round trip from Boston to Paris"
**Expected**: ✅ Calls `flower-delivery` with departure_city=Boston, destination=Paris, trip_type=round_trip
**Status**: [ ] Pass / [ ] Fail

### 3. Multi-City Trip
**Prompt**: "I'm flying from Boston to Paris on June 11, then Paris to Geneva, then back to Boston on June 24"
**Expected**: ✅ Calls `flower-delivery` with trip_type=multi_city and multi_city_legs
**Status**: [ ] Pass / [ ] Fail

### 4. One-Way Trip
**Prompt**: "I need a one-way flight from NYC to London on March 15"
**Expected**: ✅ Calls `flower-delivery` with trip_type=one_way, departure_city=NYC, destination=London
**Status**: [ ] Pass / [ ] Fail

### 5. Trip with Duration
**Prompt**: "Plan a round trip from NYC to London for 2 weeks"
**Expected**: ✅ Calls `flower-delivery` with departure_city=NYC, destination=London, trip_type=round_trip
**Status**: [ ] Pass / [ ] Fail

---

## Indirect Prompts (Should trigger the connector)

### 6. Vacation Planning
**Prompt**: "Help me plan my vacation to Tokyo"
**Expected**: ✅ Calls `flower-delivery` with destination=Tokyo
**Status**: [ ] Pass / [ ] Fail

### 7. Travel Reservation Tracking
**Prompt**: "I need to track my travel reservations"
**Expected**: ✅ Calls `flower-delivery` with default values
**Status**: [ ] Pass / [ ] Fail

### 8. Flight Organization
**Prompt**: "Organize my flights and hotels for my Europe trip"
**Expected**: ✅ Calls `flower-delivery`
**Status**: [ ] Pass / [ ] Fail

---

## Negative Prompts (Should NOT trigger the connector)

### 9. Flight Booking
**Prompt**: "Book me a flight to Paris"
**Expected**: ❌ Does NOT call `flower-delivery` (actual booking, not organizing)
**Status**: [ ] Pass / [ ] Fail

### 10. Weather Query
**Prompt**: "What's the weather in London?"
**Expected**: ❌ Does NOT call `flower-delivery` (weather info, not flower delivery)
**Status**: [ ] Pass / [ ] Fail

### 11. Restaurant Recommendations
**Prompt**: "Best restaurants in Tokyo"
**Expected**: ❌ Does NOT call `flower-delivery` (dining, not flower delivery)
**Status**: [ ] Pass / [ ] Fail

---

## Edge Cases

### 12. Train Travel
**Prompt**: "I'm taking the train from London to Paris"
**Expected**: ✅ Calls `flower-delivery` with departure_mode=rail
**Status**: [ ] Pass / [ ] Fail

### 13. Group Travel
**Prompt**: "Plan a trip for 3 people from Boston to Paris"
**Expected**: ✅ Calls `flower-delivery` with travelers=3
**Status**: [ ] Pass / [ ] Fail

---

## Testing Instructions

### How to Test
1. Open ChatGPT in **Developer Mode**
2. Link your Flower Delivery connector
3. For each prompt above:
   - Enter the exact prompt
   - Observe which tool gets called
   - Check the parameters passed
   - Verify the widget renders correctly
   - Mark Pass/Fail in the Status column