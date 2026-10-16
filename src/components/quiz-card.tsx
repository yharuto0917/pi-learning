import { useState } from "react";
import { passingScore, type QuizQuestion, scoreQuiz } from "../lib/quiz";

interface QuizCardProps {
  questions: QuizQuestion[];
  onPassed: () => void;
}

const LETTERS = ["A", "B", "C", "D", "E"];

export function QuizCard({ questions, onPassed }: QuizCardProps) {
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [checked, setChecked] = useState(false);
  const score = scoreQuiz(questions, answers);
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  const check = () => {
    setChecked(true);
    if (scoreQuiz(questions, answers).passed) onPassed();
  };

  const retry = () => {
    setAnswers({});
    setChecked(false);
  };

  return (
    <section className="quiz card" aria-label="確認クイズ">
      <div className="widget-head">
        <div>
          <h2 className="widget-title" style={{ margin: 0, padding: 0 }}>
            確認クイズ
          </h2>
          <p className="widget-desc">
            {questions.length} 問中 {passingScore(questions.length)}{" "}
            問以上の正解で、このレッスンを完了にします。
          </p>
        </div>
      </div>
      {questions.map((q, qi) => (
        <div className="quiz-q" key={q.id}>
          <h3>
            Q{qi + 1}. {q.question}
          </h3>
          <div className="quiz-options">
            {q.options.map((option, oi) => {
              const selected = answers[q.id] === oi;
              const state = checked ? (oi === q.answer ? "correct" : selected ? "wrong" : "") : "";
              return (
                <button
                  key={option}
                  type="button"
                  className={`quiz-option ${state}`}
                  aria-pressed={selected}
                  disabled={checked}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                >
                  <span className="letter">{LETTERS[oi]}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
          {checked && (
            <p className="quiz-explain">
              <strong>{answers[q.id] === q.answer ? "正解。" : `正解は ${LETTERS[q.answer]}。`}</strong>
              {q.explanation}
            </p>
          )}
        </div>
      ))}
      <div className="quiz-foot">
        {checked ? (
          <span className={score.passed ? "result-ok" : "result-ng"}>
            {score.correct} / {score.total} 問正解 —{" "}
            {score.passed ? "合格！ レッスンを完了にしました" : "もう一度挑戦してみましょう"}
          </span>
        ) : (
          <span className="muted">
            {allAnswered ? "すべて回答しました" : "すべての問題に回答してください"}
          </span>
        )}
        {checked ? (
          <button type="button" className="btn" onClick={retry}>
            もう一度解く
          </button>
        ) : (
          <button type="button" className="btn primary" disabled={!allAnswered} onClick={check}>
            答え合わせ
          </button>
        )}
      </div>
    </section>
  );
}
