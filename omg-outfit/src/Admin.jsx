import { useEffect, useState } from 'react'
import { supabase, money, CATS } from './supabase'

const blank = { name: '', category: 'tops', price: '', description: '', sizes: '', in_stock: true }

export default function Admin() {
  const [session, setSession] = useState(undefined)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setSession(data.session)); const { data } = supabase.auth.onAuthStateChange((_, s) => setSession(s)); return () => data.subscription.unsubscribe() }, [])
  if (session === undefined) return null
  return session ? <Panel /> : <Login />
}

function Login() {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState('')
  const go = async () => { const { error } = await supabase.auth.signInWithPassword({ email, password: pw }); if (error) setErr('Wrong email or password.') }
  return <div className="sheet solo"><h2>Staff login</h2>
    <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
    <input placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} />
    {err && <p className="err">{err}</p>}<button className="btn wide" onClick={go}>Log in</button><p><a href="#/">Back to shop</a></p></div>
}

function Panel() {
  const [tab, setTab] = useState('products'), [alert, setAlert] = useState(0)
  useEffect(() => {
    const ch = supabase.channel('orders').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
      setAlert(n => n + 1); try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT').play() } catch {}
      if (Notification.permission === 'granted') new Notification('New order on OMG Outfit')
    }).subscribe()
    if ('Notification' in window) Notification.requestPermission()
    return () => supabase.removeChannel(ch)
  }, [])
  return (<div className="admin">
    <header className="bar"><a className="logo" href="#/">OMG Outfit · Staff</a>
      <span><button className={'chip' + (tab === 'products' ? ' on' : '')} onClick={() => setTab('products')}>Products</button>
        <button className={'chip' + (tab === 'orders' ? ' on' : '')} onClick={() => { setTab('orders'); setAlert(0) }}>Orders{alert > 0 && ` (${alert} new)`}</button>
        <button className="link" onClick={() => supabase.auth.signOut()}>Log out</button></span></header>
    {tab === 'products' ? <Products /> : <Orders />}
  </div>)
}

function Products() {
  const [list, setList] = useState([]), [f, setF] = useState(blank), [file, setFile] = useState(null), [id, setId] = useState(null), [msg, setMsg] = useState('')
  const load = () => supabase.from('products').select('*').order('created_at', { ascending: false }).then(({ data }) => setList(data || []))
  useEffect(() => { load() }, [])
  async function save() {
    if (!f.name || !f.price) return setMsg('Enter a name and price.')
    let image_url = f.image_url
    if (file) {
      const path = `${Date.now()}-${file.name.replace(/\W/g, '_')}`
      const up = await supabase.storage.from('products').upload(path, file)
      if (up.error) return setMsg('Image upload failed.')
      image_url = supabase.storage.from('products').getPublicUrl(path).data.publicUrl
    }
    const row = { name: f.name, category: f.category, price: Number(f.price), description: f.description, in_stock: f.in_stock, image_url, sizes: String(f.sizes || '').split(',').map(s => s.trim()).filter(Boolean) }
    const { error } = id ? await supabase.from('products').update(row).eq('id', id) : await supabase.from('products').insert(row)
    setMsg(error ? 'Could not save.' : 'Saved.'); if (!error) { setF(blank); setFile(null); setId(null); load() }
  }
  const edit = p => { setId(p.id); setF({ ...p, sizes: (p.sizes || []).join(', ') }); scrollTo(0, 0) }
  const del = async p => { if (confirm(`Delete ${p.name}?`)) { await supabase.from('products').delete().eq('id', p.id); load() } }
  const set = k => e => setF({ ...f, [k]: e.target.value })
  return (<div className="panel">
    <div className="form"><h2>{id ? 'Edit product' : 'Add product'}</h2>
      <input placeholder="Name" value={f.name} onChange={set('name')} />
      <select value={f.category} onChange={set('category')}>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input placeholder="Price" inputMode="decimal" value={f.price} onChange={set('price')} />
      <input placeholder="Sizes, separated by commas (S, M, L)" value={f.sizes} onChange={set('sizes')} />
      <textarea placeholder="Description" value={f.description || ''} onChange={set('description')} />
      <label className="fine">Photo (a PNG with a transparent background gives the best try-on)<input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} /></label>
      <label className="row"><input type="checkbox" checked={f.in_stock} onChange={e => setF({ ...f, in_stock: e.target.checked })} /> In stock</label>
      {msg && <p className="fine">{msg}</p>}
      <button className="btn wide" onClick={save}>{id ? 'Save changes' : 'Add product'}</button>
      {id && <button className="link" onClick={() => { setId(null); setF(blank) }}>Cancel edit</button>}
    </div>
    <div>{list.map(p => <div className="line" key={p.id}><span>{p.name} · {money(p.price)}{!p.in_stock && ' · sold out'}</span><span><button className="link" onClick={() => edit(p)}>Edit</button> <button className="link" onClick={() => del(p)}>Delete</button></span></div>)}</div>
  </div>)
}

function Orders() {
  const [list, setList] = useState([])
  const load = () => supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => setList(data || []))
  useEffect(() => { load(); const ch = supabase.channel('o2').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load).subscribe(); return () => supabase.removeChannel(ch) }, [])
  const mark = async (o, status) => { await supabase.from('orders').update({ status }).eq('id', o.id); load() }
  return <div className="panel one">{!list.length && <p className="empty">No orders yet.</p>}{list.map(o => (
    <div className="order" key={o.id}><b>{o.customer_name}</b> · <a href={`https://wa.me/${o.phone.replace(/\D/g, '')}`} target="_blank">{o.phone}</a> · {new Date(o.created_at).toLocaleString()}
      <ul>{o.items.map((i, k) => <li key={k}>{i.name}{i.size && ` (${i.size})`} – {money(i.price)}</li>)}</ul>
      <b>{money(o.total)}</b> · <span className="tag">{o.status}</span> {o.note && <p className="fine">{o.note}</p>}
      {['confirmed', 'paid', 'shipped'].map(s => <button key={s} className="link" onClick={() => mark(o, s)}>Mark {s}</button>)}</div>))}</div>
}
