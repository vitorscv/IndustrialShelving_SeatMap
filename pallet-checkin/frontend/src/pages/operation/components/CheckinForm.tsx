import { useState } from 'react';
import type { FormEvent } from 'react';
import type { MovementType, Position } from '../../../types/position';
import './CheckinForm.css';

interface CheckinFormProps {
  selectedPosition: Position | null;
  movementType: MovementType;
  onSubmit: (input: { palletCode: string; operatorName: string }) => Promise<void>;
  submitting: boolean;
}

export function CheckinForm({
  selectedPosition,
  movementType,
  onSubmit,
  submitting,
}: CheckinFormProps) {
  const [palletCode, setPalletCode] = useState('');
  const [operatorName, setOperatorName] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedPosition) return;
    await onSubmit({ palletCode, operatorName });
    setPalletCode('');
  }

  const actionLabel = movementType === 'CHECK_IN' ? 'Check in' : 'Check out';

  return (
    <form className="checkin-form" onSubmit={handleSubmit}>
      <label>
        Pallet code
        <input
          type="text"
          value={palletCode}
          onChange={(e) => setPalletCode(e.target.value)}
          disabled={!selectedPosition}
          required
        />
      </label>

      <label>
        Operator name
        <input
          type="text"
          value={operatorName}
          onChange={(e) => setOperatorName(e.target.value)}
          disabled={!selectedPosition}
          required
        />
      </label>

      <button type="submit" disabled={!selectedPosition || submitting}>
        {submitting ? 'Submitting...' : actionLabel}
      </button>
    </form>
  );
}
