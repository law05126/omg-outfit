import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
export const CUR = import.meta.env.VITE_CURRENCY || 'RM'
export const WA = import.meta.env.VITE_WHATSAPP
export const money = n => `${CUR} ${Number(n).toFixed(2)}`
export const CATS = { tops: 'Tops', bottoms: 'Pants', sunglasses: 'Sunglasses', necklaces: 'Necklaces', bracelets: 'Bracelets', rings: 'Rings' }
