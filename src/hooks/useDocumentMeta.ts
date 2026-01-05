import { useEffect } from 'react';

const GA_MEASUREMENT_ID = 'G-1HPPMX917P';

interface DocumentMeta {
  title: string;
  description: string;
}

/**
 * Hook to update document meta tags for SEO and track page views in Google Analytics.
 * Updates: document.title, meta description, og:title, og:description, canonical URL
 */
export function useDocumentMeta({ title, description }: DocumentMeta): void {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', description);
    }

    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', `https://sisyfos.cz${window.location.pathname}`);
    }

    // Track page view in Google Analytics
    if (typeof window.gtag === 'function') {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: window.location.pathname + window.location.search,
      });
    }
  }, [title, description]);
}

