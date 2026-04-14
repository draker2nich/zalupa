"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Home, Clock, Settings, PenSquare, Sun, Moon, Sparkles,
  ChevronRight, ChevronDown, ChevronLeft, X, Send,
  ThumbsUp, ThumbsDown, Plus, Check, Flame, BookOpen,
  Star, Brain, Feather, Heart, Briefcase, Sprout,
  AlertCircle, Eye, Frown, Meh, Minus, Smile, Laugh, Trash2,
} from "lucide-react";
import {
  useProfile, useEntries, useHabits, useIntentions,
  sendFeedback, saveUserMessage,
  type Profile, type EntryListItem, type EntryDetail,
  type HabitItem, type IntentionItem,
} from "@/lib/hooks/useApi";

// ============================================
// TYPES
// ============================================
interface MoodDef {
  icon: React.ReactNode;
  label: string;
  score: number;
  color: string;
}

interface PersonaDef {
  id: string;
  icon: React.ReactNode;
  name: string;
  style: string;
}

interface ChatMsg {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  persona?: string;
}

interface WriteState {
  entryId: string | null;
  mode: string;
  persona: string;
  messages: ChatMsg[];
  mood: MoodDef | null;
}

// ============================================
// CONSTANTS
// ============================================
const PERSONAS: PersonaDef[] = [
  { id: "mirror", icon: <Star size={18} />, name: "Mirror", style: "Сбалансированный и вдумчивый" },
  { id: "challenger", icon: <AlertCircle size={18} />, name: "Претендент", style: "Мягко бросает вызов" },
  { id: "sage", icon: <Sparkles size={18} />, name: "Мудрица", style: "Ясность через спокойное размышление" },
  { id: "gardener", icon: <Sprout size={18} />, name: "Садовница", style: "Метафоры природы и роста" },
  { id: "observer", icon: <Eye size={18} />, name: "Наблюдатель", style: "Нейтральный, отражает без оценок" },
];

const MOODS: MoodDef[] = [
  { icon: <Frown size={22} />, label: "Тяжело", score: 1, color: "#EF4444" },
  { icon: <Meh size={22} />, label: "Грустно", score: 2, color: "#F59E0B" },
  { icon: <Minus size={22} />, label: "Нормально", score: 3, color: "#9CA3AF" },
  { icon: <Smile size={22} />, label: "Хорошо", score: 4, color: "#22C55E" },
  { icon: <Laugh size={22} />, label: "Отлично", score: 5, color: "#8B7CF6" },
];

const GOALS = [
  { id: "anxiety", icon: <AlertCircle size={18} />, label: "Тревога и стресс" },
  { id: "relationships", icon: <Heart size={18} />, label: "Отношения" },
  { id: "career", icon: <Briefcase size={18} />, label: "Работа и карьера" },
  { id: "growth", icon: <Sprout size={18} />, label: "Личностный рост" },
  { id: "write", icon: <Feather size={18} />, label: "Просто писать" },
];

const DAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

const OPENING_PROMPTS: Record<string, string> = {
  mirror: "Что у тебя сегодня на душе?",
  challenger: "Расскажи, что занимает твой ум - я помогу посмотреть под другим углом.",
  sage: "Найди минутку тишины... Что хочет быть замеченным прямо сейчас?",
  gardener: "Какое семя ты посадил сегодня? Или, может, что-то проросло?",
  observer: "Опиши свой день. Я послушаю.",
};

const cs = {
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)" } as React.CSSProperties,
  cardHover: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", cursor: "pointer", transition: "all 0.15s" } as React.CSSProperties,
  btnAccent: { background: "var(--accent)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" } as React.CSSProperties,
  label: { fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.5px" } as React.CSSProperties,
};

// ============================================
// HELPERS
// ============================================
function moodColor(score: number | null | undefined): string {
  if (!score) return "var(--text-tertiary)";
  return MOODS.find(m => m.score === score)?.color ?? "var(--text-tertiary)";
}

function moodIconNode(score: number | null | undefined): React.ReactNode {
  if (!score) return null;
  return MOODS.find(m => m.score === score)?.icon ?? null;
}

