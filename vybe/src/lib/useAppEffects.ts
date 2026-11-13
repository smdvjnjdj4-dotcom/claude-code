import { useEffect } from 'react';
import { useVybe } from '@/store/useVybe';
import { useReducedMotion } from './motion';
import { todayKey } from './date';
import { translate } from './i18n';

/** Applies theme/accent/accessibility classes to <html>. */
export function useThemeEffect() {
  const { theme, accent, largeText, highContrast, lang } = useVybe((s) => s.settings);
  const reduce = useReducedMotion();
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const light = theme === 'light' || (theme === 'system' && mq.matches);
      root.classList.toggle('light', light);
      root.classList.toggle('dark', !light);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#F6F6FA' : '#08080D');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = accent;
    root.classList.toggle('large-text', largeText);
    root.classList.toggle('contrast', highContrast);
    root.classList.toggle('reduce-motion', reduce);
    root.lang = lang;
  }, [accent, largeText, highContrast, reduce, lang]);
}

/**
 * Local reminders: checks once a minute while the app is open and fires a Notification for habits
 * with a reminder time that are still open today. No server push — honest limitation (see README).
 */
export function useReminders() {
  useEffect(() => {
    const fired = new Set<string>();
    const tick = () => {
      const s = useVybe.getState();
      if (!s.settings.notifications.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const day = todayKey(now);
      const lang = s.settings.lang;
      if (s.settings.notifications.habitReminders) {
        for (const h of s.habits) {
          const key = `${h.id}:${day}`;
          if (h.reminder === hhmm && !h.log[day] && !fired.has(key)) {
            fired.add(key);
            new Notification('VYBE', { body: `${h.name} — ${translate(lang, 'h.reminder')}`, icon: '/icon-192.png', tag: key });
          }
        }
      }
      if (s.settings.notifications.dailyPlan && s.settings.notifications.dailyPlanTime === hhmm && !fired.has(`plan:${day}`)) {
        fired.add(`plan:${day}`);
        new Notification('VYBE', { body: translate(lang, 'home.todayMissions'), icon: '/icon-192.png' });
      }
    };
    const id = setInterval(tick, 30_000);
    // New day while app stays open → reconcile streak.
    let last = todayKey();
    const dayCheck = setInterval(() => {
      if (todayKey() !== last) {
        last = todayKey();
        useVybe.getState().refreshDay();
      }
    }, 60_000);
    return () => {
      clearInterval(id);
      clearInterval(dayCheck);
    };
  }, []);
}
