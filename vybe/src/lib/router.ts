import { useEffect, useState } from 'react';

/** Tiny hash router — no dependency, works offline and inside a PWA/Capacitor shell. */
export const ROUTES = ['home', 'missions', 'habits', 'money', 'character', 'achievements', 'social', 'companion', 'stats', 'settings', 'more', 'community'] as const;
export type Route = (typeof ROUTES)[number];

function parse(): { route: Route; param?: string } {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [r, param] = raw.split('/');
  const route = (ROUTES as readonly string[]).includes(r) ? (r as Route) : 'home';
  return { route, param: param ? decodeURIComponent(param) : undefined };
}

export function navigate(route: Route, param?: string) {
  const target = `#/${route}${param ? '/' + encodeURIComponent(param) : ''}`;
  if (window.location.hash !== target) window.location.hash = target;
}

export function useRoute() {
  const [state, setState] = useState(parse);
  useEffect(() => {
    const on = () => {
      setState(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return state;
}
