import { useState } from 'react';
import {
  FacebookShareButton,
  TwitterShareButton,
  LinkedinShareButton,
  WhatsappShareButton,
  TelegramShareButton,
  RedditShareButton,
  ViberShareButton,
  EmailShareButton,
  FacebookIcon,
  XIcon,
  LinkedinIcon,
  WhatsappIcon,
  TelegramIcon,
  RedditIcon,
  ViberIcon,
  EmailIcon,
} from 'react-share';
import styles from './ShareButtons.module.css';

interface ShareButtonsProps {
  url?: string;
  title?: string;
  description?: string;
}

export function ShareButtons({
  url = typeof window !== 'undefined' ? window.location.href : '',
  title = 'Sisyfos – Státní dluh ČR',
  description = 'Podívejte se, jak roste státní dluh České republiky v reálném čase. Interaktivní vizualizace od roku 1993.',
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const iconSize = 24;
  const iconBorderRadius = 4;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>Sdílet:</span>
      
      <div className={styles.buttons}>
        <FacebookShareButton url={url} title={title} className={styles.button}>
          <FacebookIcon size={iconSize} borderRadius={iconBorderRadius} />
        </FacebookShareButton>

        <TwitterShareButton url={url} title={title} className={styles.button}>
          <XIcon size={iconSize} borderRadius={iconBorderRadius} />
        </TwitterShareButton>

        <LinkedinShareButton url={url} title={title} summary={description} className={styles.button}>
          <LinkedinIcon size={iconSize} borderRadius={iconBorderRadius} />
        </LinkedinShareButton>

        <WhatsappShareButton url={url} title={title} className={styles.button}>
          <WhatsappIcon size={iconSize} borderRadius={iconBorderRadius} />
        </WhatsappShareButton>

        <TelegramShareButton url={url} title={title} className={styles.button}>
          <TelegramIcon size={iconSize} borderRadius={iconBorderRadius} />
        </TelegramShareButton>

        <ViberShareButton url={url} title={title} className={styles.button}>
          <ViberIcon size={iconSize} borderRadius={iconBorderRadius} />
        </ViberShareButton>

        <RedditShareButton url={url} title={title} className={styles.button}>
          <RedditIcon size={iconSize} borderRadius={iconBorderRadius} />
        </RedditShareButton>

        <EmailShareButton url={url} subject={title} body={`${description}\n\n`} className={styles.button}>
          <EmailIcon size={iconSize} borderRadius={iconBorderRadius} />
        </EmailShareButton>

        <button 
          onClick={handleCopyLink} 
          className={styles.copyButton}
          title={copied ? 'Zkopírováno!' : 'Kopírovat odkaz'}
        >
          {copied ? (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx={iconBorderRadius} fill="#4CAF50"/>
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
            </svg>
          ) : (
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx={iconBorderRadius} fill="#607D8B"/>
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="white"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

