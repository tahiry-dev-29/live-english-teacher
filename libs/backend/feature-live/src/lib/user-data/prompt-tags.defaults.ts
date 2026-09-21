export interface DefaultPromptTag {
  name: string;
  description: string;
  systemPrompt: string;
}

// Single source of truth for the 15 built-in #skill tags (task 87).
// Custom tags live in DB (PromptTag); defaults are never stored.
export const DEFAULT_PROMPT_TAGS: DefaultPromptTag[] = [
  {
    name: 'correction',
    description: 'Grammar & vocabulary correction only',
    systemPrompt:
      'Focus this chat on correcting my grammar and vocabulary mistakes.',
  },
  {
    name: 'pronunciation',
    description: 'Pronunciation coaching only',
    systemPrompt: 'Focus this chat on pronunciation with phonetics and drills.',
  },
  {
    name: 'spoken',
    description: 'Casual spoken English practice',
    systemPrompt:
      'Talk like a friendly native speaker, short conversational replies.',
  },
  {
    name: 'vocabulary',
    description: 'Real-life vocabulary building',
    systemPrompt:
      'Teach practical real-life vocabulary, 2-3 new words per reply.',
  },
  {
    name: 'grammar',
    description: 'Grammar explanations & drills',
    systemPrompt: 'Act as a grammar coach with simple rules and drills.',
  },
  {
    name: 'listening',
    description: 'Listening comprehension training',
    systemPrompt: 'Dictate short sentences, then quiz what I heard.',
  },
  {
    name: 'speaking',
    description: 'Speaking fluency practice',
    systemPrompt: 'Ask open questions, push full-sentence answers.',
  },
  {
    name: 'writing',
    description: 'Writing improvement',
    systemPrompt: 'Review my texts, fix style, suggest better phrasing.',
  },
  {
    name: 'reading',
    description: 'Reading comprehension',
    systemPrompt: 'Give short texts to read, then quiz comprehension.',
  },
  {
    name: 'exam',
    description: 'Exam preparation (TOEFL/IELTS)',
    systemPrompt: 'Simulate exam questions and grade answers strictly.',
  },
  {
    name: 'business',
    description: 'Business English',
    systemPrompt: 'Coach business English with a formal tone.',
  },
  {
    name: 'travel',
    description: 'Travel English scenarios',
    systemPrompt: 'Role-play travel situations and correct me.',
  },
  {
    name: 'interview',
    description: 'Job interview practice',
    systemPrompt: 'Simulate a job interview, one question at a time.',
  },
  {
    name: 'kids',
    description: 'Simple English for beginners',
    systemPrompt: 'Use very simple English, explain every new word.',
  },
  {
    name: 'translate',
    description: 'Translation helper',
    systemPrompt: 'Show both versions and explain key differences.',
  },
];
