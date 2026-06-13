import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL
const CATEGORIES = ['Santos', 'AV/IT', 'Sevaks']

export default function Inventory() {
  const { user } = useAuth()
  const isManager = user?.role === 'inventory_manager' || user?.role === 'super_admin'
  const [cat,      setCat]      = useState('Santos')
  const [items,    setItems]    = useState([])
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showReq,  setShowReq]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const PER_PAGE = 4

  const [reqForm, setReqForm] = useState({ requesterName:'', item:'', quantity:'', category: cat })

  useEffect(() => {
    setLoading(true)
    Promise.all([
      axios.get(`${API}/inventory/items?category=${cat}`),
      axios.get(`${API}/inventory/requests?category=${cat}`)
    ]).then(([itemsR, reqR]) => {
      setItems(itemsR.data)
      setRequests(reqR.data)
    }).finally(() => setLoading(false))
  }, [cat])

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const lowStock = items.filter(i => i.quantity <= i.lowStockThreshold)

  const handleRequest = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/inventory/requests`, { ...reqForm, category: cat })
      const r = await axios.get(`${API}/inventory/requests?category=${cat}`)
      setRequests(r.data)
      setShowReq(false)
      setReqForm({ requesterName:'', item:'', quantity:'', category: cat })
    } catch { alert('Error submitting request') }
  }

  const handleStatus = async (id, status) => {
    try {
      await axios.patch(`${API}/inventory/requests/${id}`, { status })
      const r = await axios.get(`${API}/inventory/requests?category=${cat}`)
      setRequests(r.data)
    } catch { alert('Error updating status') }
  }

  return (
    <div>
      <div className="flex-between mb-1">
        <div>
          <h2 style={{ fontSize:'1.2rem', fontWeight:700 }}>Inventory Dashboard</h2>
          <p className="text-sm text-muted">Manage and track clinical supplies and equipment.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowReq(true)}>+ Request Item</button>
      </div>

      {/* Category tabs + search */}
      <div className="card mb-3 mt-2" style={{ padding:'1rem 1.5rem' }}>
        <div className="flex-between">
          <div className="flex-center gap-1">
            <span className="text-sm fw-600 text-muted" style={{ marginRight:'0.5rem' }}>CATEGORIES:</span>
            <div className="tabs">
              {CATEGORIES.map(c => (
                <button key={c} className={`tab ${cat===c?'active':''}`} onClick={() => { setCat(c); setPage(1) }}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex-center gap-1">
            <span>🔍</span>
            <input className="form-control" style={{ width:200 }} placeholder="Search inventory..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns:'1.8fr 1fr', alignItems:'start' }}>
        {/* Stock table */}
        <div className="card">
          <div className="flex-between mb-2">
            <span className="fw-600">Current Stock</span>
            <span className="badge badge-complete">{items.length} ITEMS TOTAL</span>
          </div>
          {loading ? <div className="loading">Loading...</div> : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item, i) => (
                    <tr key={item._id}>
                      <td className="text-muted text-sm">ID-{(page-1)*PER_PAGE+i+1}</td>
                      <td>
                        <div className="flex-center gap-1">
                          <span style={{ background:'var(--cream)', padding:'4px 6px', borderRadius:6, fontSize:'1rem' }}>📦</span>
                          {item.name}
                        </div>
                      </td>
                      <td style={{ color: item.quantity <= item.lowStockThreshold ? 'var(--red)' : 'var(--text-dark)', fontWeight: item.quantity <= item.lowStockThreshold ? 700 : 400 }}>{item.quantity}</td>
                      <td>
                        <span className={`badge ${item.quantity <= item.lowStockThreshold ? 'badge-pending' : 'badge-complete'}`}>
                          {item.quantity <= item.lowStockThreshold ? '● Pending' : '● Complete'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--text-light)', padding:'2rem' }}>No items found</td></tr>
                  )}
                </tbody>
              </table>
              <div className="flex-between mt-2" style={{ padding:'0.5rem 0' }}>
                <span className="text-xs text-muted">Showing {Math.min((page-1)*PER_PAGE+1, filtered.length)}-{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</span>
                <div className="flex-center gap-1">
                  <button className="btn btn-outline" style={{ padding:'0.3rem 0.7rem' }} onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>‹</button>
                  {Array.from({ length: totalPages }, (_,i) => i+1).map(p => (
                    <button key={p} className={`btn ${p===page?'btn-primary':'btn-outline'}`} style={{ padding:'0.3rem 0.7rem' }} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="btn btn-outline" style={{ padding:'0.3rem 0.7rem' }} onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Low stock + requests */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="card">
            <div className="fw-600 mb-2" style={{ color:'#e53e3e' }}>⚠ Low Stock Alerts</div>
            {lowStock.length === 0 ? <p className="text-sm text-muted">All items sufficiently stocked.</p> : (
              lowStock.map(item => (
                <div key={item._id} className="flex-between" style={{ padding:'0.4rem 0', borderBottom:'1px solid var(--border)', fontSize:'0.85rem' }}>
                  <span>{item.name}</span>
                  <span style={{ color:'var(--red)', fontWeight:600 }}>{item.quantity} Left</span>
                </div>
              ))
            )}
            <div className="mt-2"><span className="text-sm" style={{ color:'var(--teal)', cursor:'pointer' }}>View all alerts →</span></div>
          </div>

          {/* Requests panel — manager sees all, members see their own */}
          <div className="card">
            <div className="fw-600 mb-2">📋 Requests</div>
            {requests.slice(0,5).map(req => (
              <div key={req._id} style={{ padding:'0.6rem 0', borderBottom:'1px solid var(--border)' }}>
                <div className="flex-between">
                  <span className="text-sm fw-600">{req.item}</span>
                  <span className={`badge ${req.status==='Pending'?'badge-pending':'badge-complete'}`}>{req.status}</span>
                </div>
                <div className="text-xs text-muted mt-1">By {req.requesterName} · Qty: {req.quantity}</div>
                {isManager && req.status === 'Pending' && (
                  <div className="flex-center gap-1 mt-1">
                    <button className="btn btn-primary" style={{ padding:'0.25rem 0.7rem', fontSize:'0.75rem' }} onClick={() => handleStatus(req._id, 'Complete')}>✓ Complete</button>
                  </div>
                )}
              </div>
            ))}
            {requests.length === 0 && <p className="text-sm text-muted">No requests yet.</p>}
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showReq && (
        <div className="modal-overlay" onClick={() => setShowReq(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-3">
              <h2 style={{ margin:0 }}>Submit New Request</h2>
              <select className="form-control" style={{ width:160 }} value={reqForm.category} onChange={e => setReqForm({...reqForm, category:e.target.value})}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <p className="text-sm text-muted mb-3">Fill out the details below to request items from the central inventory.</p>
            <form onSubmit={handleRequest}>
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" placeholder="Enter requester name or department" value={reqForm.requesterName} onChange={e => setReqForm({...reqForm, requesterName:e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Item</label>
                <input className="form-control" placeholder="Enter item description or ID" value={reqForm.item} onChange={e => setReqForm({...reqForm, item:e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input className="form-control" type="number" placeholder="Enter required amount" value={reqForm.quantity} onChange={e => setReqForm({...reqForm, quantity:e.target.value})} required />
              </div>
              <div className="flex-between mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowReq(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">➤ Submit Request</button>
              </div>
            </form>
            <div className="grid-2 mt-3">
              <div className="card-sm">
                <div className="text-xs fw-600 mb-1">⏱ Standard Processing Time</div>
                <p className="text-xs text-muted">Most inventory requests are processed within 24-48 hours.</p>
              </div>
              <div className="card-sm">
                <div className="text-xs fw-600 mb-1">🕐 Recent Requests</div>
                <p className="text-xs text-muted">You have {requests.filter(r=>r.status==='Pending').length} pending requests in the system.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
