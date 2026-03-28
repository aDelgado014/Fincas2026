import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, GripVertical, Plus, Trash2, KanbanSquare } from 'lucide-react';

type Column = 'todo' | 'inprogress' | 'done';

interface Task {
  id: string;
  text: string;
  dueDate: string;
  column: Column;
  completed: boolean;
  order: number;
}

const COLUMNS: { id: Column; label: string; color: string }[] = [
  { id: 'todo', label: 'Pendiente', color: 'bg-rose-50 border-rose-200' },
  { id: 'inprogress', label: 'En Progreso', color: 'bg-amber-50 border-amber-200' },
  { id: 'done', label: 'Completado', color: 'bg-emerald-50 border-emerald-200' },
];

const STORAGE_KEY = 'adminfincas_tasks';

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState('');
  const [newDate, setNewDate] = useState('');
  const dragItem = useRef<string | null>(null);
  const dragOverColumn = useRef<Column | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setTasks(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addTask = () => {
    if (!newText.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      text: newText.trim(),
      dueDate: newDate,
      column: 'todo',
      completed: false,
      order: tasks.length,
    };
    save([...tasks, task]);
    setNewText('');
    setNewDate('');
  };

  const toggleComplete = (id: string) => {
    save(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    save(tasks.filter(t => t.id !== id));
  };

  const handleDragStart = (id: string) => {
    dragItem.current = id;
  };

  const handleDragOverColumn = (col: Column) => {
    dragOverColumn.current = col;
  };

  const handleDrop = () => {
    if (!dragItem.current || !dragOverColumn.current) return;
    save(tasks.map(t =>
      t.id === dragItem.current ? { ...t, column: dragOverColumn.current! } : t
    ));
    dragItem.current = null;
    dragOverColumn.current = null;
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <KanbanSquare className="h-5 w-5 text-primary" />
          Tablero de Tareas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Nueva tarea..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            className="flex-1 text-sm h-8"
          />
          <Input
            type="datetime-local"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="w-44 text-sm h-8"
          />
          <Button size="sm" onClick={addTask} className="h-8 px-3">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {COLUMNS.map(col => (
            <div
              key={col.id}
              className={`rounded-lg border p-2 min-h-[160px] ${col.color}`}
              onDragOver={e => { e.preventDefault(); handleDragOverColumn(col.id); }}
              onDrop={handleDrop}
            >
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {col.label} ({tasks.filter(t => t.column === col.id).length})
              </div>
              <div className="space-y-1.5">
                {tasks
                  .filter(t => t.column === col.id)
                  .sort((a, b) => a.order - b.order)
                  .map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className="bg-white rounded-md p-2 shadow-xs border border-slate-100 cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="h-3 w-3 text-slate-300 mt-0.5 shrink-0" />
                        <button onClick={() => toggleComplete(task.id)} className="mt-0.5 shrink-0">
                          {task.completed
                            ? <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                            : <Square className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                        <span className={`text-xs flex-1 leading-snug ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.text}
                        </span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3 text-slate-300 hover:text-destructive" />
                        </button>
                      </div>
                      {task.dueDate && (
                        <div className="ml-7 mt-1">
                          <Badge variant="outline" className="text-[9px] py-0 px-1 h-4">
                            {new Date(task.dueDate).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
