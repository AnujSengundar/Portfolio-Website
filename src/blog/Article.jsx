import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { assetUrl, privateAsset } from './client';
import { safeUrl, UUID } from '../../shared/blog';

export function BlogImage({ image, slug, credit }) {
  const [url,setUrl]=useState('');
  useEffect(()=>{
    if(slug) return;
    let active=true, objectUrl;
    privateAsset(image.assetId).then(value=>{objectUrl=value;if(active)setUrl(value);else URL.revokeObjectURL(value);}).catch(()=>{});
    return ()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[image.assetId,slug]);
  const source=slug?assetUrl(image.assetId,slug):url;
  return <figure className="blog-figure">{source?<img src={source} alt={image.alt} loading="lazy" />:<div className="blog-image-empty">Image preview unavailable</div>}
    <figcaption>{image.caption}{credit?.sourceUrl&&<> {image.caption?'· ':''}<a href={credit.sourceUrl} target="_blank" rel="noreferrer">{credit.creator}</a> · <a href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a></>}</figcaption></figure>;
}

export default function Article({ content, slug, assets=[] }) {
  const images=content.images||[];
  const credit=id=>assets.find(a=>a.id===id)?.credit;
  const cover=images.find(i=>i.placement==='cover');
  const components={
    a: ({href,children}) => {
      const url=safeUrl(href);
      const label=String(children);
      const isCitation=/^[1-9]\d*$/.test(label)&&content.sources?.some(source=>safeUrl(source.url)===url);
      const link=<a href={url||undefined} target="_blank" rel="noreferrer" aria-label={isCitation?`Source ${label}`:undefined}>{children}</a>;
      return isCitation?<sup className="blog-citation">{link}</sup>:link;
    },
    // Keep figures outside Markdown paragraphs; untrusted remote Markdown images never load.
    p: ({children}) => <div className="blog-paragraph">{children}</div>,
    img: ({src}) => {
      const id=src?.replace(/^asset:/,'');
      const item=images.find(i=>i.assetId===id&&i.placement==='inline');
      if(!item)return null;
      return <BlogImage image={item} slug={slug} credit={credit(id)} />;
    }
  };
  return <article className="blog-article"><p className="blog-label">{content.category}</p><h1>{content.title}</h1>
    {content.excerpt&&<p className="blog-excerpt">{content.excerpt}</p>}
    {cover&&<BlogImage image={cover} slug={slug} credit={credit(cover.assetId)} />}
    <div className="blog-prose"><ReactMarkdown skipHtml components={components} urlTransform={url=>url.startsWith('asset:')&&UUID.test(url.slice(6))?url:safeUrl(url)||''}>{content.markdown}</ReactMarkdown></div>
    {images.filter(i=>i.placement==='inline'&&!content.markdown.includes(`asset:${i.assetId}`)).map(i=><BlogImage key={i.assetId} image={i} slug={slug} credit={credit(i.assetId)} />)}
    {content.sources?.length>0&&<aside className="blog-sources"><h2>Sources & further reading</h2><ul>{content.sources.map((s,i)=><li key={`${s.url}-${i}`}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul></aside>}
  </article>;
}
