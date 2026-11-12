# OMG Outfit

React + Vite + Supabase. Deploy on Vercel.

## Setup
1. Supabase: create a project, run `supabase.sql` in the SQL Editor, then add a staff user under Authentication > Users.
2. `cp .env.example .env` and fill in the Supabase URL, anon key, store WhatsApp number.
3. `npm install && npm run dev`
4. Push to GitHub, import the repo in Vercel, add the same 4 env vars, deploy.

## How it works
- Customers browse `/`, try items on through the camera, add to cart, and tap **Order on WhatsApp**. The order is saved to Supabase and opens WhatsApp with the message pre-filled to the store.
- Store staff log in at `/#/admin` to add products, set prices, upload photos, and see orders. A sound and browser notification fire when a new order arrives while the admin page is open.
- Try-on: MediaPipe pose tracking overlays the product photo on the body. Use PNG photos with transparent backgrounds. Rings are not supported yet.

## Fully automatic WhatsApp alerts
The store receives the customer's WhatsApp message directly. To also send the store an automatic alert, add a Supabase Database Webhook on `orders` inserts that calls the WhatsApp Business Cloud API (or Twilio).
