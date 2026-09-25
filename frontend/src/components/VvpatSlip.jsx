import { Link } from 'react-router';
import PartyBadge from './PartyBadge.jsx';
import { CopyButton } from './ui.jsx';
import { useLang } from '../i18n.jsx';
import { formatDateTime, shortHash } from '../utils/format.js';

/** VVPAT-style paper slip that slides out of a printer window. */
export default function VvpatSlip({ candidate, candidateName, receipt, animate = true }) {
  const { t } = useLang();
  return (
    <div className="vvpat">
      <div className="vvpat-window">
        <span className="vvpat-label">VVPAT</span>
      </div>
      <div className={`vvpat-slip ${animate ? 'animate' : ''}`}>
        <div className="slip-head">
          <span>{t('slip_title')}</span>
          <span className="slip-no">#{receipt?.blockNumber ?? '—'}</span>
        </div>
        <div className="slip-party">
          {candidate ? <PartyBadge party={candidate} size={56} /> : null}
          <div>
            <strong>{candidate?.name || candidateName || '—'}</strong>
            {candidate?.abbreviation && <span>{candidate.abbreviation}</span>}
          </div>
        </div>
        {receipt?.txHash ? (
          <dl className="slip-meta">
            <dt>TX</dt>
            <dd className="mono">
              {shortHash(receipt.txHash, 10, 8)} <CopyButton value={receipt.txHash} />
            </dd>
            <dt>BLOCK</dt>
            <dd className="mono">
              #{receipt.blockNumber} · {shortHash(receipt.blockHash, 6, 4)}
            </dd>
            <dt>TIME</dt>
            <dd>{formatDateTime(receipt.timestamp || receipt.votedAt)}</dd>
          </dl>
        ) : null}
        <div className="slip-barcode" aria-hidden="true" />
        {receipt?.txHash && (
          <Link to={`/verify/${receipt.txHash}`} className="slip-verify">
            {t('verify_receipt')}
          </Link>
        )}
      </div>
    </div>
  );
}
