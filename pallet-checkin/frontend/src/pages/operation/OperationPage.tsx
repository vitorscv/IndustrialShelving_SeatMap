import { useState } from 'react';
import { usePositionsPolling } from '../../hooks/usePositionsPolling';
import { createMovement } from '../../services/api';
import type { MovementType, Position, Shelf } from '../../types/position';
import { AppHeader } from '../../components/AppHeader/AppHeader';
import { IntentPicker } from './components/IntentPicker';
import { PalletInfoForm } from './components/PalletInfoForm';
import { CheckinSummary } from './components/CheckinSummary';
import { ShelfPicker } from './components/ShelfPicker';
import { LevelPicker } from './components/LevelPicker';
import { PositionGrid } from './components/PositionGrid';
import { CheckinForm } from './components/CheckinForm';
import './OperationPage.css';

type CheckinStep = 'info' | 'position';

export function OperationPage() {
  const { shelves, loading, error, refresh } = usePositionsPolling();

  const [intent, setIntent] = useState<MovementType | null>(null);
  const [checkinStep, setCheckinStep] = useState<CheckinStep>('info');

  // Check-in "Dados do palete" fields — lifted up here (rather than local
  // to a form component) so they survive navigating from Step 2 back to
  // Step 1 to edit them.
  const [orderNumber, setOrderNumber] = useState('');
  const [product, setProduct] = useState('');
  const [palletCode, setPalletCode] = useState('');
  // Persists across resets — the same operator likely does several pallets
  // in a row, regardless of which path (check-in/check-out) they're doing.
  const [operatorName, setOperatorName] = useState('');

  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);

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
  // snapshot — so the panel always matches the position's real status.
  const selectedPosition: Position | null = selectedPositionId
    ? (shelves.flatMap((shelf) => shelf.positions).find((p) => p.id === selectedPositionId) ??
      null)
    : null;

  function resetShelfSelection() {
    setSelectedShelfId(null);
    setSelectedLevel(null);
    setSelectedPositionId(null);
  }

  // The ultimate home step for both paths — intent could be either type
  // next, so a completed flow (or an explicit "change operation") always
  // lands back here.
  function resetToIntentStep() {
    setIntent(null);
    setCheckinStep('info');
    setOrderNumber('');
    setProduct('');
    setPalletCode('');
    resetShelfSelection();
  }

  function handleSelectIntent(newIntent: MovementType) {
    setSuccessMessage(null);
    setIntent(newIntent);
    setCheckinStep('info');
    setOrderNumber('');
    setProduct('');
    setPalletCode('');
    resetShelfSelection();
  }

  function handleAdvanceToPositionStep() {
    setCheckinStep('position');
  }

  function handleBackToInfoStep() {
    // Shelf/level/position selection is intentionally kept — if they didn't
    // change anything worth re-picking, advancing again lands them right
    // back where they were.
    setCheckinStep('info');
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

  async function handleConfirmCheckIn() {
    if (!selectedPosition || !selectedShelf) return;
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      await createMovement({
        positionId: selectedPosition.id,
        type: 'CHECK_IN',
        palletCode,
        orderNumber,
        product,
        operatorName,
      });
      setSuccessMessage(
        `Check-in registrado em ${selectedShelf.title} - ${selectedPosition.level} - ${selectedPosition.number}`,
      );
      resetToIntentStep();
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

  async function handleConfirmCheckOut(input: { palletCode: string; operatorName: string }) {
    if (!selectedPosition || !selectedShelf) return;
    setSubmitting(true);
    setSuccessMessage(null);
    try {
      await createMovement({
        positionId: selectedPosition.id,
        type: 'CHECK_OUT',
        palletCode: input.palletCode,
        operatorName: input.operatorName,
      });
      setSuccessMessage(
        `Check-out registrado em ${selectedShelf.title} - ${selectedPosition.level} - ${selectedPosition.number}`,
      );
      resetToIntentStep();
      refresh();
    } catch (err) {
      refresh();
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="operation-page">
      <AppHeader subtitle="Check-in / check-out de paletes" />

      <div className="operation-page__content">
        {loading && <p className="operation-page__muted">Carregando posições...</p>}
        {error && <p className="operation-page__error">Falha ao carregar posições: {error}</p>}

        {!loading && !error && (
          <>
            {intent && (
              <button
                type="button"
                className="operation-page__change-intent"
                onClick={resetToIntentStep}
              >
                ‹ Trocar operação
              </button>
            )}

            {successMessage && <p className="operation-page__success">{successMessage}</p>}

            {!intent && (
              <section className="operation-page__section">
                <span className="operation-page__section-label">O que você quer fazer?</span>
                <IntentPicker onSelect={handleSelectIntent} />
              </section>
            )}

            {intent === 'CHECK_IN' && checkinStep === 'info' && (
              <section className="operation-page__section">
                <span className="operation-page__section-label">Dados do palete</span>
                <PalletInfoForm
                  orderNumber={orderNumber}
                  product={product}
                  palletCode={palletCode}
                  operatorName={operatorName}
                  onOrderNumberChange={setOrderNumber}
                  onProductChange={setProduct}
                  onPalletCodeChange={setPalletCode}
                  onOperatorNameChange={setOperatorName}
                  onAdvance={handleAdvanceToPositionStep}
                />
              </section>
            )}

            {intent === 'CHECK_IN' && checkinStep === 'position' && (
              <>
                <nav className="operation-page__breadcrumb" aria-label="Progresso da seleção">
                  <button
                    type="button"
                    className="operation-page__crumb"
                    onClick={handleBackToInfoStep}
                  >
                    Dados do palete
                  </button>
                  <span className="operation-page__crumb-sep">›</span>
                  <button
                    type="button"
                    className="operation-page__crumb"
                    onClick={resetShelfSelection}
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
                        {selectedPosition
                          ? `Posição ${selectedPosition.number}`
                          : 'Escolha a posição'}
                      </span>
                    </>
                  )}
                </nav>

                {!selectedShelf && (
                  <section className="operation-page__section">
                    <span className="operation-page__section-label">Escolha a estante</span>
                    <ShelfPicker
                      shelves={shelves}
                      selectedShelfId={selectedShelfId}
                      onSelect={handleSelectShelf}
                    />
                  </section>
                )}

                {selectedShelf && !selectedLevel && (
                  <section className="operation-page__section">
                    <span className="operation-page__section-label">Escolha o nível</span>
                    <LevelPicker
                      levels={levels}
                      selectedLevel={selectedLevel}
                      onSelect={handleSelectLevel}
                    />
                  </section>
                )}

                {selectedShelf && selectedLevel && (
                  <section className="operation-page__section">
                    <span className="operation-page__section-label">Escolha a posição</span>
                    <PositionGrid
                      positions={positionsForLevel}
                      selectedPositionId={selectedPositionId}
                      onSelect={handleSelectPosition}
                      tappableStatus="FREE"
                    />
                  </section>
                )}

                {selectedShelf && selectedPosition && (
                  <CheckinSummary
                    key={selectedPosition.id}
                    shelfTitle={selectedShelf.title}
                    position={selectedPosition}
                    orderNumber={orderNumber}
                    product={product}
                    palletCode={palletCode}
                    operatorName={operatorName}
                    onConfirm={handleConfirmCheckIn}
                    submitting={submitting}
                  />
                )}
              </>
            )}

            {intent === 'CHECK_OUT' && (
              <>
                <nav className="operation-page__breadcrumb" aria-label="Progresso da seleção">
                  <button
                    type="button"
                    className="operation-page__crumb"
                    onClick={resetShelfSelection}
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
                        {selectedPosition
                          ? `Posição ${selectedPosition.number}`
                          : 'Escolha a posição'}
                      </span>
                    </>
                  )}
                </nav>

                {!selectedShelf && (
                  <section className="operation-page__section">
                    <span className="operation-page__section-label">Escolha a estante</span>
                    <ShelfPicker
                      shelves={shelves}
                      selectedShelfId={selectedShelfId}
                      onSelect={handleSelectShelf}
                    />
                  </section>
                )}

                {selectedShelf && !selectedLevel && (
                  <section className="operation-page__section">
                    <span className="operation-page__section-label">Escolha o nível</span>
                    <LevelPicker
                      levels={levels}
                      selectedLevel={selectedLevel}
                      onSelect={handleSelectLevel}
                    />
                  </section>
                )}

                {selectedShelf && selectedLevel && (
                  <section className="operation-page__section">
                    <span className="operation-page__section-label">Escolha a posição</span>
                    <PositionGrid
                      positions={positionsForLevel}
                      selectedPositionId={selectedPositionId}
                      onSelect={handleSelectPosition}
                      tappableStatus="OCCUPIED"
                    />
                  </section>
                )}

                {selectedShelf && selectedPosition && (
                  <CheckinForm
                    key={selectedPosition.id}
                    position={selectedPosition}
                    shelfTitle={selectedShelf.title}
                    operatorName={operatorName}
                    onOperatorNameChange={setOperatorName}
                    onSubmit={handleConfirmCheckOut}
                    submitting={submitting}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
