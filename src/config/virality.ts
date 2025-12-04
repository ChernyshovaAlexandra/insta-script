// Configurable weights and keyword lists for virality scoring

export const VIRALITY_WEIGHTS = {
  bonus: {
    openLoop: 3, // вопрос/контраст в начале
    secondPersonEarly: 3, // "ты/вы" в первых ~120 символах
    imperativeLines: 4, // доля императивных строк в body
    uniqueness: 4, // разнообразие слов (TTR)
  },
  penalty: {
    stopPhrases: 4, // канцелярит/вода
    punctEmojiSpam: 4, // перебор ! ? эмодзи
    caps: 3, // капслок
    repetition: 4, // повтор биграмм
  },
} as const

export const STOP_PHRASES = [
  'в целом',
  'на самом деле',
  'как бы',
  'является',
  'данный',
  'в рамках',
  'следующий',
  'в связи с',
  'в настоящий момент',
  'реализовать',
  'эффективный',
  'оптимальный',
]

export const CONTRAST_MARKERS = [
  'вместо',
  'но',
  'однако',
  'а не',
  'не так',
  'хотя',
  'наоборот',
]

export const OPEN_LOOP_WORDS = [
  'почему',
  'как',
  'зачем',
  'если',
  'что делать',
]

export const SECOND_PERSON = [
  'ты', 'твой', 'твоя', 'твои', 'тебе', 'тобой',
  'вы', 'вам', 'вами', 'ваш', 'ваша', 'ваши',
]

export const IMPERATIVE_ENDINGS = ['й', 'йте', 'те']
export const IMPERATIVE_WORDS = [
  'будь', 'сделай', 'убери', 'проверь', 'замени', 'пиши', 'проведи', 'включи', 'выключи', 'останови', 'начни', 'разбей', 'собери', 'узнай', 'попробуй', 'сохрани', 'оформи', 'подели', 'сверь', 'избегай', 'не делай', 'не делайте', 'не пиши', 'не добавляй',
]

