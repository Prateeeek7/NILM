import { Load } from '../../services/api';

interface LoadListProps {
  loads: Load[];
  onEdit: (load: Load) => void;
  onDelete: (id: number) => void;
}

export const LoadList = ({ loads, onEdit, onDelete }: LoadListProps) => {
  if (loads.length === 0) {
    return (
      <div className="bg-light-base rounded-lg shadow-md p-8 text-center">
        <p className="text-neutral-muted">No loads configured. Add your first load to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-light-base rounded-lg shadow-md overflow-hidden">
      <table className="min-w-full divide-y divide-light-border">
        <thead className="bg-light-muted">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-muted uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-muted uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-muted uppercase tracking-wider">
              Power (W)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-muted uppercase tracking-wider">
              Current (A)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-muted uppercase tracking-wider">
              Tolerance
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-neutral-muted uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-light-base divide-y divide-light-border">
          {loads.map((load) => (
            <tr key={load.id} className="hover:bg-light-muted">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-neutral-darker">{load.name}</div>
                {load.description && (
                  <div className="text-sm text-neutral-muted">{load.description}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-light-muted text-neutral-darker">
                  {load.load_type}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-darker">
                {load.expected_power_watts.toFixed(1)} W
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-darker">
                {load.expected_current_amps.toFixed(2)} A
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-muted">
                ±{load.power_tolerance_percent}% / ±{load.current_tolerance_percent}%
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(load)}
                  className="text-neutral-darker hover:text-neutral-muted mr-4 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(load.id)}
                  className="text-neutral-darker hover:text-neutral-muted font-medium"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};




