import type { CompanionProvider, CompanionReply, ProposalDraft } from './types';
import type { Attribute } from '@/domain/types';
import { MISSION_TEMPLATES } from '@/domain/content';

/**
 * Demo companion: deterministic, rule-based. It never pretends to be an AI — the UI labels it
 * "Demo mode". It only uses the user's real VYBE data and fixed templates.
 */
const ATTR_DE: Record<Attribute, string> = { discipline: 'Disziplin', intelligence: 'Intelligenz', fitness: 'Fitness', finance: 'Finanzen', creativity: 'Kreativität', social: 'Soziales' };
const ATTR_EN: Record<Attribute, string> = { discipline: 'discipline', intelligence: 'intelligence', fitness: 'fitness', finance: 'finance', creativity: 'creativity', social: 'social' };

function detectIntent(text: string): 'plan' | 'break' | 'reflect' | 'focus' | 'help' {
  const s = text.toLowerCase();
  if (/(plan|tag|day|heute|today|morgen)/.test(s)) return 'plan';
  if (/(zerleg|break|ziel|goal|schritt|step)/.test(s)) return 'break';
  if (/(woche|week|reflekt|reflect|fortschritt|progress|wie lief|how was)/.test(s)) return 'reflect';
  if (/(fokus|focus|produktiv|productiv|prokrast|procrast|konzentr|concentr)/.test(s)) return 'focus';
  return 'help';
}

function goalAttribute(goal: string): Attribute {
  const g = goal.toLowerCase();
  if (/(fit|sport|lauf|run|gym|gesund|health|schlaf|sleep)/.test(g)) return 'fitness';
  if (/(spar|geld|money|save|finanz|financ|schulden|debt)/.test(g)) return 'finance';
  if (/(les|read|lern|learn|sprach|language|skill|fähig)/.test(g)) return 'intelligence';
  if (/(freund|friend|famil|social|kontakt)/.test(g)) return 'social';
  if (/(kreativ|creativ|projekt|project|musik|music|schreib|writ|zeichn|draw)/.test(g)) return 'creativity';
  return 'discipline';
}

