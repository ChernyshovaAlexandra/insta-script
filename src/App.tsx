import { useEffect, useMemo, useState } from 'react'
import {
  VIRALITY_WEIGHTS,
  STOP_PHRASES,
  CONTRAST_MARKERS,
  SECOND_PERSON,
  IMPERATIVE_ENDINGS,
  IMPERATIVE_WORDS,
  OPEN_LOOP_WORDS,
} from './config/virality'

// Настраиваемые ограничения для хука (0–2 сек)
const HOOK_MIN = 15
const HOOK_MAX = 80
const HOOK_IDEAL_MIN = 25
const HOOK_IDEAL_MAX = 55

// Эмоциональные слова/маркеры для проверки насыщенности
const EMO_WORDS = [
  'шок', 'секрет', 'взрыв', 'взрывной', 'срочно', 'жестк', 'жёстк', 'ошибк',
  'фатальн', 'критич', 'супер', 'мощн', 'вау', 'невероят', 'опас', 'больно',
  'провал', 'катастроф', 'разрыв', '🔥', '💥', '😱'
]

type HookType = 'fact' | 'mistake' | ''
type RuleKey = 'hook' | 'problem' | 'promise' | 'body' | 'climax' | 'outro'

type BlockScore = { pts: number; max: number; tips: string[] }
type Blocks = Record<RuleKey, BlockScore>

type Rule = { title: string; subtitle: string; items: string[]; examples?: string[] }

const RULES: Record<RuleKey, Rule> = {
  hook: {
    title: '0–2 сек — Главный хук',
    subtitle: 'Задача: мгновенно захватить внимание (факт/ошибка).',
    items: [
      'Тип: факт или ошибка (обязательно).',
      `Оптимум: ${HOOK_IDEAL_MIN}–${HOOK_IDEAL_MAX} симв. (допустимо: ${HOOK_MIN}–${HOOK_MAX}).`,
      'Добавьте цифру/%, эмо-слово/эмодзи, вопрос/восклицание.',
      'Говорите о результате зрителя, избегайте «я/мы» в начале.',
    ],
    examples: ['3 ошибки, из‑за которых …', 'Факт: 68% …?'],
  },
  problem: {
    title: '2–5 сек — Суть проблемы',
    subtitle: 'Одним предложением объясните, почему важно досмотреть.',
    items: [
      'Одно предложение, ровно одна мысль.',
      'Коротко и конкретно (≤ 140 символов).',
      'Формулируйте из боли аудитории, без общих слов.',
    ],
  },
  promise: {
    title: '5–8 сек — Обещание решения',
    subtitle: 'Дайте зрителю конкретику результата.',
    items: [
      'Конкретика: цифры, сроки, «в N шагах», понятный результат.',
      'Ясный глагол: «покажу/узнаешь/получишь/сделаешь».',
      'Без воды — что именно получит зритель.',
    ],
  },
  body: {
    title: '8–28 сек — Основная часть',
    subtitle: '2–5 тезисов, динамично и по делу.',
    items: [
      '2–5 тезисов, начинайте строки с «-».',
      '40–120 символов на строку, один глагол — один шаг.',
      '1–2 эмо‑усилителя допустимы (слово‑маркер/эмодзи).',
      'Динамика: повелительное наклонение, минимум вводных слов.',
    ],
  },
  climax: {
    title: '28–34 сек — Кульминация',
    subtitle: 'Подчеркните главный инсайт/результат.',
    items: ['Вывод/инсайт/результат: «главное/итог/секрет».', 'Одна сильная фраза, без новых идей.'],
  },
  outro: {
    title: '34–40 сек — Мини‑вывод',
    subtitle: 'Короткое резюме + мягкий CTA.',
    items: [
      'Коротко подведите итог одной фразой.',
      'Добавьте мягкий CTA: «Сохраните/подпишитесь/напишите комментарий».',
    ],
  },
}

