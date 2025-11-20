import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  className?: string;
}

export function KPICard({ title, value, change, changeType = 'neutral', icon: Icon, className }: KPICardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-card rounded-xl p-6 border border-border card-shadow-hover',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-semibold">{value}</p>
          {change && (
            <p
              className={cn(
                'text-sm mt-2',
                changeType === 'positive' && 'text-green-600',
                changeType === 'negative' && 'text-red-600',
                changeType === 'neutral' && 'text-muted-foreground'
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center">
          <Icon className="text-primary" size={24} />
        </div>
      </div>
    </motion.div>
  );
}
