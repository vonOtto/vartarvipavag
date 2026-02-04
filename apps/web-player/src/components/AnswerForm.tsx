import React, { useState } from 'react';

interface AnswerFormProps {
  onSubmitAnswer: (answerText: string) => void;
  isSubmitting: boolean;
}

export const AnswerForm: React.FC<AnswerFormProps> = ({ onSubmitAnswer, isSubmitting }) => {
  const [answerText, setAnswerText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answerText.trim() && !isSubmitting) {
      onSubmitAnswer(answerText.trim());
    }
  };

  return (
    <form className="answer-form" onSubmit={handleSubmit}>
      <div className="brake-owner-message">You pulled the brake!</div>
      <div className="form-group">
        <label htmlFor="answer-input">What is the destination?</label>
        <input
          id="answer-input"
          type="text"
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          maxLength={200}
          autoFocus
          disabled={isSubmitting}
        />
      </div>
      <button type="submit" disabled={!answerText.trim() || isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Answer'}
      </button>
    </form>
  );
};
