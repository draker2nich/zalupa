"use client";

import { useState, useEffect, useRef } from "react";
import {
  Home, Clock, Settings, PenSquare, Sun, Moon, Sparkles,
  ChevronRight, ChevronDown, ChevronLeft, X, Send,
  ThumbsUp, ThumbsDown, Plus, Check, Flame, BookOpen,
  Star, Brain, Feather, Target, Heart, Briefcase, Sprout,
  AlertCircle, Eye, Frown, Meh, Minus, Smile, Laugh,
} from "lucide-react";

// ============================================
// TYPES
// ============================================
interface Persona {
  id: string;
  icon: React.ReactNode;
  name: string;
  style: string;
}

interface Mood {
  icon: React.ReactNode;
  label: string;
  score: number;
  color: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  persona?: string;
}

interface Entry {
  id: string;
  date: Date;
  title: string;
  mood: Mood | null;
  persona: string;
  mode: string;
  messages: ChatMsg[];
}

interface HabitItem {
  id: string;
  name: string;
  done: boolean;
}

interface IntentionItem {
  id: string;
  title: string;
}

// ============================================
// CONSTANTS
// ============================================
const PERSONAS: Persona[] = [
  { id: "mirror", icon: <Star size={18} />, name: "Mirror", style: "Сбалансированный и вдумчивый" },
  { id: "challenger", icon: <AlertCircle size={18} />, name: "Претендент", style: "Мягко бросает вызов" },
  { id: "sage", icon: <Sparkles size={18} />, name: "Мудрица", style: "Ясность через спокойное размышление" },
  { id: "gardener", icon: <Sprout size={18} />, name: "Садовница", style: "Метафоры природы и роста" },
  { id: "observer", icon: <Eye size={18} />, name: "Наблюдатель", style: "Нейтральный, отражает без оценок" },
];

const MOODS: Mood[] = [
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
  challenger: "Расскажи, что занимает твой ум — я помогу посмотреть под другим углом.",
  sage: "Найди минутку тишины... Что хочет быть замеченным прямо сейчас?",
  gardener: "Какое семя ты посадил сегодня? Или, может, что-то проросло?",
  observer: "Опиши свой день. Я послушаю.",
};

