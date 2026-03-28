import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ShortcutCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  color?: string;
  className?: string;
}

export function ShortcutCard({ icon: Icon, title, description, onClick, color = 'text-primary', className }: ShortcutCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("cursor-pointer", className)}
      onClick={onClick}
    >
      <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden bg-white/50 backdrop-blur-sm border-white/20">
        <CardContent className="p-5 flex items-start gap-4">
          <div className={cn("p-3 rounded-xl transition-colors duration-300", color.replace('text-', 'bg-').replace('600', '50').replace('500', '50'))}>
            <Icon className={cn("h-6 w-6", color)} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
