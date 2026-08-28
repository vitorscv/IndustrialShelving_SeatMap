import { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadStalePositionsReport } from '../../../services/api';
import { useAuth } from '../../../services/auth';
import './DateRangeReportCard.css';

const DEFAULT_MIN_DAYS = 30;

export function StalePositionsReportCard() {
  const { token } = useAuth();
  const [minDays, setMinDays] = useState(String(DEFAULT_MIN_DAYS));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDaysNumber = Number(minDays);
  const isValid = minDays.trim() !== '' && Number.isInteger(minDaysNumber) && minDaysNumber > 0;

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await downloadStalePositionsReport(minDaysNumber, token!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar relatório');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="report-card">
      <h3 className="report-card__title">Posições paradas</h3>
      <p className="report-card__description">
        Posições atualmente ocupadas cujo check-in mais recente já passou do número de dias
        informado — útil para achar paletes esquecidos.
      </p>

      <label className="report-card__number-field">
        Dias mínimos
        <input
          type="number"
          min="1"
          step="1"
          value={minDays}
          onChange={(e) => setMinDays(e.target.value)}
        />
      </label>

      <button
        type="button"
        className="report-card__download"
        onClick={handleDownload}
        disabled={downloading || !isValid}
      >
        <Download size={16} aria-hidden="true" />
        {downloading ? 'Gerando...' : 'Baixar planilha'}
      </button>

      {error && <p className="report-card__error">{error}</p>}
    </div>
  );
}
