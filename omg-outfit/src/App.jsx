import { useEffect, useState } from 'react'
import { supabase, money, CATS, WA } from './supabase'
import TryOn from './TryOn.jsx'
import Admin from './Admin.jsx'

export default function App() {
  const [route, setRoute] = useState(location.hash)
  useEffect(() => { const f = () => setRoute(location.hash); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return route.startsWith('#/admin') ? <Admin /> : <Shop />
}

function Shop() {
  const [products, setProducts] = useState(null)
  const [cat, setCat] = useState('all')
  const [open, setOpen] = useState(null)
  const [tryOn, setTryOn] = useState(null)
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart') || '[]'))
  const [cartOpen, setCartOpen] = useState(false)
  useEffect(() => { supabase.from('products').select('*').order('created_at', { ascending: false }).then(({ data }) => setProducts(data || [])) }, [])
  useEffect(() => localStorage.setItem('cart', JSON.stringify(cart)), [cart])
  const shown = (products || []).filter(p => cat === 'all' || p.category === cat)
  const add = (p, size) => { setCart(c => [...c, { id: p.id, name: p.name, price: p.price, size, key: Math.random() }]); setOpen(null); setCartOpen(true) }

  return (<>
    <header className="bar">
      <a className="logo" href="#/">OMG Outfit</a>
      <button className="btn ghost" onClick={() => setCartOpen(true)}>Cart ({cart.length})</button>
    </header>
    <section className="hero">
      <h1>Wear it.<br />Without the fitting room.</h1>
      <p>Quality clothes, pants and accessories. Try them on through your camera, then order on WhatsApp.</p>
    </section>
    <nav className="chips" aria-label="Categories">
      {['all', ...Object.keys(CATS)].map(k => <button key={k} className={'chip' + (cat === k ? ' on' : '')} onClick={() => setCat(k)}>{k === 'all' ? 'All' : CATS[k]}</button>)}
    </nav>
    <main className="grid">
      {products === null && <p className="empty">Loading products…</p>}
      {products && !shown.length && <p className="empty">No products in this category yet.</p>}
      {shown.map(p => (
        <button key={p.id} className="card" onClick={() => setOpen(p)}>
          <div className="ph">{p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" />}{!p.in_stock && <span className="sold">Sold out</span>}</div>
          <span className="tag">{money(p.price)}</span>
          <h3>{p.name}</h3>
        </button>))}
    </main>
    <footer className="foot">© OMG Outfit · <a href="#/admin">Staff</a></footer>

    {open && <Modal onClose={() => setOpen(null)}><Detail p={open} add={add} onTry={() => { setTryOn(open); setOpen(null) }} /></Modal>}
    {tryOn && <TryOn product={tryOn} onClose={() => setTryOn(null)} />}
    {cartOpen && <Modal onClose={() => setCartOpen(false)}><Cart cart={cart} setCart={setCart} done={() => setCartOpen(false)} /></Modal>}
  </>)
}

function Modal({ children, onClose }) {
  return <div className="veil" onClick={onClose}><div className="sheet" onClick={e => e.stopPropagation()}><button className="x" onClick={onClose} aria-label="Close">×</button>{children}</div></div>
}

function Detail({ p, add, onTry }) {
  const [size, setSize] = useState(p.sizes?.[0] || '')
  return (<div className="detail">
    <div className="ph big">{p.image_url && <img src={p.image_url} alt={p.name} />}</div>
    <div>
      <h2>{p.name}</h2><span className="tag">{money(p.price)}</span>
      <p>{p.description}</p>
      {p.sizes?.length > 0 && <div className="row">{p.sizes.map(s => <button key={s} className={'chip' + (size === s ? ' on' : '')} onClick={() => setSize(s)}>{s}</button>)}</div>}
      <div className="row">
        <button className="btn" disabled={!p.in_stock} onClick={() => add(p, size)}>{p.in_stock ? 'Add to cart' : 'Sold out'}</button>
        <button className="btn ghost" onClick={onTry}>Try it on</button>
      </div>
    </div></div>)
}

function Cart({ cart, setCart, done }) {
  const [name, setName] = useState(''), [phone, setPhone] = useState(''), [note, setNote] = useState(''), [err, setErr] = useState('')
  const total = cart.reduce((s, i) => s + Number(i.price), 0)
  async function send() {
    if (!name.trim() || !phone.trim()) return setErr('Enter your name and phone number.')
    const items = cart.map(({ name, price, size }) => ({ name, price, size }))
    const { error } = await supabase.from('orders').insert({ customer_name: name, phone, note, items, total })
    if (error) return setErr('Could not place the order. Try again.')
    const lines = items.map(i => `• ${i.name}${i.size ? ` (${i.size})` : ''} – ${money(i.price)}`).join('\n')
    const msg = `Hi OMG Outfit, I'd like to order:\n${lines}\nTotal: ${money(total)}\n\nName: ${name}\nPhone: ${phone}${note ? `\nNote: ${note}` : ''}`
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank')
    setCart([]); done()
  }
  if (!cart.length) return <div><h2>Your cart</h2><p className="empty">Your cart is empty.</p></div>
  return (<div>
    <h2>Your cart</h2>
    {cart.map(i => <div className="line" key={i.key}><span>{i.name}{i.size && ` · ${i.size}`}</span><span>{money(i.price)} <button className="link" onClick={() => setCart(c => c.filter(x => x.key !== i.key))}>Remove</button></span></div>)}
    <div className="line total"><span>Total</span><span>{money(total)}</span></div>
    <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
    <input placeholder="Phone number" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
    <input placeholder="Note (address, size help…)" value={note} onChange={e => setNote(e.target.value)} />
    {err && <p className="err">{err}</p>}
    <button className="btn wide" onClick={send}>Order on WhatsApp</button>
  </div>)
}
