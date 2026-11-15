import nodemailer from 'nodemailer';
import { env, OWNER_EMAIL, siteUrl } from './config.js';
import { result } from './db.js';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export function reviewMessage(draft, assetCredits = []) {
  const c = draft.content;
  const link = `${siteUrl()}/admin/blog?draft=${draft.id}&revision=${draft.revision}`;
  const approvalLink = `${link}&approve=1`;
  const sources = c.sources.map(s => `${s.title}: ${s.url}`).join('\n');
  const images = c.images.map((i,index) => `${i.placement}: ${i.alt}${i.caption ? ` — ${i.caption}` : ''}${assetCredits[index] ? ` (${assetCredits[index]})` : ''}`).join('\n');
  return {
    subject: `[Blog review · v${draft.revision}] ${c.title}`,
    text: `${c.title}\nRevision ${draft.revision} · ${c.category}\n\n${c.markdown}\n\nSources\n${sources}\n\nImages\n${images || 'No images selected.'}\n\nApprove & publish v${draft.revision}: ${approvalLink}\nEdit this draft: ${link}\n\nOpening this link does not publish. Sign in if needed, then confirm publication of this exact version.`,
    html: `<h1>${escapeHtml(c.title)}</h1><p>Revision ${draft.revision} · ${escapeHtml(c.category)}</p><div style="white-space:pre-wrap;font:16px/1.7 system-ui">${escapeHtml(c.markdown)}</div><h2>Sources</h2><ul>${c.sources.map(s => `<li><a href="${escapeHtml(s.url)}">${escapeHtml(s.title)}</a></li>`).join('')}</ul><h2>Selected images</h2>${c.images.map((i,index) => `<figure><img src="cid:asset-${i.assetId}" alt="${escapeHtml(i.alt)}" style="max-width:100%;max-height:350px"><figcaption>${escapeHtml(i.caption || i.alt)}${assetCredits[index] ? ` · ${escapeHtml(assetCredits[index])}` : ''}</figcaption></figure>`).join('') || '<p>No images selected.</p>'}<div style="margin-top:32px;padding-top:24px;border-top:1px solid #d5b8aa"><p style="font:600 18px/1.5 system-ui">Ready to share this version?</p><p><a href="${escapeHtml(approvalLink)}" style="display:inline-block;background:#e89b74;color:#21130c;padding:14px 22px;border-radius:8px;font:600 16px/1.5 system-ui;text-decoration:none">Approve &amp; publish v${draft.revision}</a></p><p><a href="${escapeHtml(link)}">Edit this draft first</a></p><p style="font:14px/1.6 system-ui;color:#66564e">The button opens a confirmation page. Sign in if needed, then confirm to publish this exact emailed version. Opening the email or its links does not publish.</p></div>`
  };
}

export async function sendReview(db, id, revision) {
  const draft = await result(db.rpc('blog_begin_email', { p_id: id, p_revision: revision }));
  try {
    const attachments = []; const credits = [];
    for (const image of draft.content.images) {
      const asset = await result(db.from('blog_assets').select('*').eq('id',image.assetId).single());
      const { data, error } = await db.storage.from('blog-images').download(asset.path);
      if (error) throw new Error('A selected image could not be attached.');
      attachments.push({ filename: `${asset.id}.${asset.mime.split('/')[1]}`, content: Buffer.from(await data.arrayBuffer()), contentType: asset.mime, cid: `asset-${asset.id}` });
      credits.push(asset.credit.creator ? `${asset.credit.creator} · ${asset.credit.license || 'Uploaded image'} · ${asset.credit.sourceUrl || ''}` : 'Your upload');
    }
    const user = env('GMAIL_USER');
    if (user.toLowerCase() !== OWNER_EMAIL) throw new Error('GMAIL_USER must be the approved owner address.');
    const transport = nodemailer.createTransport({ host:'smtp.gmail.com',port:465,secure:true,
      auth:{ user,pass:env('GMAIL_APP_PASSWORD').replace(/\s/g,'') },connectionTimeout:15000,socketTimeout:30000 });
    const info = await transport.sendMail({ from:`Anuj’s Blog <${user}>`,to:OWNER_EMAIL,...reviewMessage(draft,credits),attachments });
    if (!info.accepted?.length) throw new Error('The email service did not accept the review.');
    const current = await result(db.rpc('blog_complete_email',{p_id:id,p_revision:revision,p_token:draft.email_token}));
    return { sent:true,current };
  } catch {
    // SMTP acceptance can be uncertain on timeout. Never retry mail automatically.
    const message = 'Review delivery could not be confirmed. Check your inbox before using Send review again.';
    await result(db.rpc('blog_complete_email',{p_id:id,p_revision:revision,p_token:draft.email_token,p_error:message}));
    throw Object.assign(new Error(message),{status:502});
  }
}
