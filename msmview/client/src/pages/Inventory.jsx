import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL
const CATEGORIES = ['Santos', 'AV/IT', 'Sevaks']

// Inline SVG Icons
const SearchIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
)
const PackageIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
)
const ClipboardIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
)
const CheckIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
)
const PlusIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
)
const SendIcon = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
)
const ClockIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)
const XIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)

export default function Inventory() {
  const { user } = useAuth()
  const isManager = user?.role === 'inventory_manager' || user?.role === 'super_admin'
  const isMember = user?.role === 'member'
  const userGroup = user?.group || ''

  // Members are locked to their group, managers default to first category
  const defaultCat = isMember ? userGroup : 'Santos'
  const [cat,      setCat]      = useState(defaultCat)
  const [items,    setItems]    = useState([])
  const [requests, setRequests] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showReq,  setShowReq]  = useState(false)
  const [showAdd,  setShowAdd]  = useState(false)
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [updatingReqId, setUpdatingReqId] = useState(null)
  const PER_PAGE = 4

  const [reqForm, setReqForm] = useState({ requesterName: user?.name || '', item: '', quantity: '', category: cat })
  const [addForm, setAddForm] = useState({ name: user?.name || '', item: '', quantity: '', category: isMember ? userGroup : cat })

  const fetchData = () => {
    setLoading(true)
    const catParam = isManager ? `?category=${cat}` : ''
    Promise.all([
      axios.get(`${API}/inventory/items${catParam}`),
      axios.get(`${API}/inventory/requests${catParam}`)
    ]).then(([itemsR, reqR]) => {
      setItems(itemsR.data)
      setRequests(reqR.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [cat])

  // Update form category when tab changes
  useEffect(() => {
    setReqForm(f => ({ ...f, category: cat }))
    if (!isMember) setAddForm(f => ({ ...f, category: cat }))
  }, [cat])

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const handleRequest = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/inventory/requests`, { ...reqForm, category: isMember ? userGroup : cat })
      fetchData()
      setShowReq(false)
      setReqForm({ requesterName: user?.name || '', item: '', quantity: '', category: cat })
    } catch { alert('Error submitting request') }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/inventory/items`, {
        name: addForm.item,
        quantity: addForm.quantity,
        category: isMember ? userGroup : addForm.category
      })
      fetchData()
      setShowAdd(false)
      setAddForm({ name: user?.name || '', item: '', quantity: '', category: isMember ? userGroup : cat })
    } catch { alert('Error adding item') }
  }

  const handleStatus = async (id, status) => {
    setUpdatingReqId(id)
    try {
      await axios.patch(`${API}/inventory/requests/${id}`, { status })
      // Re-fetch both items and requests since completing a request updates stock
      fetchData()
    } catch { 
      alert('Error updating status') 
    } finally {
      setUpdatingReqId(null)
    }
  }

  return (
    <div>
      <div className="flex-between mb-1">
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Inventory Dashboard</h2>
          <p className="text-sm text-muted">
            {isMember
              ? `Viewing ${userGroup} inventory`
              : 'Manage and track clinical supplies and equipment.'}
          </p>
        </div>
        <div className="flex-center gap-1">
          <button className="btn btn-outline" onClick={() => setShowAdd(true)}>
            <span className="flex-center gap-1"><PlusIcon /> Add Item</span>
          </button>
          <button className="btn btn-primary" onClick={() => setShowReq(true)}>
            <span className="flex-center gap-1"><SendIcon /> Request Item</span>
          </button>
        </div>
      </div>

      {/* Category tabs + search — only managers/admins see tabs */}
      <div className="card mb-3 mt-2" style={{ padding: '1rem 1.5rem' }}>
        <div className="flex-between">
          <div className="flex-center gap-1">
            {isManager ? (
              <>
                <span className="text-sm fw-600 text-muted" style={{ marginRight: '0.5rem' }}>CATEGORIES:</span>
                <div className="tabs">
                  {CATEGORIES.map(c => (
                    <button key={c} className={`tab ${cat === c ? 'active' : ''}`} onClick={() => { setCat(c); setPage(1) }}>{c}</button>
                  ))}
                </div>
              </>
            ) : (
              <span className="fw-600" style={{ color: 'var(--teal)' }}>
                {userGroup} Inventory
              </span>
            )}
          </div>
          <div className="flex-center gap-1">
            <SearchIcon />
            <input className="form-control" style={{ width: 200 }} placeholder="Search inventory..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1.8fr 1fr', alignItems: 'start' }}>
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
                  {paginated.map((item) => (
                    <tr key={item._id}>
                      <td className="text-muted text-sm">{item.itemId}</td>
                      <td>
                        <div className="flex-center gap-1">
                          <span style={{ background: 'var(--cream)', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}><PackageIcon /></span>
                          {item.name}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{item.quantity}</td>
                      <td>
                        <span className={`badge ${item.quantity > 0 ? 'badge-complete' : 'badge-pending'}`}>
                          {item.quantity > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem' }}>No items found</td></tr>
                  )}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex-between mt-2" style={{ padding: '0.5rem 0' }}>
                  <span className="text-xs text-muted">Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}-{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}</span>
                  <div className="flex-center gap-1">
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.7rem' }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>&#8249;</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '0.3rem 0.7rem' }} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.7rem' }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>&#8250;</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Requests panel */}
        <div className="card">
          <div className="flex-center gap-1 fw-600 mb-2"><ClipboardIcon /> Requests</div>
          {requests.slice(0, 5).map(req => (
            <div key={req._id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
              <div className="flex-between">
                <span className="text-sm fw-600">{req.item}</span>
                <span className={`badge ${req.status === 'Pending' ? 'badge-pending' : 'badge-complete'}`}>{req.status}</span>
              </div>
              <div className="text-xs text-muted mt-1">By {req.requesterName} · Qty: {req.quantity}</div>
              {isManager && req.status === 'Pending' && (
                <div className="flex-center gap-1 mt-1">
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.25rem 0.7rem', fontSize: '0.75rem' }} 
                    onClick={() => handleStatus(req._id, 'Complete')}
                    disabled={updatingReqId === req._id}
                  >
                    <span className="flex-center gap-1">
                      <CheckIcon /> {updatingReqId === req._id ? 'Completing...' : 'Complete'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-muted">No requests yet.</p>}
        </div>
      </div>

      {/* Request Item Modal */}
      {showReq && (
        <div className="modal-overlay" onClick={() => setShowReq(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-3">
              <h2 style={{ margin: 0 }}>Submit New Request</h2>
              <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setShowReq(false)}><XIcon /></button>
            </div>
            <p className="text-sm text-muted mb-3">Fill out the details below to request items from the central inventory.</p>
            <form onSubmit={handleRequest}>
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" placeholder="Enter requester name" value={reqForm.requesterName} onChange={e => setReqForm({ ...reqForm, requesterName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                {isMember ? (
                  <input className="form-control" value={userGroup} disabled />
                ) : (
                  <select className="form-control" value={reqForm.category} onChange={e => setReqForm({ ...reqForm, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Item</label>
                <input className="form-control" placeholder="Enter item description" value={reqForm.item} onChange={e => setReqForm({ ...reqForm, item: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input className="form-control" type="number" placeholder="Enter required amount" value={reqForm.quantity} onChange={e => setReqForm({ ...reqForm, quantity: e.target.value })} required />
              </div>
              <div className="flex-between mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowReq(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><span className="flex-center gap-1"><SendIcon /> Submit Request</span></button>
              </div>
            </form>
            <div className="grid-2 mt-3">
              <div className="card-sm">
                <div className="text-xs fw-600 mb-1 flex-center gap-1"><ClockIcon /> Standard Processing Time</div>
                <p className="text-xs text-muted">Most inventory requests are processed within 24-48 hours.</p>
              </div>
              <div className="card-sm">
                <div className="text-xs fw-600 mb-1 flex-center gap-1"><ClipboardIcon /> Recent Requests</div>
                <p className="text-xs text-muted">You have {requests.filter(r => r.status === 'Pending').length} pending requests in the system.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-3">
              <h2 style={{ margin: 0 }}>Add New Item</h2>
              <button className="btn btn-outline" style={{ padding: '0.3rem 0.5rem' }} onClick={() => setShowAdd(false)}><XIcon /></button>
            </div>
            <p className="text-sm text-muted mb-3">Add a new item directly to the inventory stock.</p>
            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Your name" disabled />
              </div>
              <div className="form-group">
                <label>Category</label>
                {isMember ? (
                  <input className="form-control" value={userGroup} disabled />
                ) : (
                  <select className="form-control" value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Item</label>
                <input className="form-control" placeholder="Enter item name" value={addForm.item} onChange={e => setAddForm({ ...addForm, item: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input className="form-control" type="number" min="1" placeholder="Enter quantity" value={addForm.quantity} onChange={e => setAddForm({ ...addForm, quantity: e.target.value })} required />
              </div>
              <div className="flex-between mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><span className="flex-center gap-1"><PlusIcon /> Add Item</span></button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
