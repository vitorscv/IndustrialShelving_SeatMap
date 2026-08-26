import { Construction } from 'lucide-react';
import './ComingSoonPage.css';

interface ComingSoonPageProps {
  title: string;
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="coming-soon-page">
      <div className="coming-soon-page__header">
        <h1 className="coming-soon-page__title">{title}</h1>
      </div>
      <div className="coming-soon-page__body">
        <Construction size={40} className="coming-soon-page__icon" aria-hidden="true" />
        <p className="coming-soon-page__message">Em breve</p>
      </div>
    </div>
  );
}
