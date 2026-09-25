import { Link, useOutletContext, useParams } from 'react-router';
import { get } from '../../api/client.js';
import BlockDetail from '../../components/chain/BlockDetail.jsx';
import { ErrorState, Loading } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';

export default function BlockPage() {
  const { id } = useParams();
  const { tick } = useOutletContext();
  const { data, error, loading, reload } = useApi(() => get(`/admin/chain/blocks/${id}`, 'admin'), [id, tick]);

  return (
    <>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/admin/explorer">Chain explorer</Link> / <span>Block #{id}</span>
      </nav>
      <section className="card">
        <div className="card-body">
          {loading && !data ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : <BlockDetail block={data.block} />}
        </div>
      </section>
    </>
  );
}
