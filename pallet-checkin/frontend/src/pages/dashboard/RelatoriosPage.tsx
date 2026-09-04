import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  downloadActivityPeaksReport,
  downloadBySalespersonReport,
  downloadMovementsReport,
  downloadOccupancySnapshot,
  downloadTopProductsReport,
} from '../../services/api';
import { useAuth } from '../../services/auth';
import { DateRangeReportCard } from './components/DateRangeReportCard';
import { StalePositionsReportCard } from './components/StalePositionsReportCard';
import { ResumoAtualCard } from './components/ResumoAtualCard';
import './RelatoriosPage.css';

function SnapshotReportCard() {
  const { token } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      await downloadOccupancySnapshot(token!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar relatório');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="report-card">
      <h3 className="report-card__title">Snapshot de ocupação atual</h3>
      <p className="report-card__description">
        Uma aba por estante, listando todas as posições e seu status no exato momento da exportação —
        não é um histórico, é uma fotografia do agora.
      </p>

      <button type="button" className="report-card__download" onClick={handleDownload} disabled={downloading}>
        <Download size={16} aria-hidden="true" />
        {downloading ? 'Gerando...' : 'Baixar planilha'}
      </button>

      {error && <p className="report-card__error">{error}</p>}
    </div>
  );
}

export function RelatoriosPage() {
  const { token } = useAuth();

  return (
    <div className="relatorios-page">
      <div className="relatorios-page__header">
        <h1 className="relatorios-page__title">Relatórios</h1>
      </div>

      <div className="relatorios-page__content">
        <ResumoAtualCard />

        {/* Grouped into logical categories (not one flat 7-card grid) so a
            group that doesn't divide evenly by the column count (Estoque,
            Análise: 2 cards each) reads as "this section has 2 reports",
            not as a stray orphan card floating alone in an otherwise-empty
            row — which is what a flat grid did with Picos de movimentação
            before this reorganization. */}
        <section className="relatorios-page__section">
          <h2 className="relatorios-page__section-title">Movimentação</h2>
          <div className="relatorios-page__grid">
            <DateRangeReportCard
              title="Relatório de Entradas"
              description="Todo check-in registrado no período selecionado (ou todo o histórico, se as datas ficarem em branco): posição, pedido/cliente, produto, quantidade e vendedor/cidade."
              onDownload={(from, to) => downloadMovementsReport('CHECK_IN', from, to, token!)}
            />
            <DateRangeReportCard
              title="Relatório de Saídas"
              description="Todo check-out registrado no período selecionado (ou todo o histórico, se as datas ficarem em branco), com os mesmos detalhes do relatório de entradas."
              onDownload={(from, to) => downloadMovementsReport('CHECK_OUT', from, to, token!)}
            />
            <DateRangeReportCard
              title="Picos de movimentação"
              description="Quantidade de movimentações (entradas e saídas) agrupada por dia da semana e por hora do dia, para identificar os horários de maior atividade."
              onDownload={(from, to) => downloadActivityPeaksReport(from, to, token!)}
            />
          </div>
        </section>

        <section className="relatorios-page__section">
          <h2 className="relatorios-page__section-title">Estoque</h2>
          <div className="relatorios-page__grid">
            <SnapshotReportCard />
            <StalePositionsReportCard />
          </div>
        </section>

        <section className="relatorios-page__section">
          <h2 className="relatorios-page__section-title">Análise</h2>
          <div className="relatorios-page__grid">
            <DateRangeReportCard
              title="Produtos mais movimentados"
              description="Ranking de produtos por quantidade total, considerando apenas check-ins (entradas) para não contar a mesma quantidade duas vezes quando o palete sai depois."
              onDownload={(from, to) => downloadTopProductsReport(from, to, token!)}
            />
            <DateRangeReportCard
              title="Por vendedor/cidade"
              description="Total de movimentações e quantidade por vendedor/cidade, também baseado apenas em check-ins pelo mesmo motivo do relatório de produtos."
              onDownload={(from, to) => downloadBySalespersonReport(from, to, token!)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