function computeStreak(entries: EntryListItem[]): number {
  if (!entries.length) return 0;
  const dates = new Set(entries.map(e => new Date(e.entryDate || e.createdAt).toDateString()));
  let streak = 0;
  const d = new Date();
  while (dates.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getSessionLabel(mode: string): string {
  if (mode === "morning") return "Утро";
  if (mode === "evening") return "Вечер";
  return "Свободная запись";
}

function findPersona(id: string): PersonaDef {
  return PERSONAS.find(p => p.id === id) ?? PERSONAS[0];
}

function getWeekDays(today: Date, entries: EntryListItem[]) {
  const d = new Date(today);
  const day = d.getDay();
  const off = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + off);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mon);
    date.setDate(mon.getDate() + i);
    return {
      dayNum: date.getDate(),
      label: DAYS_RU[i],
      hasEntry: entries.some(e => new Date(e.entryDate || e.createdAt).toDateString() === date.toDateString()),
      isToday: date.toDateString() === today.toDateString(),
      isFuture: date > today,
    };
  });
}

function countWords(entries: EntryListItem[]): number {
  let total = 0;
  for (const e of entries) {
    for (const m of e.messages ?? []) {
      if (m.role === "user" && m.content) {
        total += m.content.split(/\s+/).length;
      }
    }
  }
  return total;
}

function weekDayBg(d: { hasEntry: boolean; isToday: boolean }): string {
  if (d.hasEntry) return "var(--accent)";
  return "transparent";
}

function weekDayColor(d: { hasEntry: boolean; isToday: boolean }): string {
  if (d.hasEntry) return "#fff";
  if (d.isToday) return "var(--accent)";
  return "var(--text-tertiary)";
}

