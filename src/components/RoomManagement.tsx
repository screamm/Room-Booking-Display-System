import React, { useState } from 'react';
import { roomsApi } from '../lib/api';
import type { Room } from '../types/database.types';
import { useToast } from '../contexts/ToastContext';

interface RoomManagementProps {
  rooms: Room[];
  onRoomsChanged: () => void;
}

interface RoomFormData {
  name: string;
  capacity: string;
  features: string;
}

const EMPTY_FORM: RoomFormData = { name: '', capacity: '', features: '' };

const RoomManagement: React.FC<RoomManagementProps> = ({ rooms, onRoomsChanged }) => {
  const { showToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseFeatures = (featuresStr: string): string[] =>
    featuresStr
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Rumsnamn är obligatoriskt');
      return;
    }
    const capacity = parseInt(formData.capacity, 10);
    if (isNaN(capacity) || capacity <= 0) {
      setFormError('Kapacitet måste vara ett positivt heltal');
      return;
    }

    setIsSubmitting(true);
    try {
      await roomsApi.create({
        name: formData.name.trim(),
        capacity,
        features: parseFeatures(formData.features),
      });
      showToast(`Rum "${formData.name.trim()}" har skapats`, 'success');
      setIsAdding(false);
      setFormData(EMPTY_FORM);
      onRoomsChanged();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Kunde inte skapa rummet',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (
      !window.confirm(
        `Är du säker på att du vill ta bort "${room.name}"?\n\nAlla bokningar i rummet kommer också att tas bort. Denna åtgärd kan inte ångras.`
      )
    ) {
      return;
    }

    setDeletingId(room.id);
    try {
      await roomsApi.delete(room.id);
      showToast(`Rum "${room.name}" har tagits bort`, 'success');
      onRoomsChanged();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Kunde inte ta bort rummet',
        'error'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const sortedRooms = [...rooms].sort((a, b) => b.capacity - a.capacity);

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Rumshantering
        </h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setFormData(EMPTY_FORM);
            setFormError('');
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-150 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Nytt rum
        </button>
      </div>

      {/* Rum-lista */}
      <div className="space-y-2">
        {sortedRooms.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4 text-center">
            Inga rum hittades. Lägg till ett rum för att komma igång.
          </p>
        ) : (
          sortedRooms.map(room => (
            <div
              key={room.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="min-w-0">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {room.name}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                  {room.capacity} {room.capacity === 1 ? 'person' : 'personer'}
                </span>
                {room.features && room.features.length > 0 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {room.features.join(' · ')}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(room)}
                disabled={deletingId === room.id}
                className="ml-4 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label={`Ta bort ${room.name}`}
              >
                {deletingId === room.id ? 'Tar bort...' : 'Ta bort'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Nytt rum-formulär */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3"
        >
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Lägg till rum
          </h3>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Rumsnamn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="t.ex. Konferensrum A"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Kapacitet (antal personer) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.capacity}
              onChange={e => setFormData(p => ({ ...p, capacity: e.target.value }))}
              placeholder="t.ex. 10"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
              Funktioner (kommaseparerade, valfritt)
            </label>
            <input
              type="text"
              value={formData.features}
              onChange={e => setFormData(p => ({ ...p, features: e.target.value }))}
              placeholder="t.ex. Whiteboard, Videokonferens, Projektor"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {formError && (
            <p className="text-red-500 dark:text-red-400 text-sm">{formError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Skapar...' : 'Skapa rum'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setFormData(EMPTY_FORM);
                setFormError('');
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default RoomManagement;
