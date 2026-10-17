import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="text-8xl font-bold gradient-text mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" className="border-coders-border" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />Go Back
          </Button>
          <Button className="bg-coders-green text-black hover:bg-coders-green/90" asChild>
            <Link to="/">Home</Link>
          </Button>
        </div>
        <div className="mt-8 text-sm text-muted-foreground">
          <p>Looking for something specific?</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/problems" className="text-coders-green hover:underline">Problems</Link>
            <Link to="/contest" className="text-coders-green hover:underline">Contests</Link>
            <Link to="/leaderboard" className="text-coders-green hover:underline">Leaderboard</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
