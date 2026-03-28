import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Circle, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Incident {
  id: string;
  title: string;
  communityName?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'open' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface IncidentDashboardListProps {
  incidents: Incident[];
  onUpdateStatus: (id: string, status: string) => void;
  onViewDetails: (id: string) => void;
  loading?: boolean;
}

export function IncidentDashboardList({ incidents, onUpdateStatus, onViewDetails, loading }: IncidentDashboardListProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'open':
      case 'pending':
        return <Circle className="h-4 w-4 text-amber-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {incidents.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No hay incidencias que coincidan con el filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="group p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(incident.status)}
                    <h4 className="font-medium text-sm text-slate-800 truncate">{incident.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-500 font-medium">{incident.communityName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400">{new Date(incident.createdAt).toLocaleDateString('es-ES')}</span>
                    <Badge variant="outline" className={cn("text-[8px] uppercase tracking-wider py-0 px-1.5 h-4", getPriorityColor(incident.priority))}>
                      {incident.priority}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(incident.status === 'resolved' || incident.status === 'closed') ? (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => onUpdateStatus(incident.id, 'open')}
                        >
                            Reabrir
                        </Button>
                    ) : (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => onUpdateStatus(incident.id, 'resolved')}
                        >
                            Resolver
                        </Button>
                    )}
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-slate-400"
                        onClick={() => onViewDetails(incident.id)}
                    >
                        <ExternalLink className="h-3 w-3" />
                    </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
