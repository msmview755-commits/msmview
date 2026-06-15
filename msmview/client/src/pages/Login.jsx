import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      console.log('API URL:', import.meta.env.VITE_API_URL)
      await login(email, password)
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      console.error('Response:', err.response?.data)
      console.error('Status:', err.response?.status)
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h1>MSM View</h1>
          <p>Clinical-grade intelligence for modern healthcare management. Providing precision and reliability for every patient journey.</p>
          <div className="login-badges">
            <div className="login-badge">
              <div className="badge-icon">
                <svg width="20" height="20" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div className="badge-title">Security</div>
              <div className="badge-val">HIPAA Compliant</div>
            </div>
            <div className="login-badge">
              <div className="badge-icon">
                <svg width="20" height="20" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div className="badge-title">Live Sync</div>
              <div className="badge-val">Real-time Metrics</div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form">
          <h2>Welcome Back</h2>
          <p>Please sign in to access your administrative dashboard.</p>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username or Email</label>
              <div className="input-icon-wrap">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input className="form-control" type="email" placeholder="Enter your credentials" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <div className="flex-between mb-1">
                <label style={{ margin: 0 }}>Password</label>
                <span style={{ fontSize: '0.78rem', color: 'var(--teal)', cursor: 'pointer' }}>Forgot?</span>
              </div>
              <div className="input-icon-wrap">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input className="form-control" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="eye-btn" onClick={() => setShowPw(!showPw)}>
                  {showPw ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group flex-center gap-1" style={{ marginBottom: '1.5rem' }}>
              <input type="checkbox" id="remember" />
              <label htmlFor="remember" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.82rem', color: 'var(--text-mid)', margin: 0 }}>Remember this device for 30 days</label>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Signing in...' : 'LOGIN'}
              {!loading && <span style={{ marginLeft: '0.5rem' }}>&rarr;</span>}
            </button>
          </form>

          <div className="login-footer">
            <p>Unauthorized access is strictly prohibited.</p>
            <p style={{ marginTop: '0.5rem' }}>
              <span style={{ cursor: 'pointer', color: 'var(--teal)' }}>Privacy Policy</span>
              {' · '}
              <span style={{ cursor: 'pointer', color: 'var(--teal)' }}>Terms of Service</span>
              {' · '}
              <span style={{ cursor: 'pointer', color: 'var(--teal)' }}>Support</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
