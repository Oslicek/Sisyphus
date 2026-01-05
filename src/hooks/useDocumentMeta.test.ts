/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentMeta } from './useDocumentMeta';

describe('useDocumentMeta', () => {
  let originalTitle: string;
  let metaDescription: HTMLMetaElement | null;
  let ogTitle: HTMLMetaElement | null;
  let ogDescription: HTMLMetaElement | null;
  let canonical: HTMLLinkElement | null;

  beforeEach(() => {
    // Store original values
    originalTitle = document.title;

    // Create meta elements if they don't exist
    metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = 'description';
      metaDescription.content = 'Original description';
      document.head.appendChild(metaDescription);
    }

    ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      ogTitle.content = 'Original OG title';
      document.head.appendChild(ogTitle);
    }

    ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      ogDescription.content = 'Original OG description';
      document.head.appendChild(ogDescription);
    }

    canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      canonical.href = 'https://sisyfos.cz/';
      document.head.appendChild(canonical);
    }

    // Mock gtag
    window.gtag = vi.fn();
  });

  afterEach(() => {
    // Restore original title
    document.title = originalTitle;
    vi.clearAllMocks();
  });

  it('should update document title', () => {
    renderHook(() =>
      useDocumentMeta({
        title: 'Test Title',
        description: 'Test description',
      })
    );

    expect(document.title).toBe('Test Title');
  });

  it('should update meta description', () => {
    renderHook(() =>
      useDocumentMeta({
        title: 'Test Title',
        description: 'New meta description',
      })
    );

    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute('content')).toBe('New meta description');
  });

  it('should update og:title', () => {
    renderHook(() =>
      useDocumentMeta({
        title: 'New OG Title',
        description: 'Test description',
      })
    );

    const meta = document.querySelector('meta[property="og:title"]');
    expect(meta?.getAttribute('content')).toBe('New OG Title');
  });

  it('should update og:description', () => {
    renderHook(() =>
      useDocumentMeta({
        title: 'Test Title',
        description: 'New OG description',
      })
    );

    const meta = document.querySelector('meta[property="og:description"]');
    expect(meta?.getAttribute('content')).toBe('New OG description');
  });

  it('should update canonical URL based on pathname', () => {
    // Mock window.location.pathname
    Object.defineProperty(window, 'location', {
      value: { pathname: '/rozpoctovka', search: '' },
      writable: true,
    });

    renderHook(() =>
      useDocumentMeta({
        title: 'Test Title',
        description: 'Test description',
      })
    );

    const link = document.querySelector('link[rel="canonical"]');
    expect(link?.getAttribute('href')).toBe('https://sisyfos.cz/rozpoctovka');
  });

  it('should call gtag with page_path when gtag is available', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/blog', search: '?id=test' },
      writable: true,
    });

    renderHook(() =>
      useDocumentMeta({
        title: 'Blog Title',
        description: 'Blog description',
      })
    );

    expect(window.gtag).toHaveBeenCalledWith('config', 'G-1HPPMX917P', {
      page_path: '/blog?id=test',
    });
  });

  it('should not throw if gtag is not available', () => {
    // Remove gtag
    const originalGtag = window.gtag;
    // @ts-expect-error - testing undefined gtag
    window.gtag = undefined;

    expect(() => {
      renderHook(() =>
        useDocumentMeta({
          title: 'Test Title',
          description: 'Test description',
        })
      );
    }).not.toThrow();

    // Restore
    window.gtag = originalGtag;
  });

  it('should update when title or description changes', () => {
    const { rerender } = renderHook(
      ({ title, description }) => useDocumentMeta({ title, description }),
      {
        initialProps: { title: 'Initial Title', description: 'Initial description' },
      }
    );

    expect(document.title).toBe('Initial Title');

    rerender({ title: 'Updated Title', description: 'Updated description' });

    expect(document.title).toBe('Updated Title');
    const meta = document.querySelector('meta[name="description"]');
    expect(meta?.getAttribute('content')).toBe('Updated description');
  });
});

