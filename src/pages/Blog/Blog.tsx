import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { ShareButtons } from '../../components/ShareButtons';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import styles from './Blog.module.css';

interface BlogPost {
  id: string;
  date: string;
  title: string;
  image?: string;
  content: string;
}

interface BlogData {
  description: string;
  posts: BlogPost[];
}

export function Blog() {
  useDocumentMeta({
    title: 'Blog – Novinky o státním dluhu a rozpočtu ČR',
    description: 'Aktuální články a analýzy o státním dluhu, rozpočtu a veřejných financích České republiky.',
  });

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch('/data/blog-posts.json');
        const data: BlogData = await response.json();
        setPosts(data.posts);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch blog posts:', err);
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Parse markdown-style links [text](url) in content
  const parseLinks = (text: string, keyPrefix: string = ''): React.ReactNode[] => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add the link
      parts.push(
        <a 
          key={`${keyPrefix}${match.index}`} 
          href={match[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.contentLink}
        >
          {match[1]}
        </a>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  // Check if paragraph is a blockquote (starts with "> ")
  const isBlockquote = (text: string): boolean => {
    return text.startsWith('> ');
  };

  // Remove blockquote marker and parse content
  const parseBlockquote = (text: string): string => {
    // Handle multi-line blockquotes (each line starts with "> ")
    return text
      .split('\n')
      .map(line => line.startsWith('> ') ? line.slice(2) : line)
      .join('\n');
  };

  // Check if paragraph is an unordered list (all lines start with "- ")
  const isUnorderedList = (text: string): boolean => {
    const lines = text.split('\n');
    return lines.length > 0 && lines.every(line => line.startsWith('- '));
  };

  // Check if paragraph is an ordered list (all lines start with "N. ")
  const isOrderedList = (text: string): boolean => {
    const lines = text.split('\n');
    return lines.length > 0 && lines.every(line => /^\d+\.\s/.test(line));
  };

  // Parse list items
  const parseListItems = (text: string, isOrdered: boolean): string[] => {
    return text.split('\n').map(line => {
      if (isOrdered) {
        return line.replace(/^\d+\.\s/, '');
      }
      return line.slice(2); // Remove "- "
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>← Zpět na hlavní stránku</Link>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Blog</h1>

        {loading ? (
          <p className={styles.loading}>Načítám příspěvky...</p>
        ) : posts.length === 0 ? (
          <p className={styles.empty}>Zatím nejsou žádné příspěvky.</p>
        ) : (
          <div className={styles.posts}>
            {posts.map((post) => (
              <article key={post.id} className={styles.post}>
                <time className={styles.postDate}>{formatDate(post.date)}</time>
                <h2 className={styles.postTitle}>{post.title}</h2>
                {post.image && (
                  <img 
                    src={`/images/blog/${post.image}`} 
                    alt={post.title}
                    className={styles.postImage}
                  />
                )}
                <div className={styles.postContent}>
                  {post.content.split('\n\n').map((paragraph, index) => {
                    if (isBlockquote(paragraph)) {
                      const quoteText = parseBlockquote(paragraph);
                      return (
                        <blockquote key={index} className={styles.blockquote}>
                          <p>{parseLinks(quoteText, `quote-${index}-`)}</p>
                        </blockquote>
                      );
                    }
                    if (isUnorderedList(paragraph)) {
                      const items = parseListItems(paragraph, false);
                      return (
                        <ul key={index} className={styles.list}>
                          {items.map((item, itemIndex) => (
                            <li key={itemIndex}>{parseLinks(item, `ul-${index}-${itemIndex}-`)}</li>
                          ))}
                        </ul>
                      );
                    }
                    if (isOrderedList(paragraph)) {
                      const items = parseListItems(paragraph, true);
                      return (
                        <ol key={index} className={styles.list}>
                          {items.map((item, itemIndex) => (
                            <li key={itemIndex}>{parseLinks(item, `ol-${index}-${itemIndex}-`)}</li>
                          ))}
                        </ol>
                      );
                    }
                    return <p key={index}>{parseLinks(paragraph, `p-${index}-`)}</p>;
                  })}
                </div>
                <div className={styles.shareButtons}>
                  <ShareButtons 
                    url={`${window.location.origin}/blog#${post.id}`}
                    title={post.title}
                    description={post.title}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

