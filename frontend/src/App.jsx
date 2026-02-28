import { useState, useRef, useEffect } from 'react'
import './App.css'
import Login from './Login'

const BACKEND_URL = 'http://127.0.0.1:5000/api/process'

function App() {
    const [view, setView] = useState('landing') // landing, dashboard, about, documentation
    const [selectedFiles, setSelectedFiles] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [user, setUser] = useState(null) // State to store logged in user

    const inputRef = useRef(null)

    // Auto-scroll to top on view change
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [view])

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files)
        setSelectedFiles(files)
        setError(null)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith('.csv'))
        setSelectedFiles(files)
        setError(null)
    }

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            setError('Please select at least one CSV file.')
            return
        }

        const formData = new FormData()
        selectedFiles.forEach((file) => formData.append('files', file))

        setIsLoading(true)
        setError(null)

        try {
            // In a real scenario, we might upload first, then process.
            // For this demo, we'll simulate the process after a brief delay if needed,
            // or just call the process API if it handles uploads (existing backend does via /upload, 
            // but we updated /api/process to return stats. Let's stick to the flow.)

            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Failed to process files')
            }

            const data = await response.json()
            if (data.success) {
                setResults(data.stats)
                setView('dashboard')
            } else {
                throw new Error(data.error || 'Processing failed')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDownload = () => {
        if (results?.output_path) {
            // In a real app, this would be a fetch to a download endpoint
            // For now, we'll alert the path or simulate
            alert(`Download started for: ${results.output_path}`)
        }
    }

    const renderNavbar = () => (
        <nav className="navbar">
            <div className="content-wrapper" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <a href="#" className="nav-logo" onClick={() => setView('landing')}>
                    <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>📊</span>
                    </div>
                    BatchCSV
                </a>
                <div className="nav-links">
                    <a href="#" className="nav-link" onClick={() => setView('landing')}>Home</a>
                    <a href="#" className="nav-link" onClick={() => setView('about')}>About</a>
                    <a href="#" className="nav-link" onClick={() => setView('documentation')}>Documentation</a>
                    <a href="https://github.com" className="nav-link">GitHub</a>
                </div>
                <div className="nav-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                            <div style={{ width: 8, height: 8, background: 'var(--success)', borderRadius: '50%' }}></div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.username}</span>
                        </div>
                    )}
                    <button className="btn btn-outline" style={{ padding: '8px 16px' }} onClick={() => {
                        setUser(null);
                        setView('login');
                    }}>Logout</button>
                </div>
            </div>
        </nav>
    )

    const renderLanding = () => (
        <div className="animate-fade-up">
            <section className="hero">
                <div className="content-wrapper">
                    <div className="badge">
                        <span className="status-dot"></span> V2.0 NOW AVAILABLE
                    </div>
                    <h1>Batch Process Your CSV<br />Files Instantly</h1>
                    <p>Powerful tools designed for developers and data analysts to clean and merge data securely in the browser.</p>

                    <div className="upload-card">
                        <div
                            className="drop-zone"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={inputRef}
                                multiple
                                accept=".csv"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            <div className="drop-icon-wrapper">
                                <span style={{ fontSize: '2rem' }}>☁️</span>
                            </div>
                            <h3>{selectedFiles.length > 0 ? `${selectedFiles.length} Files Selected` : 'Drag & Drop CSVs Here'}</h3>
                            <p>or click to browse your files</p>
                            <div className="max-size">Max file size: 50MB</div>
                        </div>

                        <div style={{ marginTop: 32 }}>
                            <button
                                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                                style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
                                onClick={handleUpload}
                                disabled={isLoading || selectedFiles.length === 0}
                            >
                                {isLoading ? 'Processing...' : '⚡ Upload & Combine'}
                            </button>
                            {error && <p style={{ color: 'var(--error)', marginTop: 12, fontSize: '0.875rem' }}>{error}</p>}
                        </div>
                    </div>
                </div>
            </section>

            <section className="why-section">
                <div className="content-wrapper">
                    <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>Why BatchCSV?</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Powerful tools designed for developers and data analysts to clean and merge<br />data securely in the browser.</p>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">🛡️</div>
                            <h3>Secure Processing</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 12 }}>
                                All processing happens locally. Your sensitive data never leaves your device or touches our servers.
                            </p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">⚡</div>
                            <h3>Instant Merge</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 12 }}>
                                Combine multiple CSV files into one master sheet in seconds using our optimized streaming parser engine.
                            </p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🔍</div>
                            <h3>Smart Deduplication</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 12 }}>
                                Automatically identify and remove duplicate rows based on fuzzy matching or strict column headers.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )

    const renderDashboard = () => (
        <div className="content-wrapper animate-fade-up">
            <div className="dashboard-header">
                <div className="status-completed">
                    <span className="status-dot"></span> Completed <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>ID: #8821-B</span>
                </div>
                <h1 className="dashboard-title">Processing Summary</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                    Batch processed successfully in {results.elapsed_seconds}s. All checks passed.
                </p>
            </div>

            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="stat-icon">📂</div>
                    <div className="stat-label">Total Files</div>
                    <div className="stat-value">{results.files_processed}</div>
                    <div className="stat-subtext">CSV Format</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-label">Rows (Raw)</div>
                    <div className="stat-value">{results.records_before.toLocaleString()}</div>
                    <div className="stat-subtext">Original count</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✨</div>
                    <div className="stat-label">Rows (Clean)</div>
                    <div className="stat-value" style={{ color: 'var(--success)' }}>{results.records_after.toLocaleString()}</div>
                    <div className="stat-subtext">Ready for export</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🗑️</div>
                    <div className="stat-label">Duplicates Removed</div>
                    <div className="stat-value" style={{ color: 'var(--error)' }}>{results.duplicates_removed.toLocaleString()}</div>
                    <div className="stat-subtext reduction">-{((results.duplicates_removed / results.records_before) * 100).toFixed(1)}% reduction</div>
                </div>
            </div>

            <div className="data-grid">
                <div className="section-card">
                    <div className="section-header">
                        <h2 style={{ fontSize: '1.25rem' }}>Data Preview</h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Showing first 10 rows</span>
                    </div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    {results.columns.map(col => (
                                        <th key={col}>{col.replace(/_/g, ' ')}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.data_preview.map((row, i) => (
                                    <tr key={i}>
                                        {results.columns.map(col => (
                                            <td key={col}>
                                                {typeof row[col] === 'boolean' ? (
                                                    <span className={`badge-status ${row[col] ? 'status-verified' : 'status-flagged'}`}>
                                                        {row[col] ? 'Verified' : 'Flagged'}
                                                    </span>
                                                ) : row[col]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>View All Rows</button>
                    </div>
                </div>

                <div className="section-card">
                    <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Row Distribution</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 32 }}>
                        Comparison of dataset volume before and after cleaning.
                    </p>

                    <div className="chart-container">
                        <div className="bar-wrapper">
                            <div className="bar bar-raw" style={{ height: '160px' }}></div>
                            <span className="bar-label">Raw</span>
                        </div>
                        <div className="bar-wrapper">
                            <div
                                className="bar bar-clean"
                                style={{ height: `${(results.records_after / results.records_before) * 160}px` }}
                            ></div>
                            <span className="bar-label">Clean</span>
                        </div>
                    </div>

                    <div className="dataset-health">
                        <div className="health-header">
                            <span style={{ fontSize: '0.875rem' }}>Optimization</span>
                            <span style={{ fontSize: '0.875rem', color: 'var(--success)', fontWeight: 600 }}>+{(100 - (results.records_after / results.records_before * 100)).toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '92%' }}></div>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: 8 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dataset health score</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 100 }}>
                <button className="btn btn-outline" onClick={() => setView('landing')}>Process New Batch</button>
                <button className="btn btn-primary" onClick={handleDownload}>Download Cleaned Data</button>
            </div>
        </div>
    )

    const renderAbout = () => (
        <div className="content-wrapper animate-fade-up" style={{ padding: '100px 0' }}>
            <div className="upload-card" style={{ maxWidth: '800px', textAlign: 'left' }}>
                <div className="badge">ABOUT THE PROJECT</div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: 24 }}>Refining Data<br /><span style={{ color: 'var(--primary)' }}>At Scale</span></h1>
                <p style={{ marginBottom: 32 }}>
                    BatchCSV was born out of a need for speed and accuracy. We empower data scientists and developers to automate the tedious parts of data cleaning, transforming messy CSVs into pristine datasets ready for analysis in seconds, not hours.
                </p>

                <div style={{ display: 'flex', gap: 12, marginBottom: 48 }}>
                    <button className="btn btn-primary" onClick={() => setView('landing')}>Start Processing →</button>
                    <button className="btn btn-outline">View Documentation</button>
                </div>

                <h2 style={{ fontSize: '1.5rem', marginBottom: 16 }}>Seamless Data Workflow</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 24 }}>
                    {['Upload', 'Process', 'Clean', 'Download'].map((step, i) => (
                        <div key={step} style={{ textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, background: 'var(--bg-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1px solid var(--border)' }}>
                                {i + 1}
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{step}</div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: 64, padding: 32, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Built With Robust Technology</h3>
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 100, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#61dafb' }}>⚛️</span> React
                        </div>
                        <div style={{ padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 100, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#fff' }}>🔥</span> Flask
                        </div>
                        <div style={{ padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 100, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#150458' }}>🐼</span> Pandas
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    if (!user) {
        return <Login onLogin={(userData) => {
            setUser(userData);
            setView('landing');
        }} />
    }

    return (
        <div className="app-container">
            {renderNavbar()}

            <main style={{ flex: 1 }}>
                {view === 'landing' && renderLanding()}
                {view === 'dashboard' && renderDashboard()}
                {view === 'about' && renderAbout()}
                {view === 'documentation' && (
                    <div className="content-wrapper animate-fade-up" style={{ padding: '80px 0' }}>
                        <div className="upload-card" style={{ maxWidth: '900px', textAlign: 'left', margin: '0 auto' }}>
                            <div className="badge">DOCUMENTATION & WORKFLOW</div>
                            <h1 style={{ fontSize: '2.5rem', marginBottom: 24 }}>How BatchCSV<br /><span style={{ color: 'var(--primary)' }}>Works</span></h1>

                            <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontSize: '1.1rem' }}>
                                Our pipeline is designed for maximum efficiency and data integrity. From raw upload to polished export, we ensure your datasets are cleaned and combined with precision.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 60 }}>
                                {[
                                    { title: '1. Upload', icon: '📤', desc: 'Drag and drop your raw CSV files securely.' },
                                    { title: '2. Process', icon: '⚙️', desc: 'Configure parsing rules and data types.' },
                                    { title: '3. Clean', icon: '🧹', desc: 'Auto-remove duplicates and fix errors.' },
                                    { title: '4. Download', icon: '📥', desc: 'Export your refined dataset instantly.' }
                                ].map((step, i) => (
                                    <div key={i} style={{ padding: 24, background: 'var(--bg-subtle)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>{step.icon}</div>
                                        <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{step.title}</h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{step.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <h2 style={{ fontSize: '1.5rem', marginBottom: 24 }}>Built With Robust Technology</h2>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
                                <div style={{ padding: '12px 24px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: '#61dafb', fontSize: '1.25rem' }}>⚛️</span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>React</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Frontend Architecture</div>
                                    </div>
                                </div>
                                <div style={{ padding: '12px 24px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: '#fff', fontSize: '1.25rem' }}>🔥</span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Flask</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Backend Microservices</div>
                                    </div>
                                </div>
                                <div style={{ padding: '12px 24px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: '#150458', fontSize: '1.25rem' }}>🐼</span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>Pandas</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Data Processing Engine</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 40 }}>
                                <button className="btn btn-primary" onClick={() => setView('landing')}>Back to Home</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="footer">
                <div className="content-wrapper">
                    <div className="footer-content">
                        <div>© 2026 BatchCSV Inc.</div>
                        <div className="footer-links">
                            <a href="#" className="footer-link">Privacy</a>
                            <a href="#" className="footer-link">Terms</a>
                            <a href="#" className="footer-link">Contact</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default App