type FormState = {
  hookType: HookType
  hook: string
  problem: string
  promise: string
  body: string
  climax: string
  outro: string
}

const empty: FormState = {
  hookType: '',
  hook: '',
  problem: '',
  promise: '',
  body: '',
  climax: '',
  outro: '',
}

const STORAGE_KEY = 'reelsFormV1'

export default function App() {
  const [form, setForm] = useState<FormState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? { ...empty, ...JSON.parse(raw) } : empty
    } catch {
      return empty
    }
  })
  const [copied, setCopied] = useState(false)
  const [openRules, setOpenRules] = useState<RuleKey | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  const hookLen = form.hook.trim().length
  const hookValid = hookLen >= HOOK_MIN && hookLen <= HOOK_MAX
  const typeValid = form.hookType === 'fact' || form.hookType === 'mistake'
  const allFilled = [form.hook, form.problem, form.promise, form.body, form.climax, form.outro].every(
    (s) => s.trim().length > 0,
  )

  const canCopy = hookValid && typeValid && allFilled

  const errors = useMemo(() => {
    const list: string[] = []
    if (!typeValid) list.push('Выберите тип хука: факт или ошибка')
    if (!hookValid)
      list.push(`Длина хука: ${HOOK_MIN}–${HOOK_MAX} символов (сейчас ${hookLen})`)
    if (!allFilled) list.push('Заполните все поля')
    return list
  }, [typeValid, hookValid, hookLen, allFilled])

  const script = useMemo(() => compileScript(form), [form])
  const virality = useMemo(() => computeVirality(form), [form])
  const paragraphs = useMemo(() => compileParagraphs(form), [form])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setCopied(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(script)
    setCopied(true)
  }

  function reset() {
    setForm(empty)
    setCopied(false)
  }
  function open(key: RuleKey) { setOpenRules(key) }
  function close() { setOpenRules(null) }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="title">Конструктор вирусного Reels</h1>
          <p className="subtitle">Один экран. Введите текст для каждого тайм-блока и получите готовый сценарий.</p>
        </div>
      </header>

      <section className="panel">
        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <div className="row">
            <div className="label">
              <span className="time">0–2 сек</span>
              <span>Главный хук (обязательно факт или ошибка)</span>
              <span className="spacer" />
              <button className="icon-btn" type="button" aria-label="Правила хука" onClick={() => open('hook')}>i</button>
            </div>
            <div className="radio-wrap input" role="group" aria-label="Тип хука">
              <label style={{ marginRight: 12 }}>
                <input
                  type="radio"
                  name="hookType"
                  checked={form.hookType === 'fact'}
                  onChange={() => update('hookType', 'fact')}
                />{' '}
                Факт
              </label>
              <label>
                <input
                  type="radio"
                  name="hookType"
                  checked={form.hookType === 'mistake'}
                  onChange={() => update('hookType', 'mistake')}
                />{' '}
                Ошибка
              </label>
            </div>
            <textarea
              className={`textarea ${hookValid ? '' : 'invalid'}`}
              rows={2}
              placeholder={`Короткий сильный хук. ${HOOK_MIN}–${HOOK_MAX} символов.`}
              value={form.hook}
              maxLength={HOOK_MAX}
              onChange={(e) => update('hook', e.target.value)}
            />
            <div className="counter">
              <span className={hookValid ? 'ok' : 'warning'}>
                {hookValid ? 'Ок' : `Нужно ${HOOK_MIN}–${HOOK_MAX} символов`}
              </span>
              <span>
                {hookLen}/{HOOK_MAX}
              </span>
            </div>
          </div>

          <div className="row">
            <div className="label">
              <span className="time">2–5 сек</span>
              <span>Суть проблемы (одно предложение)</span>
              <span className="spacer" />
              <button className="icon-btn" type="button" aria-label="Правила блока: проблема" onClick={() => open('problem')}>i</button>
            </div>
            <textarea
              className="textarea"
              rows={2}
              placeholder="Одно предложение, почему важно досмотреть дальше"
              value={form.problem}
              onChange={(e) => update('problem', e.target.value)}
            />
          </div>

          <div className="row">
            <div className="label">
              <span className="time">5–8 сек</span>
              <span>Обещание конкретного решения</span>
              <span className="spacer" />
              <button className="icon-btn" type="button" aria-label="Правила блока: обещание" onClick={() => open('promise')}>i</button>
            </div>
            <textarea
              className="textarea"
              rows={2}
              placeholder="Что именно человек получит к концу видео"
              value={form.promise}
              onChange={(e) => update('promise', e.target.value)}
            />
          </div>

          <div className="row">
            <div className="label">
              <span className="time">8–28 сек</span>
              <span>Основная часть</span>
              <span className="spacer" />
              <button className="icon-btn" type="button" aria-label="Правила блока: основная часть" onClick={() => open('body')}>i</button>
            </div>
            <textarea
              className="textarea"
              rows={6}
              placeholder="Короткие, быстрые пункты. 2–4 тезиса, минимум воды."
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
            />
            <p className="hint">Совет: дробите на строки, держите темп.</p>
          </div>

          <div className="row">
            <div className="label">
              <span className="time">28–34 сек</span>
              <span>Кульминационный пункт</span>
              <span className="spacer" />
              <button className="icon-btn" type="button" aria-label="Правила блока: кульминация" onClick={() => open('climax')}>i</button>
            </div>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Конкретный результат/инсайт/переломный момент"
              value={form.climax}
              onChange={(e) => update('climax', e.target.value)}
            />
          </div>

          <div className="row">
            <div className="label">
              <span className="time">34–40 сек</span>
              <span>Мини‑вывод</span>
              <span className="spacer" />
              <button className="icon-btn" type="button" aria-label="Правила блока: мини-вывод" onClick={() => open('outro')}>i</button>
            </div>
            <textarea
              className="textarea"
              rows={2}
              placeholder="Короткое резюме + мягкий CTA"
              value={form.outro}
              onChange={(e) => update('outro', e.target.value)}
            />
          </div>

          {errors.length > 0 && (
            <div className="errors">
              <strong>Проверьте форму:</strong>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="actions">
            <button className="btn primary" onClick={copy} disabled={!canCopy} type="button">
              {copied ? 'Скопировано ✓' : 'Скопировать сценарий'}
            </button>
            <button className="btn" onClick={reset} type="button">
              Сбросить
            </button>
          </div>
        </form>
      </section>

      <aside className="sidebar">
        <section className="panel">
          <div className="label" style={{ marginBottom: 8 }}>
            <span className="time">Итог</span>
            <span>Без тайм‑кодов, абзац на блок</span>
          </div>
          <div className="preview">
            {paragraphs.map((p) => {
              const bs = virality.blocks?.[p.key]
              const ratio = bs ? (bs.max > 0 ? bs.pts / bs.max : 0) : 0
              const status = ratio >= 0.75 ? 'good' : ratio >= 0.45 ? 'warn' : 'bad'
              const tips = (bs?.tips || [])
              const title = status === 'good' || tips.length === 0 ? undefined : `Что улучшить:\n- ${tips.join('\n- ')}`
              return (
                <div key={p.key} className={`hl hl-${status}`} title={title}>
                  <div className="para">{p.text}</div>
                </div>
              )
            })}
          </div>
        </section>
      </aside>

      <section className="panel full">
        <div className="score-head">
          <div className="label" style={{ gap: 8 }}>
            <span className="time">Оценка</span>
            <span className="score-title">Виральность: <span className="badge">{virality.level}</span></span>
          </div>
          <div className="score-value">{virality.score}/100</div>
        </div>
        <div className="meter" aria-label="Оценка виральности">
          <div
            className="meter-fill"
            style={{ width: `${virality.score}%` }}
          />
        </div>
        {virality.suggestions.length > 0 && (
          <div className="suggestions">
            <div className="label" style={{ marginBottom: 4 }}>
              <span className="time">Подсказки</span>
              <span>Как усилить ролик</span>
            </div>
            <ul>
              {virality.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {openRules && (
        <div className="modal-overlay" onClick={close} role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="modal-title">{RULES[openRules!].title}</h3>
              <p className="modal-sub">{RULES[openRules!].subtitle}</p>
            </div>
            <div className="modal-body">
              <ul>
                {RULES[openRules!].items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
              {RULES[openRules!].examples && RULES[openRules!].examples!.length > 0 && (
                <div style={{ marginTop: 10 }} className="hint">
                  Примеры:
                  <ul>
                    {RULES[openRules!].examples!.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="close-btn" type="button" onClick={close}>Понятно</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function compileScript(f: FormState) {
  const normalizeParagraph = (s: string) =>
    s
      .split(/\n+/)
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .join('\n')

  const paras = [f.hook, f.problem, f.promise, f.body, f.climax, f.outro]
    .map((p) => normalizeParagraph(p.trim()))
    .filter(Boolean)

  return paras.join('\n\n')
}

function compileParagraphs(f: FormState): Array<{ key: RuleKey; text: string }> {
  const normalizeParagraph = (s: string) =>
    s
      .split(/\n+/)
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .join('\n')

  const entries: Array<[RuleKey, string]> = [
    ['hook', f.hook],
    ['problem', f.problem],
    ['promise', f.promise],
    ['body', f.body],
    ['climax', f.climax],
    ['outro', f.outro],
  ]

  return entries
    .map(([k, v]) => ({ key: k, text: normalizeParagraph(v.trim()) }))
    .filter((x) => x.text.length > 0)
}

function computeVirality(f: FormState) {
  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n))
  const len = (s: string) => s.trim().length
  const sentences = (s: string) => s.split(/[.!?]+/).filter((x) => x.trim().length > 0).length
  const hasDigits = (s: string) => /\d/.test(s)
  const has = (s: string, words: string[]) => {
    const lc = s.toLowerCase()
    return words.some((w) => lc.includes(w))
  }
  const lines = (s: string) => s.split(/\n+/).map((x) => x.trim()).filter(Boolean)
  const words = (s: string) => s.toLowerCase().replace(/[.,!?;:()"'\[\]]+/g, ' ').split(/\s+/).filter(Boolean)
  const bigrams = (arr: string[]) => arr.slice(0, -1).map((_, i) => arr[i] + ' ' + arr[i + 1])
  const unique = <T,>(arr: T[]) => Array.from(new Set(arr))
  const countMatches = (s: string, list: string[]) => list.reduce((acc, w) => acc + (s.toLowerCase().includes(w) ? 1 : 0), 0)
  const countRegex = (s: string, re: RegExp) => (s.match(re) || []).length
  // Простая проверка эмодзи
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu
  const countEmojis = (s: string) => countRegex(s, emojiRe)
  const countPunct = (s: string) => countRegex(s, /[!?]/g)
  const isUpper = (str: string) => str === str.toUpperCase()
  const capsRatio = (w: string) => {
    const letters = w.replace(/[^A-Za-zА-Яа-яЁё]/g, '')
    if (letters.length < 1) return 0
    const upp = letters.split('').filter((c) => /[A-ZА-ЯЁ]/.test(c)).length
    return upp / letters.length
  }
  const isImperativeLine = (s: string) => {
    const t = s.replace(/^[-•—]\s*/, '').trim()
    if (!t) return false
    const first = t.split(/\s+/)[0]
    if (!first) return false
    const lower = first.toLowerCase()
    if (IMPERATIVE_WORDS.some((w) => lower.startsWith(w))) return true
    return IMPERATIVE_ENDINGS.some((e) => lower.endsWith(e))
  }

  let score = 0
  const suggestions: string[] = []
  const blockTips: Record<RuleKey, string[]> = {
    hook: [],
    problem: [],
    promise: [],
    body: [],
    climax: [],
    outro: [],
  }
  const addTip = (k: RuleKey, msg: string) => {
    suggestions.push(msg)
    blockTips[k].push(msg)
  }

  // Hook (0–2 сек): 35 баллов
  const hLen = len(f.hook)
  let hookLenPts = 0
  if (hLen > 0) {
    if (hLen < HOOK_MIN || hLen > HOOK_MAX) {
      hookLenPts = 0
      suggestions.push(`Сделайте хук ${HOOK_IDEAL_MIN}–${HOOK_IDEAL_MAX} символов, сейчас ${hLen}.`)
    } else if (hLen >= HOOK_IDEAL_MIN && hLen <= HOOK_IDEAL_MAX) {
      hookLenPts = 25
    } else if (hLen < HOOK_IDEAL_MIN) {
      hookLenPts = clamp(((hLen - HOOK_MIN) / (HOOK_IDEAL_MIN - HOOK_MIN)) * 25, 0, 25)
      suggestions.push(`Хук короче оптимума (${HOOK_IDEAL_MIN}–${HOOK_IDEAL_MAX}). Усильте формулировку.`)
    } else if (hLen > HOOK_IDEAL_MAX) {
      hookLenPts = clamp(((HOOK_MAX - hLen) / (HOOK_MAX - HOOK_IDEAL_MAX)) * 25, 0, 25)
      suggestions.push('Сделайте хук компактнее — режьте до сути.')
    }
  } else {
    addTip('hook', 'Добавьте сильный хук в первые 2 секунды.')
  }
  let hookTypePts = f.hookType ? 5 : 0
  if (!f.hookType) addTip('hook', 'Укажите тип хука: факт или ошибка.')
  const hookPatternPts = hasDigits(f.hook) || /[!?]/.test(f.hook) ? 3 : 0
  if (!hookPatternPts) addTip('hook', 'Добавьте цифру или сильную формулировку в хук (%, ?!, «3 шага»).')
  const hookEmoPts = has(f.hook, EMO_WORDS) ? 2 : 0
  if (!hookEmoPts) addTip('hook', 'Добавьте эмоциональный маркер в хук: «шок/секрет/взрывной», эмодзи 🔥/💥.')
  const hookPts = hookLenPts + hookTypePts + hookPatternPts + hookEmoPts
  score += hookPts

  // Problem (2–5 сек): 10 баллов
  let problemPts = 0
  if (len(f.problem) > 0) {
    const pLen = len(f.problem)
    problemPts += pLen <= 140 ? 6 : clamp((240 - pLen) / 100, 0, 6)
    problemPts += sentences(f.problem) <= 1 ? 4 : 0
    if (sentences(f.problem) > 1) addTip('problem', 'Суть проблемы — одним предложением.')
    if (pLen > 140) addTip('problem', 'Сделайте формулировку проблемы короче и конкретнее.')
  } else {
    addTip('problem', 'Коротко опишите, почему важно досмотреть дальше (2–5 сек).')
  }
  score += problemPts

  // Promise (5–8 сек): 15 баллов
  let promisePts = 0
  if (len(f.promise) > 0) {
    const prLen = len(f.promise)
    promisePts += prLen <= 160 ? 6 : clamp((260 - prLen) / 100, 0, 6)
    const promiseKeywords = ['шаг', 'секунд', 'минут', 'конкрет', 'без', 'сразу']
    promisePts += hasDigits(f.promise) || has(f.promise, promiseKeywords) ? 6 : 0
    promisePts += has(f.promise, ['покажу', 'узнаешь', 'получишь', 'дам']) ? 3 : 0
    if (!(hasDigits(f.promise) || has(f.promise, promiseKeywords))) {
      addTip('promise', 'Сделайте обещание конкретным: цифра/метрика/«в 3 шага».')
    }
  } else {
    addTip('promise', 'Дайте конкретное обещание результата (5–8 сек).')
  }
  score += promisePts

  // Body (8–28 сек): 20 баллов
  let bodyPts = 0
  if (len(f.body) > 0) {
    const ls = lines(f.body)
    const n = ls.length
    bodyPts += n >= 2 && n <= 5 ? 10 : clamp(10 - Math.abs((n || 1) - 3) * 3, 0, 10)
    const avg = ls.length ? ls.reduce((a, b) => a + b.length, 0) / n : len(f.body)
    if (avg >= 40 && avg <= 120) bodyPts += 5
    else addTip('body', 'Дробите основную часть на 2–5 коротких строк (40–120 симв.).')
    const hasBullets = /^[-•—]/m.test(f.body)
    bodyPts += hasBullets ? 3 : 0
    if (!hasBullets) addTip('body', 'Добавьте маркеры в основной части: начинайте строки с “-”.')
    const hasEmo = has(f.body, EMO_WORDS)
    bodyPts += hasEmo ? 2 : 0
    if (!hasEmo) addTip('body', 'Добавьте 1–2 эмоциональных усилителя в основной части (слова‑маркеры/эмодзи).')
  } else {
    addTip('body', 'Раскройте 2–4 тезиса в основной части (8–28 сек).')
  }
  score += bodyPts

  // Climax (28–34 сек): 10 баллов
  let climaxPts = 0
  if (len(f.climax) > 0) {
    const clLen = len(f.climax)
    climaxPts += clLen <= 160 ? 5 : clamp((240 - clLen) / 80, 0, 5)
    climaxPts += has(f.climax, ['итог', 'результат', 'секрет', 'главное', 'самое важное', 'вывод']) ? 5 : 0
    if (!has(f.climax, ['итог', 'результат', 'секрет', 'главное', 'самое важное', 'вывод']))
      addTip('climax', 'В кульминации подчеркните результат/инсайт: «вывод», «итог».')
  } else {
    addTip('climax', 'Добавьте кульминационный пункт (28–34 сек) — главный инсайт/результат.')
  }
  score += climaxPts

  // Outro (34–40 сек): 10 баллов
  let outroPts = 0
  if (len(f.outro) > 0) {
    const oLen = len(f.outro)
    const ctas = ['подпиш', 'лайк', 'сохран', 'коммент', 'напиши', 'пиши', 'репост', 'отправь', 'смотри описание', 'ссылка']
    const hasCta = has(f.outro, ctas)
    outroPts += hasCta ? 7 : 0
    outroPts += oLen <= 120 ? 3 : clamp((200 - oLen) / 80, 0, 3)
    if (!hasCta) addTip('outro', 'Добавьте мягкий CTA: подпишитесь/сохраните/напишите комментарий.')
  } else {
    addTip('outro', 'Сделайте короткий мини-вывод + мягкий CTA (34–40 сек).')
  }
  score += outroPts

  // Дополнительные метрики: бонусы и штрафы
  const early = (f.hook + ' ' + f.problem).slice(0, 160)
  const earlyLc = early.toLowerCase()
  let bonus = 0
  let malus = 0

  // Open loop / контраст в начале
  const hasOpenLoop = /\?/.test(early) || has(early, OPEN_LOOP_WORDS) || has(early, CONTRAST_MARKERS)
  if (hasOpenLoop) bonus += VIRALITY_WEIGHTS.bonus.openLoop
  else addTip('hook', 'Добавьте открытую петлю в начале: вопрос/контраст «не … а …».')

  // Раннее обращение ко второму лицу
  const hasSecondEarly = has(early, SECOND_PERSON)
  if (hasSecondEarly) bonus += VIRALITY_WEIGHTS.bonus.secondPersonEarly
  else addTip('hook', 'Обратитесь к зрителю во второй лице вначале («ты/вы»).')

  // Императивные строки в основной части
  const bodyLines = lines(f.body)
  const impCount = bodyLines.filter(isImperativeLine).length
  const impRatio = bodyLines.length ? impCount / bodyLines.length : 0
  bonus += Math.round(VIRALITY_WEIGHTS.bonus.imperativeLines * clamp(impRatio, 0, 1))
  if (impRatio < 0.5 && bodyLines.length > 0) addTip('body', 'Начинайте строки в основной части с действия (императив).')

  // Уникальность/разнообразие слов
  const allText = [f.hook, f.problem, f.promise, f.body, f.climax, f.outro].join(' ')
  const ws = words(allText)
  const ttr = ws.length ? unique(ws).length / ws.length : 0
  const ttrNorm = clamp((ttr - 0.35) / (0.6 - 0.35), 0, 1) // 0.35..0.6 → 0..1
  bonus += Math.round(VIRALITY_WEIGHTS.bonus.uniqueness * ttrNorm)
  if (ttr < 0.4) addTip('body', 'Повысьте разнообразие формулировок: избегайте повторов слов.')

  // Канцелярит/вода — штраф
  const stopCount = countMatches(allText, STOP_PHRASES)
  if (stopCount > 0) addTip('body', 'Уберите канцелярит/воду: «в целом», «на самом деле», «в рамках»…')
  malus += Math.round(VIRALITY_WEIGHTS.penalty.stopPhrases * clamp(stopCount / 2, 0, 1))

  // Перебор пунктуации/эмодзи — штраф
  const emoCount = countEmojis(allText)
  const punctCount = countPunct(allText)
  const overload = emoCount + punctCount
  if (overload > 3) addTip('hook', 'Сократите количество !, ? и эмодзи — без перегруза.')
  malus += Math.round(VIRALITY_WEIGHTS.penalty.punctEmojiSpam * clamp((overload - 3) / 5, 0, 1))

  // Капслок — штраф
  const longWords = ws.filter((w) => w.length >= 6)
  const capsWords = longWords.filter((w) => capsRatio(w) >= 0.7)
  const capsShare = longWords.length ? capsWords.length / longWords.length : 0
  if (capsShare > 0.05) addTip('body', 'Избегайте КАПСЛОКА — это снижает доверие.')
  malus += Math.round(VIRALITY_WEIGHTS.penalty.caps * clamp((capsShare - 0.05) / 0.2, 0, 1))

  // Повторы биграмм — штраф
  const bgs = bigrams(ws)
  const totalBigrams = bgs.length
  const uniqB = unique(bgs)
  const repeatShare = totalBigrams ? 1 - uniqB.length / totalBigrams : 0
  if (repeatShare > 0.2) addTip('body', 'Избавьтесь от повторов — переформулируйте одинаковые фразы.')
  malus += Math.round(VIRALITY_WEIGHTS.penalty.repetition * clamp((repeatShare - 0.2) / 0.4, 0, 1))

  score = Math.round(clamp(score + bonus - malus, 0, 100))

  const level = score < 40 ? 'Нужна доработка' : score < 60 ? 'Средне' : score < 80 ? 'Сильный' : 'Высокий потенциал'

  // Уберём дубликаты подсказок
  const uniq = Array.from(new Set(suggestions))
  const blocks: Blocks = {
    hook: { pts: hookPts, max: 35, tips: Array.from(new Set(blockTips.hook)) },
    problem: { pts: problemPts, max: 10, tips: Array.from(new Set(blockTips.problem)) },
    promise: { pts: promisePts, max: 15, tips: Array.from(new Set(blockTips.promise)) },
    body: { pts: bodyPts, max: 20, tips: Array.from(new Set(blockTips.body)) },
    climax: { pts: climaxPts, max: 10, tips: Array.from(new Set(blockTips.climax)) },
    outro: { pts: outroPts, max: 10, tips: Array.from(new Set(blockTips.outro)) },
  }
  return { score, level, suggestions: uniq, blocks }
}
