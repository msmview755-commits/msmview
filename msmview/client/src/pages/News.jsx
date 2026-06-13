import { useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

const TABS = ['international', 'national', 'community']
const TAB_LABELS = { international: 'International News', national: 'National News', community: 'Baps News' }

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600)  return `${Math.floor(diff/60)} min ago`
  if (diff < 86400) return `${Math.floor(diff/3600)} hours ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function News() {
  const [tab,     setTab]     = useState('international')
  const [news,    setNews]    = useState([])
  const [loading, setLoading] = useState(true)
  const [page,    setPage]    = useState(1)
  const PER_PAGE = 6

  useEffect(() => {
    setLoading(true)
    axios.get(`${API}/news?type=${tab}`)
      .then(r => { setNews(r.data); setPage(1) })
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [tab])

  const paginated = news.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const totalPages = Math.ceil(news.length / PER_PAGE)

  return (
    <div>
      <div className="flex-between mb-3">
        <div className="tabs">
          {TABS.map(t => (
            <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted">Filter by relevance</span>
      </div>

      {loading ? (
        <div className="loading">Loading news...</div>
      ) : (
        <>
          <div className="news-grid">
            {paginated.map((item, i) => (
              <div className="news-card" key={i} onClick={() => window.open(item.link, '_blank')}>
                {item.image ? (
                  <img className="news-card-img" src={item.image} alt={item.title} onError={e => { e.target.style.display='none' }} />
                ) : (
                  <div className="news-card-img" style={{ background: 'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'2rem' }}>📰</div>
                )}
                <div className="news-card-body">
                  <div className="news-card-title">{item.title}</div>
                  <div className="news-card-summary">{item.summary}</div>
                  <div className="news-card-footer">
                    <span>{timeAgo(item.pubDate)}</span>
                    <a className="read-more" href={item.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>Read More &gt;</a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex-center gap-1 mt-3" style={{ justifyContent:'center' }}>
              <button className="btn btn-outline" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>‹</button>
              {Array.from({ length: totalPages }, (_,i) => i+1).map(p => (
                <button key={p} className={`btn ${p===page ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="btn btn-outline" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
