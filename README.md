# TAGHAZOUT.WEAR order notification API

This backend receives checkout details and sends a WhatsApp **approved template** notification to the shop number. It does not store orders in a database.

## Important prerequisites
1. Complete WhatsApp Cloud API production setup in Meta.
2. Create and get approval for a Utility template named `order_notification` in French with exactly five body placeholders, in this order:
   - Customer name
   - Customer phone
   - Delivery address
   - Order item lines
   - Order total
3. Obtain the WhatsApp **Phone Number ID** and a long-lived/system-user access token with the required WhatsApp messaging permission.
4. Deploy this folder to a Node.js host (Node 20+).
5. Set the environment variables from `.env.example` privately in the host dashboard. Do not put real tokens in GitHub or the HTML.
6. Set `ALLOWED_ORIGINS` to the exact live shop origin and set `GRAPH_API_VERSION` to a currently supported Graph API version shown in Meta's documentation/dashboard.
7. Replace `https://YOUR-BACKEND-URL.example.com/api/orders` in the shop HTML with the deployed backend endpoint.

## Run locally
`npm install && npm start`

Health check: `/health`

## Security notes
- Never commit `.env`, access tokens, app secrets, or verification tokens.
- Restrict CORS to the shop domain and keep rate limiting enabled.
- This endpoint validates basic fields but does not provide durable order storage, payment handling, or anti-fraud guarantees. Add persistent order storage and stronger abuse protection before relying on it for production.
- WhatsApp requires an approved template for business-initiated notifications outside an open customer-service window. The API acceptance response is not proof the message reached the handset; verify delivery in Meta logs and by testing.
