import { createContext, useContext, useState } from 'react'
import axios from 'axios'

const AuthContext = createContext()
const API = import.meta.env.VITE_API_URL

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user,  setUser]  = useState(null)

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password })
    setToken(res.data.token)
    setUser(res.data.user)
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
