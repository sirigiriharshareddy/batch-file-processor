import { useState } from 'react'
import './Login.css'

const LOGIN_URL = 'http://127.0.0.1:5000/api/login'
const SIGNUP_URL = 'http://127.0.0.1:5000/api/signup'

function Login({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        const url = isLogin ? LOGIN_URL : SIGNUP_URL

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            const data = await response.json()

            if (data.success) {
                onLogin(data.user)
            } else {
                setError(data.error || 'Operation failed')
            }
        } catch (err) {
            setError('Connection failed. Is the server running?')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">📊</div>
                    <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p>{isLogin ? 'Enter your credentials to access BatchCSV' : 'Sign up to start processing your CSV files'}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-message">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="input-field"
                            placeholder="Type your username..."
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="loader"></div>
                                {isLogin ? 'Authenticating...' : 'Creating Account...'}
                            </>
                        ) : (
                            isLogin ? 'Sign In' : 'Sign Up'
                        )}
                    </button>
                </form>

                <div style={{ marginTop: 24, textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            type="button"
                            className="btn-ghost"
                            style={{ marginLeft: 8, color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                        >
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login
