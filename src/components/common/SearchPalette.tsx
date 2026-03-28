import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Building2, Users, CreditCard, Wrench } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'community' | 'owner' | 'charge' | 'incident';
  href: string;
}

interface SearchPaletteProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<SearchResult['type'], string> = {
  community: 'Comunidades',
  owner: 'Propietarios',
  charge: 'Cargos',
  incident: 'Incidencias',
};

const TYPE_ICONS: Record<SearchResult['type'], React.ElementType> = {
  community: Building2,
  owner: Users,
  charge: CreditCard,
  incident: Wrench,
};

export function SearchPalette({ open, onClose }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch {
        // Silently ignore fetch errors
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigate(result.href);
      onClose();
    },
    [navigate, onClose]
  );

  if (!open) return null;

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    const label = TYPE_LABELS[result.type] ?? result.type;
    if (!acc[label]) acc[label] = [];
    acc[label].push(result);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-background rounded-xl shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar comunidades, propietarios, cargos..."
            className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
          />
          {loading && (
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
          )}
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.trim() && results.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No se encontraron resultados para "{query}"
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Escribe para buscar o pulsa{' '}
              <kbd className="px-1.5 py-0.5 rounded text-xs bg-muted border border-border">Esc</kbd>{' '}
              para cerrar
            </div>
          )}

          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                {group}
              </div>
              {items.map((result) => {
                const Icon = TYPE_ICONS[result.type] ?? Search;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">↵</kbd> seleccionar
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border">Esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  );
}
