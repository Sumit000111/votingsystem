import { Hash } from '../ui.jsx';

function ArgValue({ arg }) {
  const { type, value, label } = arg;
  if (Array.isArray(value)) {
    return (
      <span className="arg-list">
        {value.map((v, i) => (
          <code key={i}>{String(v)}</code>
        ))}
      </span>
    );
  }
  if (type === 'bytes32' || type === 'address') {
    return (
      <span className="arg-hash">
        <Hash value={value} head={10} tail={6} />
        {label && <span className="badge">{label}</span>}
      </span>
    );
  }
  if (type === 'bool') return <code>{value ? 'true' : 'false'}</code>;
  return (
    <span>
      <code>{String(value)}</code>
      {label && (
        <span className="badge" style={{ marginLeft: 8 }}>
          {label}
        </span>
      )}
    </span>
  );
}

/** Decoded ABI arguments: name · type · value (+ human label). */
export default function ArgsTable({ args }) {
  if (!args?.length) return <span className="muted">No arguments</span>;
  return (
    <table className="args-table">
      <tbody>
        {args.map((arg) => (
          <tr key={arg.name}>
            <th scope="row">
              {arg.name} <span className="muted">{arg.type}</span>
            </th>
            <td>
              <ArgValue arg={arg} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
