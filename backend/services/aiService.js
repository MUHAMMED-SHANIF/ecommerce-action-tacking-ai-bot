const extractIntent = async (userText, userContext = null) => {
    try {
        let contextString = '';
        if (userContext) {
            contextString = `
User Context (Full Data Slice):
- Profile: ${JSON.stringify(userContext.profile || {})}
- All Orders: ${JSON.stringify(userContext.orders || [])}
- Cart Items: ${JSON.stringify(userContext.cart || [])}
- Addresses: ${JSON.stringify(userContext.addresses || [])}
`;
        }

        const SYSTEM_PROMPT = `
You are a highly efficient E-commerce AI Router with FULL access to the user's data context.
Your ONLY job is to analyze the user's message and extract their intent and relevant entities.

You MUST respond with raw, valid JSON ONLY. Do not wrap it in markdown code blocks. Do not include any explanations.

Allowed Intents:
- SEARCH_PRODUCT
- ADD_TO_CART
- REMOVE_FROM_CART
- VIEW_CART
- PLACE_ORDER
- TRACK_ORDER
- REORDER
- UPDATE_ADDRESS
- RECOMMEND_PRODUCT
- GENERIC_DB_ACTION
- GENERAL_QUERY

Entities to extract (if present, otherwise leave null or omit):
- product_name (string)
- category (string)
- brand (string)
- max_price (number)
- quantity (number)
- order_id (string)
- new_address (string)

If the intent is GENERIC_DB_ACTION, you MUST provide these generic action entities:
- db_table (string: "profiles", "addresses", "cart_items", "orders")
- db_action (string: "insert", "update", "delete", "select")
- db_match (object: fields to match on, e.g. {"id": "123"} or null)
- db_payload (object: data to insert/update, e.g. {"city": "New York"} or null)
- db_response_text (string: what human-readable message you want to show the user after executing this action)

Format exactly like this (Example 1):
{
  "intent": "SEARCH_PRODUCT",
  "entities": {
    "product_name": "sneakers",
    "max_price": 50
  }
}

Format exactly like this (Example 2 - Generic Action):
{
  "intent": "GENERIC_DB_ACTION",
  "entities": {
    "db_table": "addresses",
    "db_action": "update",
    "db_match": { "id": "123-uuid-456" },
    "db_payload": { "city": "Los Angeles" },
    "db_response_text": "I've successfully updated your city to Los Angeles."
  }
}
${contextString}
`;

        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'mistral',
                prompt: `${SYSTEM_PROMPT}\n\nUser Message: "${userText}"\n\nJSON output:`,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.1,
                }
            })
        });

        if (!response.ok) {
            throw new Error('Ollama service unavailable');
        }

        const data = await response.json();
        const rawContent = data.response.trim();
        return JSON.parse(rawContent);
    } catch (error) {
        console.error("Local AI Error:", error);
        return { error: "Failed to understand intent due to AI service timeout or error." };
    }
};

module.exports = { extractIntent };
