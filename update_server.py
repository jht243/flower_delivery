import re

with open('src/server.ts', 'r') as f:
    text = f.read()

# Replace computeSummary
new_compute_summary = """function computeSummary(args: any) {
  return {
    budget: args.budget || null,
    occasion: args.occasion || null,
    flower_preference: args.flower_preference || null,
    recipient_address: args.recipient_address || null,
    gift_note: args.gift_note || null,
    delivery_date: args.delivery_date || null,
    sender_contact: args.sender_contact || null,
  };
}"""
text = re.sub(r'function computeSummary\(args: any\) \{.*?(?=\nfunction readWidgetHtml)', lambda _: new_compute_summary, text, flags=re.DOTALL)

# Replace toolInputSchema properties
new_schema = """const toolInputSchema = {
  type: "object",
  properties: {
    budget: { type: "number", description: "The maximum budget for the flowers." },
    occasion: { type: "string", description: "The reason or occasion for the flowers (e.g. Anniversary)." },
    flower_preference: { type: "string", description: "Specific flowers or vibe (e.g. Roses, Minimalist)." },
    recipient_address: { type: "string", description: "Where the flowers should be delivered." },
    delivery_date: { type: "string", description: "Delivery date for the flowers in YYYY-MM-DD format." },
    gift_note: { type: "string", description: "The note to attach to the flowers." },
    sender_contact: { type: "string", description: "Phone or email address of the person ordering." },
    order_description: { type: "string", description: "Freeform text describing the request for AI-powered parsing." },
  },"""
text = re.sub(r'const toolInputSchema = \{\n  type: "object",\n  properties: \{.*?\},', lambda _: new_schema, text, flags=re.DOTALL)

# Replace toolInputParser
new_parser = """const toolInputParser = z.object({
  budget: z.number().optional(),
  occasion: z.string().optional(),
  flower_preference: z.string().optional(),
  recipient_address: z.string().optional(),
  delivery_date: z.string().optional(),
  gift_note: z.string().optional(),
  sender_contact: z.string().optional(),
  order_description: z.string().optional(),
});"""
text = re.sub(r'const toolInputParser = z\.object\(\{.*?\}\);', lambda _: new_parser, text, flags=re.DOTALL)

# Replace tools map outputSchema.properties.summary.properties
new_tools = """      summary: {
        type: "object",
        properties: {
          budget: { type: ["number", "null"] },
          occasion: { type: ["string", "null"] },
          flower_preference: { type: ["string", "null"] },
          recipient_address: { type: ["string", "null"] },
          delivery_date: { type: ["string", "null"] },
          gift_note: { type: ["string", "null"] },
          sender_contact: { type: ["string", "null"] },
        },
      },"""
text = re.sub(r'      summary: \{\n        type: "object",\n        properties: \{.*?\n        \},\n      \},', lambda _: new_tools, text, flags=re.DOTALL)

with open('src/server.ts', 'w') as f:
    f.write(text)

print("Updated server.ts successfully")
