import { useState, FormEvent } from 'react';

interface Props {
  onSearch: (query: string) => void;
  onReset: () => void;
  locationName: string;
  isLoading: boolean;
  hasLocation: boolean;
}

export default function LocationSearch({
  onSearch,
  onReset,
  locationName,
  isLoading,
  hasLocation,
}: Props) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="location-search">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city, address, or coordinates…"
          className="search-input"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <span className="spinner-inline" />
          ) : (
            'Go'
          )}
        </button>
        {hasLocation && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReset}
            title="Reset"
          >
            ↺
          </button>
        )}
      </form>
      {locationName && (
        <div className="location-name" title={locationName}>
          {locationName.split(',').slice(0, 3).join(',')}
        </div>
      )}
      {!hasLocation && (
        <p className="search-hint">
          Type a location or click on the map
        </p>
      )}
    </div>
  );
}
