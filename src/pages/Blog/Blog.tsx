import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../../components/Footer';
import { ShareButtons } from '../../components/ShareButtons';
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
  const parseContent = (text: string) => {
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
          key={match.index} 
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

    return parts.length > 0 ? parts : text;
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
                  {post.content.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{parseContent(paragraph)}</p>
                  ))}
                </div>
                <div className={styles.shareButtons}>
                  <ShareButtons 
                    shareUrl={`${window.location.origin}/blog#${post.id}`}
                    shareTitle={post.title}
                    shareText={post.title}
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

