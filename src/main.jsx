import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/Blog.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BlogIndex, BlogPost } from "./blog/PublicBlog";
const AdminBlog = React.lazy(() => import("./blog/AdminBlog"));

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter><Routes>
      <Route path="/" element={<App />} />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      <Route path="/admin/blog" element={<React.Suspense fallback={<p className="blog-shell">Loading editor…</p>}><AdminBlog /></React.Suspense>} />
      <Route path="*" element={<main className="blog-shell"><h1>Page not found</h1><a href="/">Back to the portfolio</a></main>} />
    </Routes></BrowserRouter>
  </React.StrictMode>
);
