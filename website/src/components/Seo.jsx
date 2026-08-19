import { useEffect } from 'react';

export default function Seo({ title, description }) {
  useEffect(() => {
    const pageTitle = title
      ? `${title} · WAREZONE`
      : 'WAREZONE Tournament — Compete. Conquer. Win Big.';
    document.title = pageTitle;
    const desc =
      description ||
      'WAREZONE Free Fire esports tournaments. Browse matches, then join from the Android app or iPhone web app.';
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', desc);
    const og = document.querySelector('meta[property="og:title"]');
    if (og) og.setAttribute('content', pageTitle);
  }, [title, description]);
  return null;
}
