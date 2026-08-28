import { useState } from 'react';
import { Download } from 'lucide-react';
import { DateInput } from '../../../components/DateInput/DateInput';
import './DateRangeReportCard.css';

interface DateRangeReportCardProps {
  title: string;
  description: string;
  // Left to the caller which report this actually downloads — every
  // date-range-filterable report (Entradas, Saídas, Produtos mais
  // movimentados, Por vendedor, Picos de atividade) shares this exact
  // shell, differing only in which endpoint gets called.
  onDownload: (from: string | undefined, to: string | undefined) => Promise<void>;
}

export function DateRangeReportCard({ title, description, onDownload }: DateRangeReportCardProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await onDownload(from || undefined, to || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar relatório');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="report-card">
      <h3 className="report-card__title">{title}</h3>
      <p className="report-card__description">{description}</p>

      <div className="report-card__date-range">
        <DateInput label="De" value={from} onChange={setFrom} />
        <DateInput label="Até" value={to} onChange={setTo} />
      </div>

      <button type="button" className="report-card__download" onClick={handleDownload} disabled={downloading}>
        <Download size={16} aria-hidden="true" />
        {downloading ? 'Gerando...' : 'Baixar planilha'}
      </button>

      {error && <p className="report-card__error">{error}</p>}
    </div>
  );
}
