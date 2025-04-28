import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass-card rounded-b-2xl px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-light to-purple-dark flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">VS</span>
            </div>
            <h1 className="text-xl font-bold text-foreground hidden md:block">VoteSnap</h1>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className={`font-medium text-sm transition-colors ${isActive('/') ? 'text-purple-dark' : 'text-foreground/70 hover:text-foreground'}`}>
              Home
            </Link>
            <Link to="/agent" className={`font-medium text-sm transition-colors ${isActive('/agent') ? 'text-purple-dark' : 'text-foreground/70 hover:text-foreground'}`}>
              Field Agent
            </Link>
            <Link to="/admin" className={`font-medium text-sm transition-colors ${isActive('/admin') ? 'text-purple-dark' : 'text-foreground/70 hover:text-foreground'}`}>
              Admin
            </Link>
            <Link to="/uploads" className={`font-medium text-sm transition-colors ${isActive('/uploads') ? 'text-purple-dark' : 'text-foreground/70 hover:text-foreground'}`}>
              Uploads
            </Link>
          </nav>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <Link 
              to="/" 
              className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/') ? 'bg-purple/20 font-medium' : 'hover:bg-white/30'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/agent" 
              className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/agent') ? 'bg-purple/20 font-medium' : 'hover:bg-white/30'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Field Agent
            </Link>
            <Link 
              to="/admin" 
              className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/admin') ? 'bg-purple/20 font-medium' : 'hover:bg-white/30'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Admin
            </Link>
            <Link 
              to="/uploads" 
              className={`block py-2 px-4 rounded-lg transition-colors ${isActive('/uploads') ? 'bg-purple/20 font-medium' : 'hover:bg-white/30'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Uploads
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
