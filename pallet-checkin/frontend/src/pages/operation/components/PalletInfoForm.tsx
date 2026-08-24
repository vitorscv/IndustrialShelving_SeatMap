import type { FormEvent } from 'react';
import './PalletInfoForm.css';

interface PalletInfoFormProps {
  orderNumber: string;
  product: string;
  palletCode: string;
  operatorName: string;
  onOrderNumberChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onPalletCodeChange: (value: string) => void;
  onOperatorNameChange: (value: string) => void;
  onAdvance: () => void;
}

export function PalletInfoForm({
  orderNumber,
  product,
  palletCode,
  operatorName,
  onOrderNumberChange,
  onProductChange,
  onPalletCodeChange,
  onOperatorNameChange,
  onAdvance,
}: PalletInfoFormProps) {
  const isValid =
    orderNumber.trim() !== '' &&
    product.trim() !== '' &&
    palletCode.trim() !== '' &&
    operatorName.trim() !== '';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isValid) onAdvance();
  }

  return (
    <form className="pallet-info-form" onSubmit={handleSubmit}>
      <fieldset className="pallet-info-form__fieldset">
        <legend>Dados do palete</legend>

        <label>
          Pedido
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => onOrderNumberChange(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label>
          Produto
          <input
            type="text"
            value={product}
            onChange={(e) => onProductChange(e.target.value)}
            required
          />
        </label>

        <label>
          Código do palete
          <input
            type="text"
            value={palletCode}
            onChange={(e) => onPalletCodeChange(e.target.value)}
            required
          />
        </label>

        <label>
          Nome do operador
          <input
            type="text"
            value={operatorName}
            onChange={(e) => onOperatorNameChange(e.target.value)}
            required
          />
        </label>
      </fieldset>

      <button type="submit" className="pallet-info-form__submit" disabled={!isValid}>
        Avançar
      </button>
    </form>
  );
}
