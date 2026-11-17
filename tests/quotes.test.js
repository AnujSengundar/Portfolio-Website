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
