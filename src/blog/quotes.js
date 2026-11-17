import quoteCollection from './quoteCollection.js';
import additionalQuotes from './additionalQuotes.js';

// Keep the original IDs so existing browser histories continue to work.
const originalQuotes = [
  { id: 'gita-2-20', text: 'Never the spirit was born; the spirit shall cease to be never;', author: 'The Bhagavad Gita', source: 'Chapter 2, translated by Edwin Arnold', url: 'https://www.gutenberg.org/files/2388/2388-h/2388-h.htm', topics: ['Religion', 'Life'] },
  { id: 'ecclesiastes-3-1', text: 'To every thing there is a season, and a time to every purpose under the heaven:', author: 'Ecclesiastes', source: '3:1, King James Version', url: 'https://www.kingjamesbibleonline.org/Ecclesiastes-3-1/', topics: ['Religion', 'Life'] },
  { id: 'odyssey-sea', text: 'For I tell thee there is nought else worse than the sea to confound a man, how hardy soever he may be.', author: 'Homer', source: 'The Odyssey, translated by Butcher and Lang', url: 'https://www.gutenberg.org/files/1728/1728-h/1728-h.htm', topics: ['Mythology', 'Books'] },
  { id: 'jefferson-books', text: 'I cannot live without books.', author: 'Thomas Jefferson', source: 'Letter to John Adams, June 10, 1815', url: 'https://www.gutenberg.org/cache/epub/16784/pg16784-images.html', topics: ['Books', 'Learning'] },
  { id: 'emma-tenderness', text: 'There is no charm equal to tenderness of heart.', author: 'Jane Austen', source: 'Emma', url: 'https://www.gutenberg.org/cache/epub/158/pg158-images.html', topics: ['Books', 'Life'] },
  { id: 'whitman-multitudes', text: 'I am large, I contain multitudes.', author: 'Walt Whitman', source: 'Song of Myself, section 51', url: 'https://www.gutenberg.org/files/1322/1322-h/1322-h.htm', topics: ['Books', 'Life'] },
  { id: 'hound-obvious', text: 'The world is full of obvious things which nobody by any chance ever observes.', author: 'Arthur Conan Doyle', source: 'The Hound of the Baskervilles', url: 'https://www.gutenberg.org/cache/epub/3070/pg3070-images.html', topics: ['Books', 'Learning'] },
];

export const quotes = [...originalQuotes, ...quoteCollection, ...additionalQuotes];

export const quoteTopics = ['All', 'Books', 'Life', 'Learning', 'Religion', 'Mythology', 'Science', 'Comics'];

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

function nextQuote(history, now, previous) {
  const seen = new Set(history.seen || []);
  const remaining = quotes.filter(quote => !seen.has(quote.id));
  if (!remaining.length) return null;

  // Surface science and comics regularly without repeating a passage.
  const featured = remaining.filter(quote => quote.topics.includes('Science') || quote.topics.includes('Comics'));
  const other = remaining.filter(quote => !quote.topics.includes('Science') && !quote.topics.includes('Comics'));
  let pool = (seen.size + 1) % 5 === 0 ? featured : other;
  if (!pool.length) pool = remaining;
  const differentAuthor = pool.filter(quote => quote.author !== previous?.author);
  if (differentAuthor.length) pool = differentAuthor;

  let hash = 2166136261;
  for (const char of String(now)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return pool[(hash >>> 0) % pool.length];
}

export function rotateQuote(history, now) {
  const existing = quotes.find(quote => quote.id === history.current?.id);
  if (existing && Number.isFinite(history.current.since) && now >= history.current.since && now - history.current.since < QUOTE_INTERVAL) {
    return { quote: existing, history };
  }
  const quote = nextQuote(history, now, existing);
  if (!quote) return { quote: null, history: { ...history, current: null } };
  return { quote, history: { ...history, seen: [...new Set([...(history.seen || []), quote.id])], current: { id: quote.id, since: now } } };
}
