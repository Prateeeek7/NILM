import { useState, useEffect } from 'react';
import { loadsApi, Load, LoadCreate } from '../../services/api';
import { LoadForm } from './LoadForm';
import { LoadList } from './LoadList';

export const LoadManagement = () => {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLoad, setEditingLoad] = useState<Load | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLoads = async () => {
    try {
      setLoading(true);
      const data = await loadsApi.getAll();
      setLoads(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load loads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoads();
  }, []);

  const handleCreate = async (loadData: LoadCreate) => {
    try {
      await loadsApi.create(loadData);
      await fetchLoads();
      setShowForm(false);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create load');
      throw err;
    }
  };

  const handleUpdate = async (id: number, loadData: Partial<LoadCreate>) => {
    try {
      await loadsApi.update(id, loadData);
      await fetchLoads();
      setEditingLoad(null);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update load');
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this load?')) return;
    
    try {
      await loadsApi.delete(id);
      await fetchLoads();
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete load');
    }
  };

  const handleEdit = (load: Load) => {
    setEditingLoad(load);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingLoad(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-neutral-muted">Loading loads...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-darker">Load Management</h2>
          <p className="text-neutral-muted mt-1">Manage your electrical loads and their specifications</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-neutral-muted text-light-base rounded-lg hover:bg-light-muted transition-colors font-medium"
          >
            + Add Load
          </button>
        )}
      </div>

      {error && (
        <div className="bg-light-muted border border-light-border text-neutral-darker px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showForm && (
        <LoadForm
          load={editingLoad}
          onSubmit={editingLoad ? (data) => handleUpdate(editingLoad.id, data) : handleCreate}
          onCancel={handleCancel}
        />
      )}

      {!showForm && (
        <LoadList
          loads={loads.filter(l => l.is_active)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};




