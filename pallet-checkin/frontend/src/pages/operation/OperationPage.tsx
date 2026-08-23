import { useState } from 'react';
import { usePositionsPolling } from '../../hooks/usePositionsPolling';
import { createMovement } from '../../services/api';
import type { PositionStatus } from '../../types/position';
import { PositionSelector } from './components/PositionSelector';
import { CheckinForm } from './components/CheckinForm';
import './OperationPage.css';

export function OperationPage() {
  const { shelves, loading, error, refresh } = usePositionsPolling();
  const [statusFilter, setStatusFilter] = useState<PositionStatus>('FREE');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const selectedPosition =
    shelves.flatMap((shelf) => shelf.positions).find((p) => p.id === selectedPositionId) ?? null;

  const movementType = statusFilter === 'FREE' ? 'CHECK_IN' : 'CHECK_OUT';

  async function handleSubmit(input: { palletCode: string; operatorName: string }) {
    if (!selectedPosition) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await createMovement({
        positionId: selectedPosition.id,
        type: movementType,
        palletCode: input.palletCode,
        operatorName: input.operatorName,
      });
      setFeedback({ type: 'success', message: `${movementType === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded.` });
      setSelectedPositionId('');
      refresh();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to record movement',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page operation-page">
      <h1>Pallet check-in / check-out</h1>

      {loading && <p>Loading positions...</p>}
      {error && <p className="operation-page__error">Failed to load positions: {error}</p>}

      {!loading && !error && (
        <>
          <PositionSelector
            shelves={shelves}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selectedPositionId={selectedPositionId}
            onSelectPosition={setSelectedPositionId}
          />

          <CheckinForm
            selectedPosition={selectedPosition}
            movementType={movementType}
            onSubmit={handleSubmit}
            submitting={submitting}
          />

          {feedback && (
            <p
              className={
                feedback.type === 'success' ? 'operation-page__success' : 'operation-page__error'
              }
            >
              {feedback.message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
