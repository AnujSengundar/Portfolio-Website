import test from 'node:test';
import assert from 'node:assert/strict';
import { localDay, quotes, quoteTopics, selectQuote, rotateQuote, QUOTE_INTERVAL } from '../src/blog/quotes.js';

test('quote rotates after 24 hours without repeating and preserves previous history', () => {
  const history = { seen: [quotes[0].id], days: {} };
  const first = rotateQuote(history, 1000);
  assert.notEqual(first.quote.id, quotes[0].id);
  assert.equal(rotateQuote(first.history, 1000 + QUOTE_INTERVAL - 1).quote.id, first.quote.id);
  const next = rotateQuote(first.history, 1000 + QUOTE_INTERVAL);
  assert.notEqual(next.quote.id, first.quote.id);
  assert.notEqual(next.quote.id, quotes[0].id);
  assert.equal(rotateQuote({ seen: quotes.map(quote => quote.id), current: first.history.current }, 1000 + QUOTE_INTERVAL).quote, null);
});

test('daily selections stay stable and never select a previously seen quote', () => {
  let history = { seen: [], days: {} };
  const day = '2026-11-17';
  const first = selectQuote(day, 'All', history);
  history = { seen: [first.id], days: { [day]: { All: first.id } } };
  assert.equal(selectQuote(day, 'All', history).id, first.id);
  const next = selectQuote('2026-11-18', 'All', history);
  assert.notEqual(next.id, first.id);
  const anotherTopic = selectQuote(day, first.topics[0], history);
  if (anotherTopic) assert.notEqual(anotherTopic.id, first.id);
  assert.equal(selectQuote('2026-11-19', 'All', { seen: quotes.map(quote => quote.id), days: {} }), null);
});

test('quote metadata supports linked sources and interest filters', () => {
  assert.equal(new Set(quotes.map(quote => quote.id)).size, quotes.length);
  for (const quote of quotes) {
    assert.match(quote.url, /^https:\/\//);
    assert.ok(quote.source && quote.author && quote.text);
    for (const topic of quote.topics) assert.ok(quoteTopics.includes(topic));
  }
  for (const topic of quoteTopics.slice(1)) assert.ok(selectQuote('2026-11-17', topic, { seen: [], days: {} }).topics.includes(topic));
  assert.equal(localDay(new Date(2026, 0, 2)), '2026-01-02');
});

test('the collection supplies at least two years of non-repeating quotes', () => {
  assert.ok(quotes.length >= 731);
  const seen = new Set();
  let history = { seen: [], current: null };
  for (let day = 0; day < 731; day++) {
    const next = rotateQuote(history, 1000 + day * QUOTE_INTERVAL);
    assert.ok(next.quote, `No quote on day ${day + 1}`);
    assert.ok(!seen.has(next.quote.id), `Repeated quote on day ${day + 1}`);
    seen.add(next.quote.id);
    history = next.history;
  }
  assert.equal(history.seen.length, 731);
});

test('rotation excludes Dhammapada, features science and comics, and varies authors', () => {
  let history = { seen: [], current: null };
  let featuredCount = 0;
  let previousAuthor;
  assert.ok(quotes.every(quote => quote.author !== 'The Dhammapada' && !quote.id.startsWith('dhammapada-')));
  for (let day = 0; day < 100; day++) {
    const next = rotateQuote(history, 1000 + day * QUOTE_INTERVAL);
    const featured = next.quote.topics.includes('Science') || next.quote.topics.includes('Comics');
    if (featured) featuredCount++;
    const seen = new Set(history.seen);
    const alternate = quotes.some(quote => !seen.has(quote.id) && quote.author !== previousAuthor &&
      (quote.topics.includes('Science') || quote.topics.includes('Comics')) === featured);
    if (alternate) assert.notEqual(next.quote.author, previousAuthor);
    previousAuthor = next.quote.author;
    history = next.history;
  }
  assert.equal(featuredCount, 20);
  assert.ok(quotes.some(quote => quote.topics.includes('Comics')));
});

test('a previously displayed Dhammapada quote is replaced without losing seen history', () => {
  const history = { seen: ['dhammapada-5'], current: { id: 'dhammapada-5', since: 1000 } };
  const next = rotateQuote(history, 2000);
  assert.notEqual(next.quote.id, 'dhammapada-5');
  assert.ok(next.history.seen.includes('dhammapada-5'));
});
