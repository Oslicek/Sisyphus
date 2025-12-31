import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Blog.module.css';

interface BlogPost {
  id: string;
  date: string;
  title: string;
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
                <div className={styles.postContent}>
                  {post.content.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <Link to="/" className={styles.footerLink}>Hlavní stránka</Link>
        <span className={styles.separator}>•</span>
        <Link to="/zdroje-dat" className={styles.footerLink}>Datové řady a zdroje dat</Link>
        <span className={styles.separator}>•</span>
        <Link to="/o-projektu" className={styles.footerLink}>O projektu</Link>
      </footer>
    </div>
  );
}

