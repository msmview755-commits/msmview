import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

export default function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member', group: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/auth/users`)
      setUsers(res.data)
    } catch {
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await axios.post(`${API}/auth/create-user`, form)
      setSuccess('User created successfully')
      setForm({ name: '', email: '', password: '', role: 'member', group: '' })
      setShowForm(false)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return
    setError('')
    setSuccess('')
    try {
      await axios.delete(`${API}/auth/users/${id}`)
      setSuccess(`${name} deleted successfully`)
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete user')
    }
  }

  if (user?.role !== 'super_admin') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-light)' }}>
        <h2>Access Denied</h2>
        <p>Only super admins can manage users.</p>
      </div>
    )
  }

  const roleBadge = (role) => {
    const colors = {
      super_admin: { bg: '#e8f0f0', color: 'var(--teal)' },
      doctor: { bg: '#dbeafe', color: '#1d4ed8' },
      inventory_manager: { bg: '#fef3c7', color: '#d97706' },
      member: { bg: '#f3f4f6', color: '#6b7280' }
    }
    const c = colors[role] || colors.member
    return <span className="badge" style={{ background: c.bg, color: c.color }}>{role.replace('_', ' ')}</span>
  }

  return (
    <div>
      <div className="flex-between mb-3">
        <div>
          <p className="text-sm text-muted">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.7rem 1rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: '1rem' }}>{success}</div>}

      {showForm && (
        <div className="card mb-3">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1.2rem' }}>Create New User</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Full Name</label>
                <input className="form-control" placeholder="e.g. John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="form-control" type="email" placeholder="e.g. john@msmview.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input className="form-control" type="password" placeholder="Minimum 6 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                  <option value="member">Member</option>
                  <option value="doctor">Doctor</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Group</label>
                <select className="form-control" value={form.group} onChange={e => setForm({...form, group: e.target.value})}>
                  <option value="">No Group</option>
                  <option value="Santos">Santos</option>
                  <option value="AV/IT">AV/IT</option>
                  <option value="Sevaks">Sevaks</option>
                </select>
              </div>
            </div>
            <div className="flex-between mt-2">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Group</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{roleBadge(u.role)}</td>
                  <td>{u.group || '—'}</td>
                  <td className="text-muted text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    {u._id !== user.id && (
                      <button
                        className="btn btn-danger"
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
                        onClick={() => handleDelete(u._id, u.name)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
