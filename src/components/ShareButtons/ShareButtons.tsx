import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
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
  /** CSS selector for the element to capture as screenshot (default: '.app' or 'main') */
  captureSelector?: string;
}

type ScreenshotState = 'idle' | 'capturing' | 'success' | 'error';

export function ShareButtons({
  url = typeof window !== 'undefined' ? window.location.href : '',
  title = 'Sisyfos – Státní dluh ČR',
  description = 'Podívejte se, jak roste státní dluh České republiky v reálném čase. Interaktivní vizualizace od roku 1993.',
  captureSelector = 'main',
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [screenshotState, setScreenshotState] = useState<ScreenshotState>('idle');
  const [canWebShare] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return 'share' in navigator && 'canShare' in navigator;
  });

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

  const captureScreenshot = useCallback(async (): Promise<Blob | null> => {
    const element = document.querySelector(captureSelector);
    if (!element) {
      console.error(`Element not found: ${captureSelector}`);
      return null;
    }

    try {
      // Get the actual background color from CSS variables
      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = computedStyle.getPropertyValue('--color-bg').trim() || '#f8f9fa';
      
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: bgColor,
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 0.95);
      });
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      return null;
    }
  }, [captureSelector]);

  const handleShareScreenshot = async () => {
    if (!canWebShare) return;

    setScreenshotState('capturing');

    try {
      const blob = await captureScreenshot();
      if (!blob) {
        setScreenshotState('error');
        setTimeout(() => setScreenshotState('idle'), 2000);
        return;
      }

      const file = new File([blob], 'sisyfos-statni-dluh.png', { type: 'image/png' });

      // Check if sharing files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text: description,
          files: [file],
        });
        setScreenshotState('success');
      } else {
        // Fallback: share just the URL if file sharing not supported
        await navigator.share({
          title,
          text: description,
          url,
        });
        setScreenshotState('success');
      }
    } catch (err) {
      // User cancelled or error
      if ((err as Error).name !== 'AbortError') {
        console.error('Failed to share:', err);
        setScreenshotState('error');
      } else {
        setScreenshotState('idle');
        return;
      }
    }

    setTimeout(() => setScreenshotState('idle'), 2000);
  };

  const handleDownloadScreenshot = async () => {
    setScreenshotState('capturing');

    try {
      const blob = await captureScreenshot();
      if (!blob) {
        setScreenshotState('error');
        setTimeout(() => setScreenshotState('idle'), 2000);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sisyfos-statni-dluh.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setScreenshotState('success');
    } catch (err) {
      console.error('Failed to download screenshot:', err);
      setScreenshotState('error');
    }

    setTimeout(() => setScreenshotState('idle'), 2000);
  };

  const getScreenshotButtonTitle = () => {
    switch (screenshotState) {
      case 'capturing':
        return 'Vytvářím screenshot...';
      case 'success':
        return 'Hotovo!';
      case 'error':
        return 'Chyba při vytváření screenshotu';
      default:
        return canWebShare ? 'Sdílet screenshot' : 'Stáhnout screenshot';
    }
  };

  const renderScreenshotIcon = () => {
    if (screenshotState === 'capturing') {
      // Loading spinner
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx={iconBorderRadius} fill="#9C27B0"/>
          <circle cx="12" cy="12" r="6" stroke="white" strokeWidth="2" strokeDasharray="20" strokeLinecap="round" className={styles.spinner} />
        </svg>
      );
    }

    if (screenshotState === 'success') {
      // Checkmark
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx={iconBorderRadius} fill="#4CAF50"/>
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
        </svg>
      );
    }

    if (screenshotState === 'error') {
      // Error X
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx={iconBorderRadius} fill="#f44336"/>
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="white"/>
        </svg>
      );
    }

    // Default: Camera/Screenshot icon
    return (
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="24" height="24" rx={iconBorderRadius} fill="#9C27B0"/>
        <path d="M20 4h-3.17L15 2H9L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h4.05l1.83-2h4.24l1.83 2H20v12zM12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z" fill="white"/>
      </svg>
    );
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>Sdílet:</span>
      
      <div className={styles.buttons}>
        {/* Screenshot button - Web Share API or Download */}
        <button 
          onClick={canWebShare ? handleShareScreenshot : handleDownloadScreenshot}
          className={`${styles.screenshotButton} ${screenshotState === 'capturing' ? styles.capturing : ''}`}
          title={getScreenshotButtonTitle()}
          disabled={screenshotState === 'capturing'}
        >
          {renderScreenshotIcon()}
        </button>

        {/* Copy link button */}
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

        <div className={styles.separator} />

        {/* Social share buttons */}
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
      </div>
    </div>
  );
}
