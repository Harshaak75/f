import { Construction } from 'lucide-react';
import { Card } from '../components/ui/card';
import { useLocation } from 'react-router-dom';

export default function ComingSoon() {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Page';

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-12 text-center card-shadow">
        <Construction size={64} className="mx-auto text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{pageName}</h2>
        <p className="text-muted-foreground">
          This feature is under development and will be available soon.
        </p>
      </Card>
    </div>
  );
}
