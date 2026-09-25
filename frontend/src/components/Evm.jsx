import PartyBadge from './PartyBadge.jsx';
import { useLang } from '../i18n.jsx';

/** Short EVM-style beep using Web Audio (no asset needed). */
export function beep(duration = 0.7) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1760;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.12, ctx.currentTime + duration - 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch {
    /* audio unavailable */
  }
}

/**
 * Balloting unit modelled on the Indian EVM: serial number, candidate,
 * symbol, a red lamp and a blue button per row.
 */
export default function Evm({ candidates, selected, onPress, disabled, busy }) {
  const { t } = useLang();
  return (
    <div className="evm" role="radiogroup" aria-label={t('ballot_unit')}>
      <div className="evm-head">
        <div className="evm-brand">
          <span className="evm-emblem" aria-hidden="true">
            ☸
          </span>
          <div>
            <strong>{t('ballot_unit')}</strong>
            <small>ECI · Blockchain EVM</small>
          </div>
        </div>
        <div className={`evm-ready ${busy ? 'busy' : ''}`}>
          <span className="evm-ready-lamp" aria-hidden="true" />
          {busy ? t('busy') : t('ready')}
        </div>
      </div>
      <ol className="evm-rows">
        {candidates.map((c, i) => {
          const on = selected?.id === c.id;
          return (
            <li key={c.id} className={`evm-row ${on ? 'on' : ''}`}>
              <span className="evm-serial">{i + 1}</span>
              <span className="evm-name">
                <strong>{c.name}</strong>
                <small>{c.abbreviation}</small>
              </span>
              <span className="evm-symbol">
                <PartyBadge party={c} size={46} />
              </span>
              <span className="evm-lamp" aria-hidden="true" />
              <button
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${c.name} (${c.abbreviation})`}
                className="evm-button"
                disabled={disabled}
                onClick={() => onPress(c)}
              />
            </li>
          );
        })}
      </ol>
      <div className="evm-foot">{t('ballot_hint')}</div>
    </div>
  );
}
