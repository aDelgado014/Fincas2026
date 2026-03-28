import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'acta' | 'cargo' | 'incidencia';
  description?: string;
}

const EVENT_COLORS: Record<CalendarEvent['type'], string> = {
  acta: 'bg-blue-500',
  cargo: 'bg-orange-500',
  incidencia: 'bg-red-500',
};

const EVENT_LABELS: Record<CalendarEvent['type'], string> = {
  acta: 'Acta',
  cargo: 'Vencimiento',
  incidencia: 'Incidencia',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert Sunday=0 to Monday=0 offset
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Fill to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface Community {
  id: string;
  name: string;
}

interface NewEventForm {
  title: string;
  date: string;
  type: 'acta' | 'cargo' | 'incidencia';
  communityId: string;
  description: string;
}

export function Calendario() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventForm>({
    title: '',
    date: toDateStr(today.getFullYear(), today.getMonth(), today.getDate()),
    type: 'acta',
    communityId: '',
    description: '',
  });
  const [communities, setCommunities] = useState<Community[]>([]);
  const [savingEvent, setSavingEvent] = useState(false);

  const fetchMonthEvents = async (year: number, month: number) => {
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/calendar/events?from=${from}&to=${to}`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.events || json || []);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthEvents(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  useEffect(() => {
    apiFetch('/api/communities')
      .then((res) => res.json())
      .then((data) => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const openNewEventModal = () => {
    const defaultDate = selectedDay
      ? toDateStr(viewYear, viewMonth, selectedDay)
      : toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    setNewEvent({ title: '', date: defaultDate, type: 'acta', communityId: '', description: '' });
    setShowNewEventModal(true);
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      toast.error('El título y la fecha son obligatorios');
      return;
    }
    setSavingEvent(true);
    try {
      const res = await apiFetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent),
      });
      if (!res.ok) throw new Error('Error al crear evento');
      toast.success('Evento creado correctamente');
      setShowNewEventModal(false);
      fetchMonthEvents(viewYear, viewMonth);
    } catch (error) {
      toast.error('Error al crear el evento');
    } finally {
      setSavingEvent(false);
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const cells = getCalendarDays(viewYear, viewMonth);

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  events.forEach((ev) => {
    const dateParts = ev.date.split('-');
    const evYear = parseInt(dateParts[0]);
    const evMonth = parseInt(dateParts[1]) - 1;
    const evDay = parseInt(dateParts[2]);
    if (evYear === viewYear && evMonth === viewMonth) {
      if (!eventsByDay[evDay]) eventsByDay[evDay] = [];
      eventsByDay[evDay].push(ev);
    }
  });

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const selectedDateStr = selectedDay
    ? toDateStr(viewYear, viewMonth, selectedDay)
    : null;

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div className="p-6 space-y-6">
      {showNewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Nuevo Evento</h3>
              <button onClick={() => setShowNewEventModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  placeholder="Ej: Junta General Ordinaria"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={newEvent.type}
                  onValueChange={(v) => setNewEvent((p) => ({ ...p, type: v as 'acta' | 'cargo' | 'incidencia' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acta">Acta</SelectItem>
                    <SelectItem value="cargo">Vencimiento</SelectItem>
                    <SelectItem value="incidencia">Incidencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Comunidad</label>
                <Select
                  value={newEvent.communityId}
                  onValueChange={(v) => setNewEvent((p) => ({ ...p, communityId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una comunidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  placeholder="Descripción opcional..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowNewEventModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleCreateEvent} disabled={savingEvent}>
                {savingEvent ? 'Guardando...' : 'Crear Evento'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendario de Eventos</h2>
          <p className="text-muted-foreground mt-1">Actas, vencimientos e incidencias por fecha</p>
        </div>
        <Button onClick={openNewEventModal}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo Evento
        </Button>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> Actas</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block" /> Vencimientos</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> Incidencias</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {MONTH_NAMES[viewMonth]} {viewYear}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} />;
                }
                const dayEvents = eventsByDay[day] ?? [];
                const selected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative flex flex-col items-center rounded-lg p-1.5 min-h-[52px] text-sm transition-colors ${
                      selected
                        ? 'bg-primary text-primary-foreground'
                        : isToday(day)
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="font-medium">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={`h-1.5 w-1.5 rounded-full ${EVENT_COLORS[ev.type]} ${selected ? 'opacity-80' : ''}`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {loading && (
              <div className="mt-4 text-center text-xs text-muted-foreground animate-pulse">
                Cargando eventos...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Day panel */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDateStr
                ? new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : 'Selecciona un día'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDay && (
              <p className="text-sm text-muted-foreground">
                Haz click en un día del calendario para ver sus eventos.
              </p>
            )}
            {selectedDay && selectedEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay eventos para este día.</p>
            )}
            {selectedEvents.length > 0 && (
              <div className="space-y-3">
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <span className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${EVENT_COLORS[ev.type]}`} />
                    <div>
                      <p className="text-sm font-medium">{ev.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {EVENT_LABELS[ev.type]}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
