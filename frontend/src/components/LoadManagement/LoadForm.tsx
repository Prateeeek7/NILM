import { useState, useEffect } from 'react';
import { Load, LoadCreate } from '../../services/api';

interface LoadFormProps {
  load?: Load | null;
  onSubmit: (data: LoadCreate) => Promise<void>;
  onCancel: () => void;
}

export const LoadForm = ({ load, onSubmit, onCancel }: LoadFormProps) => {
  const [formData, setFormData] = useState<LoadCreate>({
    name: '',
    load_type: 'fan',
    expected_power_watts: 0,
    expected_current_amps: 0,
    power_tolerance_percent: 10,
    current_tolerance_percent: 10,
    description: '',
    manufacturer: '',
    model_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (load) {
      setFormData({
        name: load.name,
        load_type: load.load_type,
        expected_power_watts: load.expected_power_watts,
        expected_current_amps: load.expected_current_amps,
        power_tolerance_percent: load.power_tolerance_percent,
        current_tolerance_percent: load.current_tolerance_percent,
        min_power_watts: load.min_power_watts,
        max_power_watts: load.max_power_watts,
        min_current_amps: load.min_current_amps,
        max_current_amps: load.max_current_amps,
        description: load.description || '',
        manufacturer: load.manufacturer || '',
        model_number: load.model_number || '',
        specifications: load.specifications,
      });
    }
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('watts') || name.includes('amps') || name.includes('percent')
        ? parseFloat(value) || 0
        : value,
    }));
  };

  return (
    <div className="bg-light-base rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">{load ? 'Edit Load' : 'Add New Load'}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-darker mb-1">
              Load Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-darker mb-1">
              Load Type *
            </label>
            <select
              name="load_type"
              value={formData.load_type}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
            >
              <option value="fan">Fan</option>
              <option value="motor">Motor</option>
              <option value="bulb">Bulb</option>
              <option value="heater">Heater</option>
              <option value="led">LED</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-darker mb-1">
              Expected Power (Watts) *
            </label>
            <input
              type="number"
              name="expected_power_watts"
              value={formData.expected_power_watts}
              onChange={handleChange}
              required
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-darker mb-1">
              Expected Current (Amps) *
            </label>
            <input
              type="number"
              name="expected_current_amps"
              value={formData.expected_current_amps}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-darker mb-1">
              Power Tolerance (%)
            </label>
            <input
              type="number"
              name="power_tolerance_percent"
              value={formData.power_tolerance_percent}
              onChange={handleChange}
              min="0"
              max="50"
              step="0.1"
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-darker mb-1">
              Current Tolerance (%)
            </label>
            <input
              type="number"
              name="current_tolerance_percent"
              value={formData.current_tolerance_percent}
              onChange={handleChange}
              min="0"
              max="50"
              step="0.1"
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-darker mb-1">
              Manufacturer
            </label>
            <input
              type="text"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-darker mb-1">
              Model Number
            </label>
            <input
              type="text"
              name="model_number"
              value={formData.model_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-darker mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
              className="w-full px-3 py-2 border border-light-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-darker bg-light-surface text-neutral-darker"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-light-border rounded-md text-neutral-darker hover:bg-light-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-neutral-muted text-light-base rounded-md hover:bg-light-muted disabled:opacity-50 transition-colors font-medium"
          >
            {submitting ? 'Saving...' : load ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};




