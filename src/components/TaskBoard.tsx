import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CheckSquare, Square, Plus, ClipboardList } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'adminfincas_tasks';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
  }, [tasks]);

  const addTask = () => {
    const text = newTask.trim();
    if (!text) return;
    const task: Task = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    };
    setTasks(prev => [task, ...prev]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const pendingCount = tasks.filter(t => !t.completed).length;

  return (
    <Card className="border-none shadow-sm h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Tablero de Tareas
          {pendingCount > 0 && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal">
              {pendingCount} pendientes
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Nueva tarea..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
            className="text-sm"
          />
          <Button size="icon" onClick={addTask} title="Añadir tarea">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1 max-h-[230px] overflow-y-auto pr-1">
          {tasks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No hay tareas. Añade una arriba.
            </p>
          )}
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-start gap-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => toggleTask(task.id)}
            >
              {task.completed
                ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                : <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {task.text}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{task.createdAt}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
