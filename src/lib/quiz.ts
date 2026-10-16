// クイズの採点

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface QuizScore {
  correct: number;
  total: number;
  passed: boolean;
}

/** 合格ラインは全問正解の 7 割以上（端数切り上げ） */
export function passingScore(total: number): number {
  return Math.ceil(total * 0.7);
}

export function scoreQuiz(questions: QuizQuestion[], answers: Record<string, number | undefined>): QuizScore {
  const correct = questions.filter((q) => answers[q.id] === q.answer).length;
  return {
    correct,
    total: questions.length,
    passed: questions.length > 0 && correct >= passingScore(questions.length),
  };
}
