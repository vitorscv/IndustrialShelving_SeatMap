import { useState } from 'react';
import { usePositionsPolling } from '../../hooks/usePositionsPolling';
import { createMovement } from '../../services/api';
import type { Position, Shelf } from '../../types/position';
import { ShelfPicker } from './components/ShelfPicker';
import { LevelPicker } from './components/LevelPicker';
import { PositionGrid } from './components/PositionGrid';
import { CheckinForm } from './components/CheckinForm';
import './OperationPage.css';

export function OperationPage() {
  const { shelves, loading, error, refresh } = usePositionsPolling();

  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  // Persists across resets — the same operator likely does several pallets in a row.
  const [operatorName, setOperatorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedShelf = shelves.find((shelf) => shelf.id === selectedShelfId) ?? null;

  const levels = selectedShelf
    ? Array.from(new Set(selectedShelf.positions.map((p) => p.level))).sort((a, b) =>
        b.localeCompare(a),
      )
    : [];

  const positionsForLevel =
    selectedShelf && selectedLevel
      ? selectedShelf.positions
          .filter((p) => p.level === selectedLevel)
          .sort((a, b) => a.number - b.number)
      : [];

  // Re-derived from the live polled shelves on every render, never a frozen
  // snapshot — so the action panel always matches the position's real status.
  const selectedPosition: Position | null = selectedPositionId
    ? (shelves.flatMap((shelf) => shelf.positions).find((p) => p.id === selectedPositionId) ??
      null)
    : null;

  function resetToShelfStep() {
    setSelectedShelfId(null);
    setSelectedLevel(null);
    setSelectedPositionId(null);
  }

  function handleSelectShelf(shelf: Shelf) {
    setSuccessMessage(null);
    setSelectedShelfId(shelf.id);
    setSelectedLevel(null);
    setSelectedPositionId(null);
  }

  function handleSelectLevel(level: string) {
    setSuccessMessage(null);
    setSelectedLevel(level);
    setSelectedPositionId(null);
  }

  function handleSelectPosition(position: Position) {
    setSuccessMessage(null);
    setSelectedPositionId(position.id);
  }

  async function handleSubmit(input: {
    palletCode: string;
    orderNumber?: string;
    product?: string;
    operatorName: string;
  }) {
    if (!selectedPosition || !selectedShelf) return;
    const movementType = selectedPosition.status === 'OCCUPIED' ? 'CHECK_OUT' : 'CHECK_IN';
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      await createMovement({
        positionId: selectedPosition.id,
        type: movementType,
        palletCode: input.palletCode,
        orderNumber: input.orderNumber,
        product: input.product,
        operatorName: input.operatorName,
      });
      const actionLabel = movementType === 'CHECK_IN' ? 'Check-in' : 'Check-out';
      setSuccessMessage(
        `${actionLabel} registrado em ${selectedShelf.title} - ${selectedPosition.level} - ${selectedPosition.number}`,
      );
      resetToShelfStep();
      refresh();
    } catch (err) {
      // A 409 means our data was stale — refresh right away so the grid
      // shows the real color instead of the one that caused the conflict.
      refresh();
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page operation-page">
      <h1>Check-in / check-out de paletes</h1>

      {loading && <p>Carregando posições...</p>}
      {error && <p className="operation-page__error">Falha ao carregar posições: {error}</p>}

      {!loading && !error && (
        <>
          <nav className="operation-page__breadcrumb" aria-label="Progresso da seleção">
            <button
              type="button"
              className="operation-page__crumb"
              onClick={resetToShelfStep}
            >
              {selectedShelf ? selectedShelf.title : 'Escolha a estante'}
            </button>

            {selectedShelf && (
              <>
                <span className="operation-page__crumb-sep">›</span>
                <button
                  type="button"
                  className="operation-page__crumb"
                  onClick={() => {
                    setSelectedLevel(null);
                    setSelectedPositionId(null);
                  }}
                >
                  {selectedLevel ?? 'Escolha o nível'}
                </button>
              </>
            )}

            {selectedLevel && (
              <>
                <span className="operation-page__crumb-sep">›</span>
                <span className="operation-page__crumb operation-page__crumb--current">
                  {selectedPosition ? `Posição ${selectedPosition.number}` : 'Escolha a posição'}
                </span>
              </>
            )}
          </nav>

          {successMessage && <p className="operation-page__success">{successMessage}</p>}

          {!selectedShelf && (
            <ShelfPicker
              shelves={shelves}
              selectedShelfId={selectedShelfId}
              onSelect={handleSelectShelf}
            />
          )}

          {selectedShelf && !selectedLevel && (
            <LevelPicker levels={levels} selectedLevel={selectedLevel} onSelect={handleSelectLevel} />
          )}

          {selectedShelf && selectedLevel && (
            <PositionGrid
              positions={positionsForLevel}
              selectedPositionId={selectedPositionId}
              onSelect={handleSelectPosition}
            />
          )}

          {selectedShelf && selectedPosition && (
            <CheckinForm
              key={selectedPosition.id}
              position={selectedPosition}
              shelfTitle={selectedShelf.title}
              operatorName={operatorName}
              onOperatorNameChange={setOperatorName}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          )}
        </>
      )}
    </div>
  );
}
