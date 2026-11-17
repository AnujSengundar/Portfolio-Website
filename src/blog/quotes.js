import quoteCollection from './quoteCollection.js';

// Keep the original IDs so existing browser histories continue to work.
const originalQuotes = [
  { id: 'dhammapada-5', text: 'For hatred does not cease by hatred at any time: hatred ceases by love, this is an old rule.', author: 'The Dhammapada', source: 'Verse 5, translated by F. Max Müller', url: 'https://www.gutenberg.org/files/2017/2017-h/2017-h.htm', topics: ['Religion', 'Life'] },
  { id: 'dhammapada-236', text: 'Make thyself an island, work hard, be wise!', author: 'The Dhammapada', source: 'Verse 236, translated by F. Max Müller', url: 'https://www.gutenberg.org/files/2017/2017-h/2017-h.htm', topics: ['Religion', 'Growth'] },
  { id: 'dhammapada-43', text: 'Not a mother, not a father will do so much, nor any other relative; a well-directed mind will do us greater service.', author: 'The Dhammapada', source: 'Verse 43, translated by F. Max Müller', url: 'https://www.gutenberg.org/files/2017/2017-h/2017-h.htm', topics: ['Religion', 'Learning'] },
  { id: 'gita-2-20', text: 'Never the spirit was born; the spirit shall cease to be never;', author: 'The Bhagavad Gita', source: 'Chapter 2, translated by Edwin Arnold', url: 'https://www.gutenberg.org/files/2388/2388-h/2388-h.htm', topics: ['Religion', 'Life'] },
  { id: 'ecclesiastes-3-1', text: 'To every thing there is a season, and a time to every purpose under the heaven:', author: 'Ecclesiastes', source: '3:1, King James Version', url: 'https://www.kingjamesbibleonline.org/Ecclesiastes-3-1/', topics: ['Religion', 'Life'] },
  { id: 'odyssey-sea', text: 'For I tell thee there is nought else worse than the sea to confound a man, how hardy soever he may be.', author: 'Homer', source: 'The Odyssey, translated by Butcher and Lang', url: 'https://www.gutenberg.org/files/1728/1728-h/1728-h.htm', topics: ['Mythology', 'Books'] },
  { id: 'gospel-buddha-effort', text: 'You yourself must make an effort. The Tathāgatas are only preachers.', author: 'Paul Carus', source: 'The Gospel of Buddha, chapter XLVIII', url: 'https://www.gutenberg.org/files/35895/35895-h/35895-h.htm', topics: ['Religion', 'Growth'] },
  { id: 'jefferson-books', text: 'I cannot live without books.', author: 'Thomas Jefferson', source: 'Letter to John Adams, June 10, 1815', url: 'https://www.gutenberg.org/cache/epub/16784/pg16784-images.html', topics: ['Books', 'Learning'] },
  { id: 'emma-tenderness', text: 'There is no charm equal to tenderness of heart.', author: 'Jane Austen', source: 'Emma', url: 'https://www.gutenberg.org/cache/epub/158/pg158-images.html', topics: ['Books', 'Life'] },
  { id: 'whitman-multitudes', text: 'I am large, I contain multitudes.', author: 'Walt Whitman', source: 'Song of Myself, section 51', url: 'https://www.gutenberg.org/files/1322/1322-h/1322-h.htm', topics: ['Books', 'Life'] },
  { id: 'hound-obvious', text: 'The world is full of obvious things which nobody by any chance ever observes.', author: 'Arthur Conan Doyle', source: 'The Hound of the Baskervilles', url: 'https://www.gutenberg.org/cache/epub/3070/pg3070-images.html', topics: ['Books', 'Learning'] },
];

export const quotes = [...originalQuotes, ...quoteCollection];

export const quoteTopics = ['All', 'Books', 'Life', 'Growth', 'Learning', 'Religion', 'Mythology'];

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function selectQuote(day, topic, history) {
  const todaysId = history.days?.[day]?.[topic];
  const existing = quotes.find(quote => quote.id === todaysId);
  if (existing) return existing;
  const seen = new Set(history.seen || []);
  const pool = quotes.filter(quote => !seen.has(quote.id) && (topic === 'All' || quote.topics.includes(topic)));
  if (!pool.length) return null;
  let hash = 2166136261;
  for (const char of `${day}:${topic}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return pool[(hash >>> 0) % pool.length];
}

export const QUOTE_INTERVAL = 24 * 60 * 60 * 1000;

export function rotateQuote(history, now) {
  const existing = quotes.find(quote => quote.id === history.current?.id);
  if (existing && Number.isFinite(history.current.since) && now >= history.current.since && now - history.current.since < QUOTE_INTERVAL) {
    return { quote: existing, history };
  }
  const quote = selectQuote(String(now), 'All', { seen: history.seen });
  if (!quote) return { quote: null, history: { ...history, current: null } };
  return { quote, history: { ...history, seen: [...new Set([...(history.seen || []), quote.id])], current: { id: quote.id, since: now } } };
}
