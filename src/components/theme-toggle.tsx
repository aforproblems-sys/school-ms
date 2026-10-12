'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark');

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] 
bg-[hsl(var(--card))] px-3 py-2 text-sm"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
