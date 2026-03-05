import { useState, useEffect, useRef } from 'react';
import { MapPin, CheckCircle2, Loader2, Search, Navigation, Home } from 'lucide-react';
import { geoServices, type GeocodeResult } from '../api/geoServices';
import { useDebounce } from '../hooks/useDebounce';
import { useToastStore } from '../store/useToastStore';
import { useAuthStore } from '../store/useAuthStore';
import clsx from 'clsx';

interface AddressAutocompleteProps {
  placeholder: string;
  onSelect: (result: GeocodeResult | null) => void;
  icon?: React.ReactNode;
  allowCurrentLocation?: boolean;
  initialValue?: string;
}

export function AddressAutocomplete({ placeholder, onSelect, icon, allowCurrentLocation, initialValue }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue || '');
  
  useEffect(() => {
    if (initialValue) {
      setQuery(initialValue);
    }
  }, [initialValue]);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const addToast = useToastStore((state) => state.addToast);
  const { currentUser } = useAuthStore();
  
  const debouncedQuery = useDebounce(query, 500);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || selected) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    // Check for "home" or "maison" shortcut
    const lowerQuery = debouncedQuery.toLowerCase().trim();
    if ((lowerQuery === 'home' || lowerQuery === 'maison') && currentUser?.homeLocation) {
      if (isMounted) {
        setResults([currentUser.homeLocation]);
        setShowDropdown(true);
        setIsSearching(false);
      }
      return;
    }

    geoServices.searchAddress(debouncedQuery)
      .then(data => {
        if (isMounted) {
          setResults(data);
          setShowDropdown(true);
        }
      })
      .catch(err => console.error("Geocoding error:", err))
      .finally(() => {
        if (isMounted) setIsSearching(false);
      });

    return () => { isMounted = false; };
  }, [debouncedQuery, selected, currentUser?.homeLocation]);

  const handleSelect = (result: GeocodeResult) => {
    // Format the display name to be shorter
    const shortName = result.display_name.split(',').slice(0, 2).join(',');
    setQuery(shortName);
    setSelected(result);
    setResults([]);
    setShowDropdown(false);
    onSelect(result);
  };

  const clearSelection = () => {
    setQuery('');
    setSelected(null);
    onSelect(null);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      addToast({ title: 'Erreur', message: 'La géolocalisation n\'est pas supportée par votre navigateur.', type: 'error' });
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await geoServices.reverseGeocode(position.coords.latitude, position.coords.longitude);
          handleSelect(result);
        } catch (error) {
          addToast({ title: 'Erreur', message: 'Impossible de trouver votre position.', type: 'error' });
        } finally {
          setIsSearching(false);
        }
      },
      (error) => {
        setIsSearching(false);
        addToast({ title: 'Erreur', message: 'Veuillez autoriser l\'accès à votre position.', type: 'error' });
      }
    );
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className={clsx(
        "flex items-center gap-3 bg-surface border rounded-2xl px-4 py-3 transition-all",
        selected ? "border-success/50 bg-success/5" : "border-white/10 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
      )}>
        <div className="text-white/50 shrink-0">
          {icon || <MapPin className="w-5 h-5" />}
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selected) {
              setSelected(null);
              onSelect(null);
            }
          }}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white placeholder:text-white/30 focus:outline-none truncate"
        />

        <div className="shrink-0 flex items-center justify-center gap-2">
          {isSearching && !selected && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          {selected && <CheckCircle2 className="w-5 h-5 text-success" />}
          
          {!isSearching && !selected && query.length > 0 && (
            <button onClick={clearSelection} className="text-white/30 hover:text-white/70 w-6 h-6 flex items-center justify-center">
              <Search className="w-4 h-4" />
            </button>
          )}

          {!isSearching && !selected && query.length === 0 && allowCurrentLocation && (
            <button 
              onClick={handleLocateMe} 
              className="text-primary hover:text-primary/80 w-6 h-6 flex items-center justify-center"
              title="Ma position actuelle"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
          {results.map((result) => {
            const isHome = currentUser?.homeLocation?.place_id === result.place_id;
            return (
              <button
                key={result.place_id}
                onClick={() => handleSelect(result)}
                className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex items-center gap-3 last:border-0"
              >
                <div className={clsx("shrink-0", isHome ? "text-primary" : "text-white/30")}>
                  {isHome ? <Home className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-bold text-white truncate">
                    {isHome ? "Maison" : result.display_name.split(',')[0]}
                  </span>
                  <span className="text-xs text-white/40 truncate">
                    {result.display_name.split(',').slice(isHome ? 0 : 1).join(',')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
