import { Link } from 'react-router-dom';
import { Code2, Github, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-coders-border bg-coders-bg py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-coders-green rounded flex items-center justify-center">
              <Code2 className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold gradient-text">CodeForge</span>
            <span className="text-muted-foreground text-sm">© 2024</span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/problems" className="hover:text-foreground transition-colors">Problems</Link>
            <Link to="/contest" className="hover:text-foreground transition-colors">Contests</Link>
            <Link to="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link>
            <Link to="/premium" className="hover:text-foreground transition-colors">Premium</Link>
          </nav>

          <div className="flex items-center gap-3">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