function weekDayBorder(d: { hasEntry: boolean; isToday: boolean }): string {
  if (d.isToday && !d.hasEntry) return "2px solid var(--accent)";
  return "1px solid transparent";
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const { status } = useSession();
  const { profile, loading: profileLoading, completeOnboarding, update: updateProfile } = useProfile();
  const { entries, createEntry, updateEntry, deleteEntry, getEntry, reload: reloadEntries } = useEntries();
  const { habits, create: createHabit, toggle: toggleHabit } = useHabits();
  const { intentions } = useIntentions();

  const [screen, setScreen] = useState<string>("home");
  const [writeState, setWriteState] = useState<WriteState | null>(null);
  const [viewingEntry, setViewingEntry] = useState<EntryDetail | null>(null);

  if (status === "loading" || profileLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
          <Star size={24} style={{ color: "var(--accent)", marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (profile && !profile.onboardingCompleted) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  if (screen === "write" && writeState) {
    return (
      <WriteScreen
        state={writeState}
        setState={(updater) => {
          setWriteState((prev) => {
            if (!prev) return prev;
            return typeof updater === "function" ? updater(prev) : updater;
          });
        }}
        userName={profile?.name ?? "друг"}
        onUpdateEntry={updateEntry}
        onClose={async () => {
          await reloadEntries();
          setWriteState(null);
          setScreen("home");
        }}
      />
    );
  }

  const startWrite = async (mode: string) => {
    const entry = await createEntry(mode, "mirror");
    setWriteState({ entryId: entry.id, mode, persona: "mirror", messages: [], mood: null });
    setScreen("write");
  };

  const viewEntry = async (entry: EntryListItem) => {
    const full = await getEntry(entry.id);
    setViewingEntry(full);
    setScreen("entry");
  };

  const today = new Date();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside className="sidebar" style={{ width: 220, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 16px 12px", fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>Psyche Mirror</div>
        <nav style={{ flex: 1, padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { id: "home", lbl: "Главная", ic: <Home size={18} /> },
            { id: "history", lbl: "История", ic: <Clock size={18} /> },
            { id: "settings", lbl: "Настройки", ic: <Settings size={18} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setScreen(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", background: screen === tab.id ? "var(--surface-hover)" : "transparent", color: screen === tab.id ? "var(--text)" : "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: screen === tab.id ? 500 : 400, width: "100%", textAlign: "left", transition: "all 0.15s" }}>
              {tab.ic} {tab.lbl}
            </button>
          ))}
        </nav>
        <div style={{ padding: 12 }}>
          <button onClick={() => startWrite("free")} style={{ ...cs.btnAccent, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", width: "100%" }}>
            <PenSquare size={16} /> Новая запись
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
        {screen === "home" && <HomeScreen userName={profile?.name ?? ""} entries={entries} habits={habits} today={today} onWrite={startWrite} onViewEntry={viewEntry} onToggleHabit={toggleHabit} onCreateHabit={createHabit} />}
        {screen === "entry" && viewingEntry && <EntryScreen entry={viewingEntry} onBack={() => setScreen("home")} onDelete={async () => { await deleteEntry(viewingEntry.id); setScreen("home"); }} />}
        {screen === "history" && <HistoryScreen entries={entries} onView={viewEntry} />}
        {screen === "settings" && <SettingsScreen profile={profile} onUpdate={updateProfile} />}
      </main>

      {/* Bottom bar */}
      <nav className="bottom-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--surface)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-around", padding: "6px 0 env(safe-area-inset-bottom, 8px)", zIndex: 50 }}>
        {[
          { id: "home", lbl: "Главная", ic: <Home size={20} />, center: false },
          { id: "history", lbl: "История", ic: <Clock size={20} />, center: false },
          { id: "write", lbl: "", ic: <PenSquare size={20} />, center: true },
          { id: "settings", lbl: "Ещё", ic: <Settings size={20} />, center: false },
        ].map(tab => {
          if (tab.center) return (
            <button key={tab.id} onClick={() => startWrite("free")} style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--accent)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: -10, boxShadow: "0 2px 10px rgba(139,124,246,0.35)" }}>
              {tab.ic}
            </button>
          );
          return (
            <button key={tab.id} onClick={() => setScreen(tab.id)} style={{ background: "none", border: "none", color: screen === tab.id ? "var(--accent)" : "var(--text-tertiary)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px", fontSize: 10 }}>
              {tab.ic}<span>{tab.lbl}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        .sidebar{display:none}.bottom-bar{display:flex}
        @media(min-width:768px){.sidebar{display:flex!important}.bottom-bar{display:none!important}main{padding-bottom:0}}
        @media(max-width:767px){main{padding-bottom:72px}}
      `}</style>
    </div>
  );
}

// ============================================
// ONBOARDING
// ============================================
function Onboarding(props: Readonly<{ onComplete: (d: { name: string; goals: string[]; preferredTime: string }) => Promise<unknown> }>) {
  const { onComplete } = props;
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? goals.length > 0 : time !== "";

  async function next() {
    if (step === 0) { setStep(1); return; }
    if (step === 1) { setStep(2); return; }
    setSaving(true);
    await onComplete({ name: name.trim(), goals, preferredTime: time });
    setSaving(false);
  }

  const btnLabel = saving ? "Сохраняем..." : step === 2 ? "Начать" : "Дальше";

  return (
    <div className="fade-in" style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px 24px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 48 }}>
        {[0, 1, 2].map(i => <div key={`dot-${i}`} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? "var(--accent)" : "var(--border)", transition: "all 0.3s" }} />)}
      </div>
      <div style={{ flex: 1 }}>
        {step === 0 && (
          <div className="fade-in">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", marginBottom: 16 }}><Star size={20} /></div>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Привет! Я Mirror</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 32, lineHeight: 1.5, fontSize: 14 }}>Твой дневник рефлексии. Как тебя зовут?</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && canNext) next(); }} placeholder="Твое имя" autoFocus style={cs.input} />
            {name.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-tertiary)" }}>Привет, {name}!</div>}
          </div>
        )}
        {step === 1 && (
          <div className="fade-in">
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Что хочешь исследовать?</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>Выбери одну или несколько тем</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GOALS.map(g => {
                const sel = goals.includes(g.id);
                return (
                  <button key={g.id} onClick={() => setGoals(prev => sel ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: sel ? "var(--accent-light)" : "var(--surface)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, color: "var(--text)", cursor: "pointer", fontSize: 14, textAlign: "left", transition: "all 0.15s" }}>
                    <span style={{ color: sel ? "var(--accent)" : "var(--text-tertiary)" }}>{g.icon}</span>
                    <span style={{ flex: 1 }}>{g.label}</span>
                    {sel && <Check size={16} style={{ color: "var(--accent)" }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="fade-in">
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Когда удобнее рефлексировать?</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>Мы подстроим напоминания</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{ id: "morning", icon: <Sun size={18} />, lbl: "Утром" }, { id: "evening", icon: <Moon size={18} />, lbl: "Вечером" }, { id: "anytime", icon: <Clock size={18} />, lbl: "Когда захочу" }].map(t => (
                <button key={t.id} onClick={() => setTime(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: time === t.id ? "var(--accent-light)" : "var(--surface)", border: `1px solid ${time === t.id ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, color: "var(--text)", cursor: "pointer", fontSize: 14, transition: "all 0.15s" }}>
                  <span style={{ color: time === t.id ? "var(--accent)" : "var(--text-tertiary)" }}>{t.icon}</span>
                  <span style={{ flex: 1 }}>{t.lbl}</span>
                  {time === t.id && <Check size={16} style={{ color: "var(--accent)" }} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={next} disabled={!canNext || saving}
        style={{ width: "100%", padding: "12px", background: canNext ? "var(--accent)" : "var(--border-light)", color: canNext ? "#fff" : "var(--text-tertiary)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: canNext ? "pointer" : "default", marginTop: 32, transition: "all 0.15s" }}>
        {btnLabel}
      </button>
    </div>
  );
}

// ============================================
// HOME
// ============================================
interface HomeProps {
  readonly userName: string;
  readonly entries: EntryListItem[];
  readonly habits: HabitItem[];
  readonly today: Date;
  readonly onWrite: (mode: string) => void;
  readonly onViewEntry: (e: EntryListItem) => void;
  readonly onToggleHabit: (id: string) => void;
  readonly onCreateHabit: (name: string) => void;
}

function HomeScreen({ userName, entries, habits, today, onWrite, onViewEntry, onToggleHabit, onCreateHabit }: HomeProps) {
  const dayOfWeek = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"][today.getDay()];
  const dateStr = `${today.getDate()} ${MONTHS_RU[today.getMonth()]}`;
  const streak = computeStreak(entries);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const completed = habits.filter(h => h.done).length;
  const wdays = getWeekDays(today, entries);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{dayOfWeek}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>{dateStr}</h1>
          {streak > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--accent-light)", padding: "4px 10px", borderRadius: 20, fontSize: 13, color: "var(--accent)", fontWeight: 500 }}><Flame size={14} /> {streak}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "var(--text-tertiary)" }}><Star size={12} /> Луна в Рыбах - хороший день для рефлексии</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        {wdays.map(d => (
          <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: d.isFuture ? 0.3 : 1 }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{d.label}</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: d.isToday ? 600 : 400, background: weekDayBg(d), color: weekDayColor(d), border: weekDayBorder(d) }}>
              {d.hasEntry ? <Check size={14} /> : d.dayNum}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { lbl: "Записей", val: entries.length, ic: <BookOpen size={14} /> },
          { lbl: "Streak", val: streak, ic: <Flame size={14} /> },
          { lbl: "Слов", val: countWords(entries), ic: <Feather size={14} /> },
        ].map(st => (
          <div key={st.lbl} style={{ ...cs.card, padding: "14px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--text-tertiary)" }}>{st.ic}</span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>{st.lbl}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{st.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 24 }}>
        {[{ mode: "morning", ic: <Sun size={20} />, title: "Утренняя рефлексия", sub: "Задай намерение на день" },
          { mode: "evening", ic: <Moon size={20} />, title: "Вечерняя рефлексия", sub: "Что было важным?" }].map(c => (
          <button key={c.mode} onClick={() => onWrite(c.mode)} style={{ ...cs.cardHover, padding: 16, textAlign: "left", width: "100%" }}>
            <div style={{ color: "var(--text-tertiary)", marginBottom: 10 }}>{c.ic}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{c.sub}</div>
          </button>
        ))}
      </div>

      <button onClick={() => onWrite("free")} style={{ ...cs.cardHover, padding: 16, width: "100%", textAlign: "left", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Для вас</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Что ты чувствуешь прямо сейчас?</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>Иногда просто назвать чувство - уже шаг к ясности.</div>
      </button>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Цели на сегодня</span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{completed}/{habits.length}</span>
        </div>
        <div style={{ height: 3, background: "var(--border-light)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${habits.length > 0 ? (completed / habits.length) * 100 : 0}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        {habits.map(h => (
          <button key={h.id} onClick={() => onToggleHabit(h.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", ...cs.card, cursor: "pointer", width: "100%", textAlign: "left", marginBottom: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${h.done ? "var(--accent)" : "var(--border)"}`, background: h.done ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
              {h.done && <Check size={12} color="#fff" />}
            </div>
            <span style={{ flex: 1, fontSize: 14, textDecoration: h.done ? "line-through" : "none", color: h.done ? "var(--text-tertiary)" : "var(--text)" }}>{h.emoji} {h.name}</span>
          </button>
        ))}
        {addingHabit ? (
          <input value={newHabit} onChange={e => setNewHabit(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && newHabit.trim()) { onCreateHabit(newHabit.trim()); setNewHabit(""); setAddingHabit(false); }}}
            onBlur={() => setAddingHabit(false)} placeholder="Новая привычка..." autoFocus style={{ ...cs.input, marginTop: 4 }} />
        ) : (
          <button onClick={() => setAddingHabit(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 13 }}><Plus size={14} /> Добавить</button>
        )}
      </div>

      {entries.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Последние записи</div>
          {entries.slice(0, 5).map(e => (
            <button key={e.id} onClick={() => onViewEntry(e)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", ...cs.cardHover, width: "100%", textAlign: "left", marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: moodColor(e.moodScore), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title ?? "Без заголовка"}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{new Date(e.entryDate || e.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
              </div>
              <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// WRITE
// ============================================
interface WriteScreenProps {
  readonly state: WriteState;
  readonly setState: (updater: WriteState | ((prev: WriteState) => WriteState)) => void;
  readonly userName: string;
  readonly onUpdateEntry: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  readonly onClose: () => void;
}

function WriteScreen({ state, setState, userName, onUpdateEntry, onClose }: WriteScreenProps) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPersonaSheet, setShowPersonaSheet] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [moodPicked, setMoodPicked] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const persona = findPersona(state.persona);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.messages, isTyping]);

  const send = async (text?: string, action?: string) => {
    const content = text ?? input.trim();
    if (!content && !action) return;
    if (!state.entryId) return;

    if (content && !action) {
      await saveUserMessage(state.entryId, content);
      setState(prev => ({ ...prev, messages: [...prev.messages, { role: "user" as const, content, timestamp: Date.now() }] }));
    }

    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setIsTyping(true);

    try {
      const cur = action ? state.messages : [...state.messages, { role: "user" as const, content, timestamp: Date.now() }];
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: state.entryId, message: action ? undefined : content, personaId: state.persona, sessionMode: state.mode, action, messages: cur.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.body) throw new Error("No body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      setState(prev => ({ ...prev, messages: [...prev.messages, { role: "assistant" as const, content: "", timestamp: Date.now(), persona: state.persona }] }));

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "delta") {
              aiContent += data.text;
              const snap = aiContent;
              setState(prev => { const msgs = [...prev.messages]; const last = msgs.at(-1); if (last) msgs[msgs.length - 1] = { ...last, content: snap }; return { ...prev, messages: msgs }; });
            }
            if (data.type === "done" && data.messageId) {
              const mid = data.messageId as string;
              setState(prev => { const msgs = [...prev.messages]; const last = msgs.at(-1); if (last) msgs[msgs.length - 1] = { ...last, id: mid }; return { ...prev, messages: msgs }; });
            }
          } catch { /* skip */ }
        }
      }

      if (!moodPicked && state.messages.filter(m => m.role === "assistant").length === 0) {
        setTimeout(() => setShowMoodPicker(true), 500);
      }
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  const onMood = async (mood: MoodDef) => {
    setState(prev => ({ ...prev, mood }));
    setShowMoodPicker(false);
    setMoodPicked(true);
    if (state.entryId) await onUpdateEntry(state.entryId, { moodLabel: mood.label, moodScore: mood.score });
  };

  const onFeedback = async (mid: string | undefined, t: "up" | "down") => {
    if (!mid) return;
    try { await sendFeedback(mid, t); } catch { /* ignore */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <button onClick={() => setShowPersonaSheet(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
          <span style={{ color: "var(--accent)" }}>{persona.icon}</span> {persona.name} <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
        </button>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{getSessionLabel(state.mode)}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}><X size={20} /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, maxWidth: 640, margin: "0 auto", width: "100%" }}>
        {state.messages.length === 0 ? (
          <div className="fade-in" style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", margin: "0 auto 16px" }}>{persona.icon}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12 }}>{new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
            <div style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.4, maxWidth: 340, margin: "0 auto" }}>{OPENING_PROMPTS[state.persona]}</div>
          </div>
        ) : state.messages.map((msg, i) => {
          const mp = findPersona(msg.persona ?? state.persona);
          return (
            <div key={msg.id ?? `m-${msg.timestamp}-${i}`} className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
              {msg.role === "assistant" && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--text-tertiary)" }}><span style={{ color: "var(--accent)" }}>{mp.icon}</span><span style={{ fontSize: 12 }}>{mp.name}</span></div>}
              <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.role === "user" ? "var(--accent-light)" : "var(--surface)", border: msg.role === "assistant" ? "1px solid var(--border)" : "none", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
              {msg.role === "assistant" && msg.content && (
                <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                  {[{ lbl: "Глубже", act: "deeper" }, { lbl: "Другой угол", act: "angle" }, { lbl: "Резюме", act: "summary" }].map(b => (
                    <button key={b.act} onClick={() => send(undefined, b.act)} disabled={isTyping} style={{ padding: "4px 10px", fontSize: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, color: "var(--text-secondary)", cursor: isTyping ? "default" : "pointer", opacity: isTyping ? 0.5 : 1 }}>{b.lbl}</button>
                  ))}
                  <div style={{ display: "flex", gap: 0, alignItems: "center", marginLeft: 4 }}>
                    <button onClick={() => onFeedback(msg.id, "up")} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}><ThumbsUp size={13} /></button>
                    <button onClick={() => onFeedback(msg.id, "down")} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}><ThumbsDown size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {isTyping && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><span style={{ color: "var(--accent)" }}>{persona.icon}</span><div style={{ display: "flex", gap: 4, padding: "10px 16px", ...cs.card }}>{[0,1,2].map(i => <div key={`d${i}`} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-tertiary)", animation: `pulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />)}</div></div>}
        {showMoodPicker && !moodPicked && (
          <div className="fade-in" style={{ padding: "12px 16px", ...cs.card, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Как ты себя чувствуешь?</div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              {MOODS.map(m => <button key={m.score} onClick={() => onMood(m)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: m.color, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>{m.icon}<span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{m.label}</span></button>)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: 640, margin: "0 auto" }}>
          <textarea ref={taRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}} placeholder="Начни писать..." rows={1} style={{ flex: 1, padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 20, color: "var(--text)", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.4, maxHeight: 120 }} />
          <button onClick={() => send()} disabled={!input.trim() || isTyping} style={{ width: 38, height: 38, borderRadius: "50%", background: input.trim() && !isTyping ? "var(--accent)" : "var(--border-light)", border: "none", color: input.trim() && !isTyping ? "#fff" : "var(--text-tertiary)", cursor: input.trim() && !isTyping ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Send size={16} /></button>
        </div>
      </div>

      {showPersonaSheet && (
        <dialog open onClick={() => setShowPersonaSheet(false)} style={{ position: "fixed", inset: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.2)", backdropFilter: "blur(2px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center", border: "none", padding: 0, margin: 0 }}>
          <div className="slide-up" onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "var(--surface)", borderRadius: "16px 16px 0 0", padding: 20, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Выбери персону</div>
            {PERSONAS.map(p => (
              <button key={p.id} onClick={() => { setState(prev => ({ ...prev, persona: p.id })); setShowPersonaSheet(false); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: state.persona === p.id ? "var(--accent-light)" : "transparent", border: `1px solid ${state.persona === p.id ? "var(--accent)" : "transparent"}`, borderRadius: 10, cursor: "pointer", color: "var(--text)", width: "100%", textAlign: "left", marginBottom: 4 }}>
                <span style={{ color: state.persona === p.id ? "var(--accent)" : "var(--text-tertiary)" }}>{p.icon}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{p.style}</div></div>
                {state.persona === p.id && <Check size={16} style={{ color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        </dialog>
      )}
    </div>
  );
}

// ============================================
// ENTRY DETAIL
// ============================================
function EntryScreen(props: Readonly<{ entry: EntryDetail; onBack: () => void; onDelete: () => void }>) {
  const { entry, onBack, onDelete } = props;
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ padding: "16px 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}><ChevronLeft size={18} /> Назад</button>
        <button onClick={() => setConfirmDel(true)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer" }}><Trash2 size={16} /></button>
      </div>
      <div style={{ paddingTop: 24, paddingBottom: 40 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>{entry.title ?? "Без заголовка"}</h1>
        <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>{new Date(entry.entryDate || entry.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</div>
        {entry.moodLabel && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, color: moodColor(entry.moodScore) }}>{moodIconNode(entry.moodScore)} {entry.moodLabel}</div>}
        <div style={{ marginTop: 24 }}>
          {entry.messages.map(msg => (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.role === "user" ? "var(--accent-light)" : "var(--surface)", border: msg.role === "assistant" ? "1px solid var(--border)" : "none", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, padding: 16, ...cs.card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 13, fontWeight: 500 }}><Brain size={14} style={{ color: "var(--accent)" }} /> AI-анализ</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>В записи прослеживается тема внутреннего диалога и поиска ясности.</div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 20 }}>Не заменяет профессиональную помощь</div>
      </div>

      {confirmDel && (
        <dialog open style={{ position: "fixed", inset: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.3)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, border: "none", margin: 0 }}>
          <div style={{ background: "var(--surface)", borderRadius: 16, padding: 24, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Удалить запись?</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>Это действие нельзя отменить. Все данные записи будут удалены.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDel(false)} style={{ flex: 1, padding: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "var(--text)" }}>Отмена</button>
              <button onClick={onDelete} style={{ flex: 1, padding: 10, background: "var(--danger)", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#fff" }}>Удалить</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

// ============================================
// HISTORY
// ============================================
function HistoryScreen(props: Readonly<{ entries: EntryListItem[]; onView: (e: EntryListItem) => void }>) {
  const { entries, onView } = props;
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>История</h1>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>{entries.length > 0 ? `${entries.length} записей` : "Пока нет записей"}</p>
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}><BookOpen size={32} style={{ color: "var(--text-tertiary)" }} /><div style={{ fontSize: 14, marginTop: 12, color: "var(--text-tertiary)" }}>Начни первую запись</div></div>
      ) : entries.map(e => (
        <button key={e.id} onClick={() => onView(e)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", ...cs.cardHover, width: "100%", textAlign: "left", marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: moodColor(e.moodScore), flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title ?? "Без заголовка"}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{new Date(e.entryDate || e.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}{" \u00B7 "}{(e.messages ?? []).length} сообщ.</div>
          </div>
          <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
        </button>
      ))}
    </div>
  );
}

// ============================================
// SETTINGS
// ============================================
function SettingsScreen(props: Readonly<{ profile: Profile | null; onUpdate: (d: Record<string, unknown>) => Promise<unknown> }>) {
  const { profile, onUpdate } = props;
  const [name, setName] = useState(profile?.name ?? "");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20 }}>Настройки</h1>
      <div style={{ marginBottom: 24 }}>
        <label htmlFor="sn" style={{ ...cs.label, marginBottom: 6, display: "block" }}>Имя</label>
        <input id="sn" value={name} onChange={e => setName(e.target.value)} onBlur={() => { if (name.trim() && name !== profile?.name) onUpdate({ name: name.trim() }); }} style={cs.input} />
      </div>
      <div style={{ ...cs.card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Sparkles size={16} style={{ color: "var(--accent)" }} /><span style={{ fontSize: 14, fontWeight: 500 }}>Астро-профиль</span></div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>Доступно в следующем обновлении.</p>
      </div>
      <div style={{ ...cs.card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Аккаунт</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{profile?.email}</div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>План: {profile?.plan === "paid" ? "Premium" : "Бесплатный"}</div>
      </div>
      <button style={{ width: "100%", padding: 12, background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "var(--danger)", fontSize: 14, cursor: "pointer", marginTop: 32 }}>Удалить аккаунт</button>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 8 }}>Все данные будут удалены безвозвратно</div>
    </div>
  );
}