export const demoProvider: CompanionProvider = {
  mode: 'demo',
  async reply(history, ctx): Promise<CompanionReply> {
    await new Promise((r) => setTimeout(r, 450));
    const de = ctx.lang === 'de';
    const last = history[history.length - 1]?.text ?? '';
    const intent = detectIntent(last);
    const A = de ? ATTR_DE : ATTR_EN;

    if (intent === 'plan') {
      const open = ctx.todayOpenMissions;
      const budget = ctx.dailyMinutes;
      const proposals: ProposalDraft[] = [];
      if (open.length < 3) {
        const t = MISSION_TEMPLATES[ctx.weakestAttribute][0];
        proposals.push({ title: t.title[ctx.lang], attribute: t.attribute, difficulty: t.difficulty, recurrence: 'once' });
      }
      const lines = de
        ? [`Dein Tagesplan für ~${budget} Minuten, ${ctx.name}:`, ...(open.length ? open.slice(0, 4).map((m, i) => `${i + 1}. ${m}`) : ['Für heute ist noch nichts offen.']),
           open.length > 3 ? 'Tipp: Beginne mit der kleinsten Mission – Momentum zählt.' : `Dein schwächstes Attribut ist ${A[ctx.weakestAttribute]} – ich schlage eine passende Mission vor.`]
        : [`Your plan for ~${budget} minutes, ${ctx.name}:`, ...(open.length ? open.slice(0, 4).map((m, i) => `${i + 1}. ${m}`) : ['Nothing open for today yet.']),
           open.length > 3 ? 'Tip: start with the smallest mission — momentum matters.' : `Your weakest attribute is ${ctx.weakestAttribute} — here's a matching mission.`];
      return { text: lines.join('\n'), proposals, mode: 'demo' };
    }

    if (intent === 'break') {
      const goal = ctx.goals[0] ?? (de ? 'dein Ziel' : 'your goal');
      const attr = goalAttribute(goal);
      const steps = de
        ? [`Erste kleine Aktion für „${goal}“ (10 Min.)`, `Woche planen: 3 feste Termine für „${goal}“`, `Fortschritt zu „${goal}“ notieren`]
        : [`First small action towards “${goal}” (10 min)`, `Plan the week: 3 fixed slots for “${goal}”`, `Write down progress on “${goal}”`];
      return {
        text: de
          ? `Ich zerlege „${goal}“ in drei Missionen. Große Ziele werden machbar, wenn der nächste Schritt winzig ist. Übernimm, was passt:`
          : `I’ll break “${goal}” into three missions. Big goals become doable when the next step is tiny. Accept what fits:`,
        proposals: [
          { title: steps[0], attribute: attr, difficulty: 'easy', recurrence: 'daily' },
          { title: steps[1], attribute: 'discipline', difficulty: 'normal', recurrence: 'once' },
          { title: steps[2], attribute: attr, difficulty: 'easy', recurrence: 'once' },
        ],
        mode: 'demo',
      };
    }

    if (intent === 'reflect') {
      const diff = ctx.weekXp - ctx.lastWeekXp;
      const trend = de
        ? diff > 0 ? `+${diff} XP mehr als letzte Woche – stark.` : diff < 0 ? `${Math.abs(diff)} XP weniger als letzte Woche. Kein Drama: Konstanz schlägt Intensität.` : 'Gleich viel wie letzte Woche.'
        : diff > 0 ? `+${diff} XP more than last week — strong.` : diff < 0 ? `${Math.abs(diff)} XP less than last week. No drama: consistency beats intensity.` : 'Same as last week.';
      const habitLine = ctx.habits.length
        ? (de ? 'Gewohnheiten: ' : 'Habits: ') + ctx.habits.map((h) => `${h.name} (${h.streak})`).join(', ')
        : de ? 'Noch keine Gewohnheiten angelegt.' : 'No habits yet.';
      return {
        text: [
          de ? `Deine Woche, ${ctx.name}:` : `Your week, ${ctx.name}:`,
          `• ${ctx.weekXp} XP · ${trend}`,
          `• ${de ? 'Serie' : 'Streak'}: ${ctx.streak} ${de ? 'Tage' : 'days'} · Level ${ctx.level}`,
          `• ${de ? 'Stärkstes Attribut' : 'Strongest'}: ${A[ctx.strongestAttribute]} · ${de ? 'Ausbaufähig' : 'Room to grow'}: ${A[ctx.weakestAttribute]}`,
          `• ${habitLine}`,
          de ? 'Frage zum Nachdenken: Was hat diese Woche am meisten Energie gegeben?' : 'Question to reflect on: what gave you the most energy this week?',
        ].join('\n'),
        proposals: [],
        mode: 'demo',
      };
    }

    if (intent === 'focus') {
      return {
        text: de
          ? 'Drei bewährte Fokus-Hebel:\n1. Ein Fokusblock pro Tag (25–60 Min.), Handy außer Reichweite.\n2. Die schwierigste Aufgabe zuerst – bevor Nachrichten kommen.\n3. Abends 5 Minuten: Plan für morgen festlegen.\nSoll ich daraus eine tägliche Mission machen?'
          : 'Three proven focus levers:\n1. One focus block per day (25–60 min), phone out of reach.\n2. Hardest task first — before messages arrive.\n3. Evenings, 5 minutes: set tomorrow’s plan.\nWant me to turn that into a daily mission?',
        proposals: [{ title: MISSION_TEMPLATES.discipline[1].title[ctx.lang], attribute: 'discipline', difficulty: 'challenging', recurrence: 'daily' }],
        mode: 'demo',
      };
    }

    return {
      text: de
        ? 'Im Demo-Modus verstehe ich vier Anliegen: „Plane meinen Tag“, „Zerlege mein Ziel“, „Wie lief meine Woche?“ und „Tipps für mehr Fokus“. Mit einem verbundenen KI-Backend kann ich frei antworten.'
        : 'In demo mode I understand four requests: “Plan my day”, “Break down my goal”, “How was my week?” and “Tips for better focus”. With a connected AI backend I can answer freely.',
      proposals: [],
      mode: 'demo',
    };
  },
};
