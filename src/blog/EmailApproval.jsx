import { Link } from 'react-router-dom';
import { canPublish } from '../../shared/blog';
import Article from './Article';

export default function EmailApproval({ draft, revision, assets, busy, onApprove }) {
  if (!draft) return <section className="admin-panel email-approval"><h2>Draft not found</h2><p>This email no longer points to an available draft.</p><Link to="/admin/blog">Open the blog editor</Link></section>;
  const current = draft.revision === revision;
  const published = current && draft.published_revision === revision;
  const ready = current && canPublish(draft, revision) && !published;
  const editor = `/admin/blog?${new URLSearchParams({ draft: draft.id, revision: String(revision) })}`;
  return <section className="admin-panel email-approval" aria-labelledby="email-approval-title">
    <p className="blog-label">EMAIL REVIEW · VERSION {revision}</p>
    <h2 id="email-approval-title">{published ? 'This version is already published.' : 'Ready to publish?'}</h2>
    <p className="email-approval-name">{draft.content.title}</p>
    {!current ? <p className="blog-alert" role="alert">This draft changed after the email was sent. Open the latest review email to approve the updated version.</p>
      : published ? <p>There is nothing else to approve for this version.</p>
      : !ready ? <p className="blog-alert" role="alert">Email delivery for this version has not been confirmed. Send the full draft from the editor before approving it.</p>
      : <p>You’re approving the exact version sent in your email. Confirm below to make the article public on your blog.</p>}
    <div className="email-approval-actions">
      {ready && <button className="blog-button" disabled={busy} onClick={onApprove}>{busy ? 'Publishing…' : `Confirm & publish v${revision}`}</button>}
      <Link className="blog-button secondary" to={editor}>Open editor</Link>
      {published && <Link to="/blog">View public blog →</Link>}
    </div>
    {current && <details className="email-approval-preview"><summary>Read this version again</summary><Article content={draft.content} assets={assets} /></details>}
  </section>;
}
