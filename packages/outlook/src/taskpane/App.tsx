import { type Match, processText, type StrictnessLevel } from '@speak-strong/core';
import { useState } from 'react';

type AnalysisState = 'idle' | 'analyzing' | 'done' | 'error';

interface AnalysisResult {
  original: string;
  transformed: string;
  replacements: Match[];
  suggestions: Match[];
}

export function App() {
  const [state, setState] = useState<AnalysisState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<StrictnessLevel>('conservative');
  const [pendingChanges, setPendingChanges] = useState<Set<number>>(new Set());

  const analyzeEmail = async () => {
    setState('analyzing');
    setError(null);
    setResult(null);

    try {
      const body = await getEmailBody();
      if (!body.trim()) {
        setError('Email body is empty');
        setState('error');
        return;
      }

      const analysisResult = processText(body, level);
      setResult(analysisResult);
      setPendingChanges(new Set(analysisResult.replacements.map((_, i) => i)));
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze email');
      setState('error');
    }
  };

  const getEmailBody = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      Office.context.mailbox.item?.body.getAsync(Office.CoercionType.Text, (asyncResult) => {
        if (asyncResult.status === Office.AsyncResultStatus.Failed) {
          reject(new Error(asyncResult.error.message));
        } else {
          resolve(asyncResult.value);
        }
      });
    });
  };

  const applyChanges = async () => {
    if (!result) return;

    const acceptedReplacements = result.replacements.filter((_, i) => pendingChanges.has(i));
    if (acceptedReplacements.length === 0) return;

    const sortedReplacements = [...acceptedReplacements].sort((a, b) => b.start - a.start);
    let transformed = result.original;

    for (const match of sortedReplacements) {
      const before = transformed.slice(0, match.start);
      const after = transformed.slice(match.end);
      transformed = before + (match.replacement || '') + after;
    }

    transformed = cleanupText(transformed);

    try {
      await setEmailBody(transformed);
      setState('idle');
      setResult(null);
      setPendingChanges(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email');
    }
  };

  const cleanupText = (text: string): string => {
    return text
      .replace(/[ ]{2,}/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .replace(/([.!?]\s+)([a-z])/g, (_, punct, letter) => punct + letter.toUpperCase());
  };

  const setEmailBody = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      Office.context.mailbox.item?.body.setAsync(
        text,
        { coercionType: Office.CoercionType.Text },
        (asyncResult) => {
          if (asyncResult.status === Office.AsyncResultStatus.Failed) {
            reject(new Error(asyncResult.error.message));
          } else {
            resolve();
          }
        }
      );
    });
  };

  const toggleChange = (index: number) => {
    setPendingChanges((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const acceptAll = () => {
    if (result) {
      setPendingChanges(new Set(result.replacements.map((_, i) => i)));
    }
  };

  const rejectAll = () => {
    setPendingChanges(new Set());
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Speak Strong</h1>
        <p className="subtitle">Transform weak language into confident communication</p>
      </header>

      <div className="controls">
        <label className="level-selector">
          <span>Strictness:</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as StrictnessLevel)}
            disabled={state === 'analyzing'}
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </label>

        <button
          type="button"
          className="btn btn-primary"
          onClick={analyzeEmail}
          disabled={state === 'analyzing'}
        >
          {state === 'analyzing' ? 'Analyzing...' : 'Analyze Email'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && state === 'done' && (
        <div className="results">
          {result.replacements.length === 0 && result.suggestions.length === 0 ? (
            <div className="success">No weak language detected. Your email looks confident!</div>
          ) : (
            <>
              {result.replacements.length > 0 && (
                <section className="section">
                  <div className="section-header">
                    <h2>Replacements ({result.replacements.length})</h2>
                    <div className="section-actions">
                      <button type="button" className="btn-link" onClick={acceptAll}>
                        Accept All
                      </button>
                      <button type="button" className="btn-link" onClick={rejectAll}>
                        Reject All
                      </button>
                    </div>
                  </div>
                  <ul className="replacement-list">
                    {result.replacements.map((match, index) => (
                      <li
                        key={index}
                        className={`replacement-item ${pendingChanges.has(index) ? 'accepted' : 'rejected'}`}
                      >
                        <button
                          type="button"
                          className="replacement-button"
                          onClick={() => toggleChange(index)}
                        >
                          <div className="category">{match.rule.category}</div>
                          <div className="change">
                            <span className="original">{match.original}</span>
                            <span className="arrow">→</span>
                            <span className="replacement">{match.replacement || '(remove)'}</span>
                          </div>
                          <div className="checkbox">
                            <input
                              type="checkbox"
                              checked={pendingChanges.has(index)}
                              onChange={() => toggleChange(index)}
                            />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.suggestions.length > 0 && (
                <section className="section">
                  <h2>Suggestions ({result.suggestions.length})</h2>
                  <ul className="suggestion-list">
                    {result.suggestions.map((match, index) => (
                      <li key={index} className="suggestion-item">
                        <div className="category">{match.rule.category}</div>
                        <div className="phrase">"{match.original}"</div>
                        <div className="hint">{match.rule.suggestion}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="actions">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={applyChanges}
                  disabled={pendingChanges.size === 0}
                >
                  Apply {pendingChanges.size} Change{pendingChanges.size !== 1 ? 's' : ''}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setState('idle');
                    setResult(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {state === 'idle' && !result && (
        <div className="placeholder">
          <p>Click "Analyze Email" to scan your message for weak language patterns.</p>
          <ul className="examples">
            <li>
              <strong>Hedging:</strong> "I think we should..." → "We should..."
            </li>
            <li>
              <strong>Minimizing:</strong> "I just wanted to..." → "I wanted to..."
            </li>
            <li>
              <strong>Apologizing:</strong> "Sorry to bother..." → "Excuse me..."
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
