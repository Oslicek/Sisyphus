import { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useDebtCounter } from '../../hooks/useDebtCounter';
import { formatCzechNumber } from '../../utils/formatters';
import styles from './BuyCalculator.module.css';

// 2025 demographic data
const POPULATION_2025 = 10900000;
const WORKING_AGE_2025 = 6830000;

type WizardStep = 'closed' | 'step1' | 'step2' | 'result';

export function BuyCalculator() {
  const { currentDebt } = useDebtCounter();
  const [step, setStep] = useState<WizardStep>('closed');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [isWorkingAge, setIsWorkingAge] = useState<boolean | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const debtPerCapita = currentDebt / POPULATION_2025;
  const debtPerWorking = currentDebt / WORKING_AGE_2025;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenWizard = () => {
    setStep('step1');
    setItemName('');
    setItemPrice('');
    setItemImage(null);
    setIsWorkingAge(null);
  };

  const handleCloseWizard = () => {
    setStep('closed');
  };

  const handleStep1Next = () => {
    if (itemName.trim() && itemPrice.trim()) {
      setStep('step2');
    }
  };

  const handleStep2Select = (working: boolean) => {
    setIsWorkingAge(working);
    setStep('result');
  };

  const handleBack = () => {
    if (step === 'step2') setStep('step1');
    if (step === 'result') setStep('step2');
  };

  const calculateItems = useCallback(() => {
    const price = parseFloat(itemPrice.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(price) || price <= 0) return 0;
    
    const myDebtShare = isWorkingAge ? debtPerWorking : debtPerCapita;
    return Math.floor(myDebtShare / price);
  }, [itemPrice, isWorkingAge, debtPerCapita, debtPerWorking]);

  const handleShare = async () => {
    if (!resultRef.current) return;
    
    setIsSharing(true);
    
    try {
      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = computedStyle.getPropertyValue('--color-bg').trim() || '#f8f9fa';
      
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: bgColor,
        scale: 2,
        logging: false,
        useCORS: true,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharing(false);
          return;
        }

        const file = new File([blob], 'muj-podil-na-dluhu.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Můj podíl na státním dluhu',
              text: `Za svůj podíl na státním dluhu bych si mohl(a) koupit ${formatCzechNumber(calculateItems())} kusů: ${itemName}`,
              files: [file],
            });
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              // Fallback: download
              downloadImage(canvas);
            }
          }
        } else {
          // Fallback: download
          downloadImage(canvas);
        }
        
        setIsSharing(false);
      }, 'image/png', 0.95);
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      setIsSharing(false);
    }
  };

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = 'muj-podil-na-dluhu.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const itemCount = calculateItems();
  const myDebtShare = isWorkingAge ? debtPerWorking : debtPerCapita;

  return (
    <>
      {/* Main button */}
      <button className={styles.openButton} onClick={handleOpenWizard}>
        Za svůj podíl na státním dluhu si chci koupit...
      </button>

      {/* Modal overlay */}
      {step !== 'closed' && (
        <div className={styles.overlay} onClick={handleCloseWizard}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={handleCloseWizard}>
              ✕
            </button>

            {/* Step 1: Item details */}
            {step === 'step1' && (
              <div className={styles.stepContent}>
                <h2 className={styles.stepTitle}>Co si chcete koupit?</h2>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Chci si koupit:</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="např. iPhone, auto, dům..."
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Stojí to:</label>
                  <div className={styles.priceInput}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="např. 35000"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                    />
                    <span className={styles.currency}>Kč</span>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Mám obrázek (nepovinné):</label>
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handleImageUpload}
                  />
                  {itemImage && (
                    <div className={styles.imagePreview}>
                      <img src={itemImage} alt="Náhled" />
                      <button 
                        className={styles.removeImage}
                        onClick={() => setItemImage(null)}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <button
                  className={styles.nextButton}
                  onClick={handleStep1Next}
                  disabled={!itemName.trim() || !itemPrice.trim()}
                >
                  Pokračovat
                </button>
              </div>
            )}

            {/* Step 2: Age selection */}
            {step === 'step2' && (
              <div className={styles.stepContent}>
                <h2 className={styles.stepTitle}>Jste v produktivním věku?</h2>
                <p className={styles.stepSubtitle}>
                  Produktivní věk je 15–64 let. Na tuto skupinu připadá větší podíl dluhu.
                </p>

                <div className={styles.ageButtons}>
                  <button
                    className={styles.ageButton}
                    onClick={() => handleStep2Select(true)}
                  >
                    <span className={styles.ageIcon}>👷</span>
                    <span className={styles.ageLabel}>Ano, jsem</span>
                    <span className={styles.ageDebt}>
                      {formatCzechNumber(Math.round(debtPerWorking))} Kč
                    </span>
                  </button>

                  <button
                    className={styles.ageButton}
                    onClick={() => handleStep2Select(false)}
                  >
                    <span className={styles.ageIcon}>👶👴</span>
                    <span className={styles.ageLabel}>Ne, nejsem</span>
                    <span className={styles.ageDebt}>
                      {formatCzechNumber(Math.round(debtPerCapita))} Kč
                    </span>
                  </button>
                </div>

                <button className={styles.backButton} onClick={handleBack}>
                  ← Zpět
                </button>
              </div>
            )}

            {/* Result */}
            {step === 'result' && (
              <div className={styles.stepContent}>
                <div ref={resultRef} className={styles.resultCard}>
                  <h2 className={styles.resultTitle}>Váš podíl na státním dluhu</h2>
                  
                  <p className={styles.resultDebt}>
                    {formatCzechNumber(Math.round(myDebtShare))} Kč
                  </p>

                  <p className={styles.resultText}>
                    Za tuto částku byste si mohl(a) koupit
                  </p>

                  <div className={styles.resultCount}>
                    <span className={styles.resultNumber}>{formatCzechNumber(itemCount)}×</span>
                    {itemImage && (
                      <img src={itemImage} alt={itemName} className={styles.resultImage} />
                    )}
                  </div>

                  <p className={styles.resultItem}>{itemName}</p>
                  
                  <p className={styles.resultPrice}>
                    (á {formatCzechNumber(parseFloat(itemPrice.replace(/\s/g, '').replace(',', '.')) || 0)} Kč)
                  </p>

                  <p className={styles.resultFooter}>
                    sisyphus-9u4.pages.dev
                  </p>
                </div>

                <button
                  className={styles.shareButton}
                  onClick={handleShare}
                  disabled={isSharing}
                >
                  {isSharing ? 'Vytvářím screenshot...' : '📤 Sdílet výsledek'}
                </button>

                <button className={styles.backButton} onClick={handleBack}>
                  ← Zpět
                </button>

                <button className={styles.newButton} onClick={handleOpenWizard}>
                  Zkusit jinou věc
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