// ============================================
// SHARED STYLES
// ============================================
const s = {
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)" } as React.CSSProperties,
  cardHover: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-sm)", cursor: "pointer", transition: "all 0.15s" } as React.CSSProperties,
  btn: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", cursor: "pointer", transition: "all 0.15s", fontSize: 14 } as React.CSSProperties,
  btnAccent: { background: "var(--accent)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 500 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", fontSize: 14, outline: "none", fontFamily: "inherit" } as React.CSSProperties,
  label: { fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.5px" },
};

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [screen, setScreen] = useState<string>("onboarding");
  const [user, setUser] = useState({ name: "", goals: [] as string[], onboarded: false });
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);
  const [habits, setHabits] = useState<HabitItem[]>([
    { id: "1", name: "Медитация", done: false },
    { id: "2", name: "Чтение", done: false },
  ]);
  const [intentions, setIntentions] = useState<IntentionItem[]>([
    { id: "1", title: "Быть внимательным" },
  ]);

  useEffect(() => { if (user.onboarded) setScreen("home"); }, [user.onboarded]);
  const today = new Date();

  // Write screen is full-screen overlay
  if (screen === "write" && currentEntry) {
    return (
      <WriteScreen entry={currentEntry} setEntry={setCurrentEntry} user={user}
        onClose={(saved) => {
          if (saved && currentEntry.messages.length > 0) {
            setEntries([{ id: Date.now().toString(), date: new Date(), title: currentEntry.messages[0]?.content.slice(0, 60) + "...", mood: currentEntry.mood, persona: currentEntry.persona, mode: currentEntry.mode, messages: currentEntry.messages }, ...entries]);
          }
          setScreen("home");
        }} />
    );
  }

  if (screen === "onboarding") {
    return <Onboarding user={user} setUser={setUser} step={onboardingStep} setStep={setOnboardingStep} />;
  }

  // Main layout: sidebar (desktop) + bottom bar (mobile)
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar — desktop only */}
      <aside className="sidebar" style={{ width: 220, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 16px 12px", fontSize: 15, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.02em" }}>
          Psyche Mirror
        </div>
        <nav style={{ flex: 1, padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {[
            { id: "home", label: "Главная", icon: <Home size={18} /> },
            { id: "history", label: "История", icon: <Clock size={18} /> },
            { id: "settings", label: "Настройки", icon: <Settings size={18} /> },
          ].map(tab => {
            const active = screen === tab.id;
            return (
              <button key={tab.id} onClick={() => setScreen(tab.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", background: active ? "var(--surface-hover)" : "transparent", color: active ? "var(--text)" : "var(--text-secondary)", cursor: "pointer", fontSize: 14, fontWeight: active ? 500 : 400, width: "100%", textAlign: "left", transition: "all 0.15s" }}>
                {tab.icon} {tab.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 12 }}>
          <button onClick={() => { setCurrentEntry({ mode: "free", persona: "mirror", messages: [], mood: null }); setScreen("write"); }}
            style={{ ...s.btnAccent, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", width: "100%" }}>
            <PenSquare size={16} /> Новая запись
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {screen === "home" && (
          <HomeScreen user={user} entries={entries} habits={habits} setHabits={setHabits}
            intentions={intentions} setIntentions={setIntentions} today={today}
            onWrite={(mode: string) => { setCurrentEntry({ mode, persona: "mirror", messages: [], mood: null }); setScreen("write"); }}
            onViewEntry={(e: Entry) => { setViewingEntry(e); setScreen("entry"); }} />
        )}
        {screen === "entry" && viewingEntry && <EntryScreen entry={viewingEntry} onBack={() => setScreen("home")} />}
        {screen === "history" && <HistoryScreen entries={entries} onView={(e: Entry) => { setViewingEntry(e); setScreen("entry"); }} />}
        {screen === "settings" && <SettingsScreen user={user} setUser={setUser} />}
      </main>

      {/* Bottom bar — mobile only */}
      <nav className="bottom-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--surface)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-around", padding: "6px 0 env(safe-area-inset-bottom, 8px)", zIndex: 50 }}>
        {[
          { id: "home", label: "Главная", icon: <Home size={20} /> },
          { id: "history", label: "История", icon: <Clock size={20} /> },
          { id: "write", label: "", icon: <PenSquare size={20} />, isCenter: true },
          { id: "settings", label: "Ещё", icon: <Settings size={20} /> },
        ].map(tab => {
          if (tab.isCenter) return (
            <button key={tab.id} onClick={() => { setCurrentEntry({ mode: "free", persona: "mirror", messages: [], mood: null }); setScreen("write"); }}
              style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--accent)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: -10, boxShadow: "0 2px 10px rgba(139,124,246,0.35)" }}>
              {tab.icon}
            </button>
          );
          const active = screen === tab.id;
          return (
            <button key={tab.id} onClick={() => setScreen(tab.id)}
              style={{ background: "none", border: "none", color: active ? "var(--accent)" : "var(--text-tertiary)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 12px", fontSize: 10 }}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Responsive styles */}
      <style>{`
        .sidebar { display: none; }
        .bottom-bar { display: flex; }
        @media (min-width: 768px) {
          .sidebar { display: flex !important; }
          .bottom-bar { display: none !important; }
          main { padding-bottom: 0; }
        }
        @media (max-width: 767px) {
          main { padding-bottom: 72px; }
        }
      `}</style>
    </div>
  );
}

// ============================================
// ONBOARDING
// ============================================
function Onboarding({ user, setUser, step, setStep }: any) {
  const [name, setName] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [, forceUpdate] = useState(0);

  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? goals.length > 0 : time !== "";

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    forceUpdate(n => n + 1);
  }

  function toggleGoal(id: string) {
    setGoals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function selectTime(id: string) {
    setTime(id);
  }

  function next() {
    if (step === 0) { setUser((u: any) => ({ ...u, name })); setStep(1); }
    else if (step === 1) { setUser((u: any) => ({ ...u, goals })); setStep(2); }
    else if (step === 2) { setUser((u: any) => ({ ...u, preferredTime: time, onboarded: true })); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && canNext) next();
  }

  return (
    <div className="fade-in" style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px 24px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 48 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? "var(--accent)" : "var(--border)", transition: "all 0.3s" }} />
        ))}
      </div>
      <div style={{ flex: 1 }}>
        {step === 0 && (
          <div className="fade-in">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", marginBottom: 16 }}><Star size={20} /></div>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.02em" }}>Привет! Я Mirror</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 32, lineHeight: 1.5, fontSize: 14 }}>Твой дневник рефлексии. Как тебя зовут?</p>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              placeholder="Твоё имя"
              autoComplete="off"
              autoFocus
              style={s.input}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-tertiary)" }}>
              {name.length > 0 ? `Привет, ${name}!` : ""}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="fade-in">
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.02em" }}>Что хочешь исследовать?</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>Выбери одну или несколько тем</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {GOALS.map(g => {
                const sel = goals.includes(g.id);
                return (
                  <button key={g.id} onClick={() => toggleGoal(g.id)}
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
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6, letterSpacing: "-0.02em" }}>Когда удобнее рефлексировать?</h1>
            <p style={{ color: "var(--text-secondary)", marginBottom: 24, fontSize: 14 }}>Мы подстроим напоминания</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{ id: "morning", icon: <Sun size={18} />, label: "Утром" }, { id: "evening", icon: <Moon size={18} />, label: "Вечером" }, { id: "anytime", icon: <Clock size={18} />, label: "Когда захочу" }].map(t => (
                <button key={t.id} onClick={() => selectTime(t.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: time === t.id ? "var(--accent-light)" : "var(--surface)", border: `1px solid ${time === t.id ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, color: "var(--text)", cursor: "pointer", fontSize: 14, transition: "all 0.15s" }}>
                  <span style={{ color: time === t.id ? "var(--accent)" : "var(--text-tertiary)" }}>{t.icon}</span>
                  <span style={{ flex: 1 }}>{t.label}</span>
                  {time === t.id && <Check size={16} style={{ color: "var(--accent)" }} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={next} disabled={!canNext}
        style={{ width: "100%", padding: "12px", background: canNext ? "var(--accent)" : "var(--border-light)", color: canNext ? "#fff" : "var(--text-tertiary)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: canNext ? "pointer" : "default", marginTop: 32, transition: "all 0.15s" }}>
        {step === 2 ? "Начать" : "Дальше"}
      </button>
    </div>
  );
}

// ============================================
// HOME SCREEN
// ============================================
function HomeScreen({ user, entries, habits, setHabits, intentions, setIntentions, today, onWrite, onViewEntry }: any) {
  const dayOfWeek = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"][today.getDay()];
  const dateStr = `${today.getDate()} ${MONTHS_RU[today.getMonth()]}`;
  const streak = Math.min(entries.length, 7);
  const [addingHabit, setAddingHabit] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const completedHabits = habits.filter((h: HabitItem) => h.done).length;

  const getWeekDays = () => {
    const d = new Date(today); const day = d.getDay(); const off = day === 0 ? -6 : 1 - day;
    const mon = new Date(d); mon.setDate(d.getDate() + off);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(mon); date.setDate(mon.getDate() + i);
      return { dayNum: date.getDate(), label: DAYS_RU[i], hasEntry: entries.some((e: Entry) => new Date(e.date).toDateString() === date.toDateString()), isToday: date.toDateString() === today.toDateString(), isFuture: date > today };
    });
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>{dayOfWeek}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{dateStr}</h1>
          {streak > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--accent-light)", padding: "4px 10px", borderRadius: 20, fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
              <Flame size={14} /> {streak}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
          <Star size={12} /> Луна в Рыбах — хороший день для рефлексии
        </div>
      </div>

      {/* Week strip */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        {getWeekDays().map((d, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: d.isFuture ? 0.3 : 1 }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{d.label}</span>
            <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: d.isToday ? 600 : 400, background: d.hasEntry ? "var(--accent)" : "transparent", color: d.hasEntry ? "#fff" : d.isToday ? "var(--accent)" : "var(--text-tertiary)", border: d.isToday && !d.hasEntry ? "2px solid var(--accent)" : "1px solid transparent" }}>
              {d.hasEntry ? <Check size={14} /> : d.dayNum}
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Записей", value: entries.length, icon: <BookOpen size={14} /> },
          { label: "Streak", value: streak, icon: <Flame size={14} /> },
          { label: "Слов", value: entries.reduce((a: number, e: Entry) => a + e.messages.filter(m => m.role === "user").reduce((b, m) => b + m.content.split(/\s+/).length, 0), 0), icon: <Feather size={14} /> },
        ].map(st => (
          <div key={st.label} style={{ ...s.card, padding: "14px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "var(--text-tertiary)" }}>{st.icon}</span>
              <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>{st.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* CTA Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 24 }}>
        {[{ mode: "morning", icon: <Sun size={20} />, title: "Утренняя рефлексия", sub: "Задай намерение на день" },
          { mode: "evening", icon: <Moon size={20} />, title: "Вечерняя рефлексия", sub: "Что было важным?" }].map(c => (
          <button key={c.mode} onClick={() => onWrite(c.mode)}
            style={{ ...s.cardHover, padding: 16, textAlign: "left", width: "100%" }}>
            <div style={{ color: "var(--text-tertiary)", marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.4 }}>{c.sub}</div>
          </button>
        ))}
      </div>

      {/* Daily insight */}
      <button onClick={() => onWrite("free")}
        style={{ ...s.cardHover, padding: 16, width: "100%", textAlign: "left", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Sparkles size={14} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Для вас</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Что ты чувствуешь прямо сейчас?</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>Иногда просто назвать чувство — уже шаг к ясности.</div>
      </button>

      {/* Habits */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Цели на сегодня</span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{completedHabits}/{habits.length}</span>
        </div>
        <div style={{ height: 3, background: "var(--border-light)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${habits.length > 0 ? (completedHabits / habits.length) * 100 : 0}%`, background: "var(--accent)", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        {habits.map((h: HabitItem) => (
          <button key={h.id} onClick={() => setHabits(habits.map((x: HabitItem) => x.id === h.id ? { ...x, done: !x.done } : x))}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", ...s.card, cursor: "pointer", width: "100%", textAlign: "left", marginBottom: 6 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${h.done ? "var(--accent)" : "var(--border)"}`, background: h.done ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}>
              {h.done && <Check size={12} color="#fff" />}
            </div>
            <span style={{ fontSize: 14, textDecoration: h.done ? "line-through" : "none", color: h.done ? "var(--text-tertiary)" : "var(--text)" }}>{h.name}</span>
          </button>
        ))}
        {addingHabit ? (
          <input value={newHabit} onChange={e => setNewHabit(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newHabit.trim()) { setHabits([...habits, { id: Date.now().toString(), name: newHabit.trim(), done: false }]); setNewHabit(""); setAddingHabit(false); }}} onBlur={() => setAddingHabit(false)} placeholder="Новая привычка..." autoFocus style={{ ...s.input, marginTop: 4 }} />
        ) : (
          <button onClick={() => setAddingHabit(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: 13 }}><Plus size={14} /> Добавить</button>
        )}
      </div>

      {/* Recent entries */}
      {entries.length > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Последние записи</div>
          {entries.slice(0, 5).map((e: Entry) => (
            <button key={e.id} onClick={() => onViewEntry(e)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", ...s.cardHover, width: "100%", textAlign: "left", marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.mood?.color || "var(--text-tertiary)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{new Date(e.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
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
// WRITE SCREEN
// ============================================
function WriteScreen({ entry, setEntry, user, onClose }: any) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPersonaSheet, setShowPersonaSheet] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [moodPicked, setMoodPicked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const persona = PERSONAS.find(p => p.id === entry.persona) || PERSONAS[0];
  const openingPrompt = OPENING_PROMPTS[entry.persona];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [entry.messages, isTyping]);

  const sendMessage = async (text?: string, action?: string) => {
    const content = text || input.trim();
    if (!content && !action) return;
    const updatedMessages = action ? [...entry.messages] : [...entry.messages, { role: "user" as const, content, timestamp: Date.now() }];
    setEntry({ ...entry, messages: updatedMessages });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: action ? undefined : content, personaId: entry.persona, sessionMode: entry.mode, action, userName: user.name || "друг", messages: updatedMessages.map((m: ChatMsg) => ({ role: m.role, content: m.content })) }),
      });
      if (!response.body) throw new Error("No body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      setEntry((prev: any) => ({ ...prev, messages: [...updatedMessages, { role: "assistant", content: "", timestamp: Date.now(), persona: entry.persona }] }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n").filter(l => l.startsWith("data: "))) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "delta") {
              aiContent += data.text;
              setEntry((prev: any) => { const msgs = [...prev.messages]; msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: aiContent }; return { ...prev, messages: msgs }; });
            }
          } catch {}
        }
      }
      if (!moodPicked && updatedMessages.filter((m: ChatMsg) => m.role === "assistant").length === 0) setTimeout(() => setShowMoodPicker(true), 500);
    } catch (err) { console.error(err); } finally { setIsTyping(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <button onClick={() => setShowPersonaSheet(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
          <span style={{ color: "var(--accent)" }}>{persona.icon}</span> {persona.name} <ChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
        </button>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{entry.mode === "morning" ? "Утро" : entry.mode === "evening" ? "Вечер" : "Свободная запись"}</span>
        <button onClick={() => onClose(true)} style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}><X size={20} /></button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, maxWidth: 640, margin: "0 auto", width: "100%" }}>
        {entry.messages.length === 0 ? (
          <div className="fade-in" style={{ textAlign: "center", paddingTop: 80 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", margin: "0 auto 16px" }}>{persona.icon}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 12 }}>{new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
            <div style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.4, maxWidth: 340, margin: "0 auto", color: "var(--text)" }}>{openingPrompt}</div>
          </div>
        ) : (
          entry.messages.map((msg: ChatMsg, i: number) => (
            <div key={i} className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
              {msg.role === "assistant" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--text-tertiary)" }}>
                  <span style={{ color: "var(--accent)" }}>{PERSONAS.find(p => p.id === (msg.persona || entry.persona))?.icon}</span>
                  <span style={{ fontSize: 12 }}>{PERSONAS.find(p => p.id === (msg.persona || entry.persona))?.name}</span>
                </div>
              )}
              <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.role === "user" ? "var(--accent-light)" : "var(--surface)", border: msg.role === "assistant" ? "1px solid var(--border)" : "none", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "var(--text)" }}>
                {msg.content}
              </div>
              {msg.role === "assistant" && msg.content && (
                <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                  {[{ label: "Глубже", action: "deeper" }, { label: "Другой угол", action: "angle" }, { label: "Резюме", action: "summary" }].map(btn => (
                    <button key={btn.action} onClick={() => sendMessage(undefined, btn.action)} disabled={isTyping}
                      style={{ padding: "4px 10px", fontSize: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, color: "var(--text-secondary)", cursor: isTyping ? "default" : "pointer", opacity: isTyping ? 0.5 : 1, transition: "all 0.15s" }}>
                      {btn.label}
                    </button>
                  ))}
                  <div style={{ display: "flex", gap: 0, alignItems: "center", marginLeft: 4 }}>
                    <button style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}><ThumbsUp size={13} /></button>
                    <button style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}><ThumbsDown size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {isTyping && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ color: "var(--accent)" }}>{persona.icon}</span>
            <div style={{ display: "flex", gap: 4, padding: "10px 16px", ...s.card }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-tertiary)", animation: `pulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />)}
            </div>
          </div>
        )}
        {showMoodPicker && !moodPicked && (
          <div className="fade-in" style={{ padding: "12px 16px", ...s.card, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Как ты себя чувствуешь?</div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              {MOODS.map(m => (
                <button key={m.score} onClick={() => { setEntry({ ...entry, mood: m }); setShowMoodPicker(false); setMoodPicked(true); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, color: m.color, transition: "transform 0.1s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {m.icon}
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", maxWidth: 640, margin: "0 auto" }}>
          <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}} placeholder="Начни писать..." rows={1}
            style={{ flex: 1, padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 20, color: "var(--text)", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", lineHeight: 1.4, maxHeight: 120 }} />
          <button onClick={() => sendMessage()} disabled={!input.trim() || isTyping}
            style={{ width: 38, height: 38, borderRadius: "50%", background: input.trim() && !isTyping ? "var(--accent)" : "var(--border-light)", border: "none", color: input.trim() && !isTyping ? "#fff" : "var(--text-tertiary)", cursor: input.trim() && !isTyping ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Persona sheet */}
      {showPersonaSheet && (
        <div onClick={() => setShowPersonaSheet(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(2px)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div className="slide-up" onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "var(--surface)", borderRadius: "16px 16px 0 0", padding: 20, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
            <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 12 }}>Выбери персону</div>
            {PERSONAS.map(p => (
              <button key={p.id} onClick={() => { setEntry((prev: any) => ({ ...prev, persona: p.id })); setShowPersonaSheet(false); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: entry.persona === p.id ? "var(--accent-light)" : "transparent", border: `1px solid ${entry.persona === p.id ? "var(--accent)" : "transparent"}`, borderRadius: 10, cursor: "pointer", color: "var(--text)", width: "100%", textAlign: "left", marginBottom: 4, transition: "all 0.15s" }}>
                <span style={{ color: entry.persona === p.id ? "var(--accent)" : "var(--text-tertiary)" }}>{p.icon}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div><div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{p.style}</div></div>
                {entry.persona === p.id && <Check size={16} style={{ color: "var(--accent)" }} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ENTRY DETAIL
// ============================================
function EntryScreen({ entry, onBack }: { entry: Entry; onBack: () => void }) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ padding: "16px 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 }}><ChevronLeft size={18} /> Назад</button>
      </div>
      <div style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{entry.title}</h1>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>{new Date(entry.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</div>
          {entry.mood && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, color: entry.mood.color }}>{entry.mood.icon} {entry.mood.label}</div>
          )}
        </div>
        {entry.messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: msg.role === "user" ? "var(--accent-light)" : "var(--surface)", border: msg.role === "assistant" ? "1px solid var(--border)" : "none", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 24, padding: 16, ...s.card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 13, fontWeight: 500 }}><Brain size={14} style={{ color: "var(--accent)" }} /> AI-анализ</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>В записи прослеживается тема внутреннего диалога и поиска ясности.</div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 20 }}>Не заменяет профессиональную помощь</div>
      </div>
    </div>
  );
}

// ============================================
// HISTORY
// ============================================
function HistoryScreen({ entries, onView }: any) {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 4 }}>История</h1>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 20 }}>{entries.length > 0 ? `${entries.length} записей` : "Пока нет записей"}</p>
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <BookOpen size={32} style={{ color: "var(--text-tertiary)" }} />
          <div style={{ fontSize: 14, marginTop: 12, color: "var(--text-tertiary)" }}>Начни первую запись</div>
        </div>
      ) : entries.map((e: Entry) => (
        <button key={e.id} onClick={() => onView(e)}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px", ...s.cardHover, width: "100%", textAlign: "left", marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.mood?.color || "var(--text-tertiary)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{new Date(e.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} · {e.messages.length} сообщ.</div>
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
function SettingsScreen({ user, setUser }: any) {
  const [name, setName] = useState(user.name);
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 20 }}>Настройки</h1>
      <div style={{ marginBottom: 24 }}>
        <label style={{ ...s.label, marginBottom: 6, display: "block" }}>Имя</label>
        <input value={name} onChange={e => setName(e.target.value)} onBlur={() => setUser((u: any) => ({ ...u, name }))} style={s.input} />
      </div>
      <div style={{ ...s.card, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><Sparkles size={16} style={{ color: "var(--accent)" }} /><span style={{ fontSize: 14, fontWeight: 500 }}>Астро-профиль</span></div>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>Доступно в следующем обновлении.</p>
      </div>
      <button style={{ width: "100%", padding: 12, background: "transparent", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "var(--danger)", fontSize: 14, cursor: "pointer", marginTop: 32 }}>Удалить аккаунт</button>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 8 }}>Все данные будут удалены безвозвратно</div>
    </div>
  );
}