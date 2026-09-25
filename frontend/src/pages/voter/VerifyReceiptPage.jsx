import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { get } from '../../api/client.js';
import { Alert, CopyButton, Spinner } from '../../components/ui.jsx';
import { formatDateTime, formatNumber } from '../../utils/format.js';

export default function VerifyReceiptPage() {
  const { txHash } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(txHash || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!txHash) return;
    setInput(txHash);
    setBusy(true);
    setError(null);
    setResult(null);
    get(`/voting/receipt/${txHash}`)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, [txHash]);

  const submit = (e) => {
    e.preventDefault();
    const hash = input.trim();
    if (hash) navigate(`/verify/${hash}`);
  };

  return (
    <div className="container narrow stack" style={{ gap: 20 }}>
      <div>
        <h1 className="page-title">Verify a ballot receipt</h1>
        <p className="page-sub">
          Paste the transaction hash from your receipt to confirm the ballot was mined into the voting blockchain. Your
          choice is never shown.
        </p>
      </div>
      <form className="card card-body row wrap" onSubmit={submit}>
        <label htmlFor="tx" className="sr-only">
          Transaction hash
        </label>
        <input
          id="tx"
          className="input mono"
          style={{ flex: '1 1 320px' }}
          placeholder="0x…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
        />
        <button type="submit" className="btn btn-navy" disabled={busy}>
          {busy ? <Spinner /> : null} Verify
        </button>
      </form>

      {error && <Alert type="danger">{error}</Alert>}

      {result && (
        <div className="card receipt fresh">
          <div className="receipt-head">
            <div className="receipt-seal" aria-hidden="true">
              ✓
            </div>
            <div>
              <h2>Ballot #{formatNumber(result.ballotNumber)} is on the blockchain</h2>
              <p className="ink-2">
                Included in block #{result.blockNumber} with {formatNumber(result.confirmations)} confirmation
                {result.confirmations === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
          <dl className="kv receipt-body">
            <dt>Transaction</dt>
            <dd className="mono">
              {result.txHash} <CopyButton value={result.txHash} />
            </dd>
            <dt>Block hash</dt>
            <dd className="mono">{result.blockHash}</dd>
            <dt>Mined</dt>
            <dd>{formatDateTime(result.timestamp)}</dd>
            <dt>Contract</dt>
            <dd className="mono">{result.contractAddress}</dd>
            <dt>Status</dt>
            <dd>
              {result.verified ? (
                <span className="badge badge-good">✓ Succeeded</span>
              ) : (
                <span className="badge badge-critical">✕ Reverted</span>
              )}
            </dd>
          </dl>
        </div>
      )}
    </div>
  );
}
