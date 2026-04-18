import React from 'react';
import { Home, TrendingUp, Clock, Library } from 'lucide-react';
import { cn } from '../lib/utils';

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 hidden h-full w-64 flex-col border-r border-border bg-card/50 backdrop-blur-xl lg:flex">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tighter text-primary">YT STUDIO</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        <NavItem icon={<Home size={20} />} label="Home" active />
        <NavItem icon={<TrendingUp size={20} />} label="Trending" />
        <NavItem icon={<Clock size={20} />} label="Latest" />
        <NavItem icon={<Library size={20} />} label="Library" />
      </nav>
    </aside>
  );
}

function NavItem({ icon, label, active = false }) {
  return (
    <a href="#" className={cn(
      "flex items-center gap-4 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
    )}>
      {icon}
      {label}
    </a>
  );
}
