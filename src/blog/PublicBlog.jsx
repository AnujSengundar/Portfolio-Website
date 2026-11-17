import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowUpRight, FiArrowLeft, FiMessageSquare } from 'react-icons/fi';
import { CATEGORIES } from '../../shared/blog';
import { api, assetUrl } from './client';
import Article from './Article';
const DailyQuote = lazy(() => import('./DailyQuote'));

export function BlogHeader() {
  return <header className="site-header"><Link className="brand" to="/" aria-label="Anuj Sengundar home">AS<span>.</span></Link><span className="header-caption">NOTES & INTERESTS</span><nav className="blog-nav" aria-label="Blog navigation"><Link to="/">Portfolio</Link><Link to="/blog">Blog</Link><a className="nav-contact" href="/#contact" aria-label="Go to contact section"><FiMessageSquare /></a></nav></header>;
}
function usePosts() {
  const [posts,setPosts]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;api('posts',undefined,{},false).then(data=>{if(active)setPosts(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  return {posts,error,loading};
}
function Cards({posts}) {
  return <div className="blog-cards">{posts.map(post=>{
    const cover=post.content.images?.find(i=>i.placement==='cover');
    return <Link className="blog-card" to={`/blog/${post.slug}`} key={post.slug}>
      {cover&&<img src={assetUrl(cover.assetId,post.slug)} alt={cover.alt} loading="lazy" />}
      <div className="blog-card-copy"><p className="blog-label">{post.content.category}</p><h2>{post.content.title}</h2><p>{post.content.excerpt}</p><span className="blog-card-footer">{new Date(post.published_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}<FiArrowUpRight /></span></div>
    </Link>;
  })}</div>;
}
export function RecentPosts() {
  const {posts,error,loading}=usePosts();
  return <section className="section-shell blog-home" id="blog"><div className="section-kicker"><span>NOTES & INTERESTS</span><Link to="/blog">VIEW BLOG ↗</Link></div><div className="section-heading"><h2>Beyond<br /><em>the code.</em></h2><p>Notes on technology, films, music, books, and the things that catch my attention.</p></div>
    {loading?<p className="blog-muted">Loading articles…</p>:error?<p className="blog-muted">Articles are temporarily unavailable. <Link to="/blog">Visit the blog</Link></p>:posts.length?<Cards posts={posts.slice(0,3)} />:<p className="blog-empty">The first articles are on their way.</p>}
  </section>;
}
export function BlogIndex() {
  const {posts,error,loading}=usePosts();const [category,setCategory]=useState('All');
  useEffect(()=>{document.title='Blog — Anuj Sengundar';},[]);
  return <><BlogHeader /><main className="blog-shell"><div className="blog-introduction"><div><p className="blog-label">THE BLOG</p><h1 className="blog-page-title">Notes, ideas,<br /><em>and interests.</em></h1><p className="blog-intro">A space for technology, stories, music, and everything in between.</p></div><Suspense fallback={null}><DailyQuote /></Suspense></div>
    <div className="blog-filters" aria-label="Filter articles">{['All',...CATEGORIES].map(c=><button type="button" aria-pressed={category===c} key={c} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    {loading?<p role="status">Loading articles…</p>:error?<p role="alert">{error}</p>:posts.filter(p=>category==='All'||p.content.category===category).length?<Cards posts={posts.filter(p=>category==='All'||p.content.category===category)} />:<p className="blog-empty">No articles here yet. Check back soon.</p>}
  </main></>;
}
export function BlogPost() {
  const {slug}=useParams();const [post,setPost]=useState(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;setPost(null);setError('');api('post',undefined,{slug},false).then(data=>{if(active){setPost(data);document.title=`${data.content.title} — Anuj Sengundar`;}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[slug]);
  return <><BlogHeader /><main className="blog-shell"><Link className="blog-back" to="/blog"><FiArrowLeft /> All articles</Link>{error?<p role="alert">{error}</p>:post?<><p className="blog-muted">Anuj Sengundar · {new Date(post.published_at).toLocaleDateString('en-IN')}</p><Article content={post.content} slug={slug} assets={post.assets} /></>:<p role="status">Loading article…</p>}</main></>;
}
