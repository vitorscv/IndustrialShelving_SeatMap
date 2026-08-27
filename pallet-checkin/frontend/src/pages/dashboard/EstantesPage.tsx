import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePositionsPolling } from '../../hooks/usePositionsPolling';
import { AddShelfModal } from '../../components/AddShelfModal/AddShelfModal';
import { ShelfInventoryCard } from './components/ShelfInventoryCard';
import './EstantesPage.css';

// Reuses the same polling hook as Visão Geral (GET /shelves) instead of a
// separate fetch — this page only differs in how it RENDERS the shelves
// (inventory summary cards, no position grid), not in how it fetches them.
export function EstantesPage() {
  const { shelves, loading, error, refresh } = usePositionsPolling();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="estantes-page">
      <div className="estantes-page__header">
        <h1 className="estantes-page__title">Estantes</h1>
        <button
          type="button"
          className="estantes-page__add-button"
          onClick={() => setModalOpen(true)}
          title="Adicionar estante"
          aria-label="Adicionar estante"
        >
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="estantes-page__content">
        {loading && <p className="estantes-page__muted">Carregando estantes...</p>}
        {error && <p className="estantes-page__error">Falha ao carregar estantes: {error}</p>}

        {!loading && !error && (
          <div className="estantes-page__grid">
            {shelves.map((shelf) => (
              <ShelfInventoryCard key={shelf.id} shelf={shelf} onRenamed={refresh} />
            ))}
          </div>
        )}
      </div>

      <AddShelfModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={refresh} />
    </div>
  );
}
