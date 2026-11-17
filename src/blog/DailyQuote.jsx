import { useEffect, useRef, useState } from 'react';
import { QUOTE_INTERVAL, rotateQuote } from './quotes';

const HISTORY_KEY = 'blog-quote-history-v1';

export default function DailyQuote() {
  const [result, setResult] = useState(null);
  const memory = useRef({ seen: [], current: null });

  useEffect(() => {
    let timer;
    function update() {
      window.clearTimeout(timer);
      let history = memory.current;
      let saved = true;
      try {
        const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
        if (stored && Array.isArray(stored.seen)) history = stored;
      } catch { saved = false; }
      const next = rotateQuote(history, Date.now());
      memory.current = next.history;
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next.history)); } catch { saved = false; }
      setResult({ quote: next.quote, saved });
      if (next.quote) timer = window.setTimeout(update, Math.max(1, next.history.current.since + QUOTE_INTERVAL - Date.now()));
    }
    function onStorage(event) { if (event.key === HISTORY_KEY) update(); }
    update();
    window.addEventListener('focus', update);
    window.addEventListener('storage', onStorage);
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', update); window.removeEventListener('storage', onStorage); };
  }, []);

  return <aside className="daily-quote" aria-labelledby="daily-quote-title">
    <p className="blog-label" id="daily-quote-title">A QUOTE FOR TODAY</p>
    <div aria-live="polite">{!result ? <p className="blog-muted">Finding a quote…</p> : result.quote ? <figure className="daily-quote-content"><blockquote>“{result.quote.text}”</blockquote><figcaption>— {result.quote.author}<br /><a href={result.quote.url} target="_blank" rel="noreferrer">{result.quote.source} ↗</a></figcaption></figure> : <p className="blog-muted">You’ve seen all the quotes in this collection. More will be added later.</p>}</div>
    {result && !result.saved && <p className="blog-muted daily-quote-notice" role="status">Quote history couldn’t be saved in this browser.</p>}
  </aside>;
}
