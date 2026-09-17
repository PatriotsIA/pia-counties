import { useEffect, useRef, useState } from "react";
import { answerCharacterLimit, answerLines, answerWordLimit, isVoterGuideResponse, judicialNote, questionnaireOffice, questionnaireSections, voterGuide, wordCount, type Question, type VoterGuideAnswer, type VoterGuideResponse } from "../voter-guide/model";
import { readVoterGuide, voterGuideField } from "../lib/voter-guide-form";

export function CandidateQuestionnaireFields({ initial }: { initial?: VoterGuideResponse }) {
  const [officeId, setOfficeId] = useState(initial?.officeId || "");
  const office = questionnaireOffice(officeId);
  return (
    <fieldset className="candidate-questionnaire">
      <legend>Voter guide questionnaire</legend>
      <p>Your responses will appear on your public candidate profile after review. Choose the questionnaire for the office you seek. The supplied questions refer to Texas and the Republican Party; you may use them regardless of your state or party, and skip any that do not apply.</p>
      <label className="field"><span>Office questionnaire (optional)</span>
        <select name="voterGuideOffice" aria-label="Office questionnaire" value={officeId} onChange={(event) => {
          const next = event.target.value;
          const form = event.currentTarget.form;
          // Read the previously selected office's controls before changing sets.
          const values = form ? new FormData(form) : undefined;
          values?.set("voterGuideOffice", officeId);
          if (values && Object.keys(readVoterGuide(values)?.answers || {}).length && !window.confirm("Changing the office questionnaire clears its current answers. Continue?")) return;
          setOfficeId(next);
        }}>
          <option value="">No questionnaire / office not listed</option>
          {voterGuide.offices.map((item) => <option key={item.id} value={item.id}>{item.office}</option>)}
        </select>
      </label>
      {office ? <div key={office.id} className="candidate-questionnaire-questions">
        <h2>{office.office}</h2>
        <p>All twenty questions are optional. Answer as many as you wish; unanswered questions will show “No response provided” on the public profile. Limit each written answer to 150 words. Yes-or-No explanations in the final section should be 50 words or fewer.</p>
        {office.judicial ? <p className="questionnaire-note">{judicialNote}</p> : null}
        {questionnaireSections.map((section) => <section key={section.id} aria-label={section.title}>
          <h3>{section.title}</h3><p>{section.note}</p>
          {office.questions.filter((question) => question.section === section.id).map((question) => <QuestionFields key={question.number} question={question} initial={initial?.officeId === office.id ? initial.answers[question.number] : undefined} />)}
        </section>)}
      </div> : null}
    </fieldset>
  );
}

function QuestionFields({ question, initial }: { question: Question; initial?: VoterGuideAnswer }) {
  const [selections, setSelections] = useState(initial?.selections || []);
  const name = (field: string) => voterGuideField(question.number, field);
  const label = `${question.number}. ${question.label}`;
  return <fieldset className="questionnaire-question">
    <legend>{label}</legend><p>{question.text}</p>
    {question.note ? <p className="questionnaire-note">{question.note}</p> : null}
    {question.type.startsWith("yes_no") ? <label className="field"><span>Yes or No</span><select aria-label={`${label}: Yes or No`} name={name("choice")} defaultValue={initial?.choice || ""}><option value="">Choose a response</option><option>Yes</option><option>No</option></select></label> : null}
    {question.type === "primary_history" ? <div className="candidate-form-grid">{question.years?.map((year) => <label className="field" key={year}><span>{year} primary</span><select aria-label={`${year} primary`} name={name(`history.${year}`)} defaultValue={initial?.history?.[year] || ""}><option value="">Choose a response</option>{question.options?.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div> : null}
    {question.type === "checkbox_explain" ? <div className="questionnaire-activities">{question.options?.map((option) => <label className="checkbox-row" key={option}><input type="checkbox" name={name("selections")} value={option} checked={selections.includes(option)} onChange={(event) => setSelections(event.target.checked ? option === "None of the above" ? [option] : [...selections.filter((item) => item !== "None of the above"), option] : selections.filter((item) => item !== option))} /><span>{option}</span></label>)}</div> : null}
    {question.type !== "primary_history" ? <WordAnswer key={question.number} name={name("text")} label={`${label}: ${question.type === "text" ? "Answer" : "Explanation"}`} initial={initial?.text} limit={answerWordLimit(question)} /> : null}
    {question.amountFields ? <div className="candidate-form-grid">{question.amountFields.map((field, index) => <label className="field" key={field}><span>{field}</span><input name={name(`amount.${index}`)} aria-label={`${question.number}. ${field}`} type="text" inputMode="decimal" pattern="[0-9]{1,10}(\.[0-9]{1,2})?" maxLength={13} placeholder="0.00" defaultValue={initial?.amounts?.[field] ?? ""} /></label>)}</div> : null}
    {question.fundSource ? <label className="field"><span>Source of funds (if any contributed)</span><select name={name("fundSource")} aria-label="Source of funds" defaultValue={initial?.fundSource || ""}><option value="">Choose a source, if applicable</option>{question.fundSource.map((option) => <option key={option}>{option}</option>)}</select></label> : null}
  </fieldset>;
}

function WordAnswer({ name, label, initial = "", limit }: { name: string; label: string; initial?: string; limit: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [count, setCount] = useState(wordCount(initial));
  const error = count > limit ? `Use ${limit} words or fewer.` : "";
  useEffect(() => { ref.current?.setCustomValidity(error); }, [error]);
  return <label className="field"><span>{label}</span><textarea ref={ref} name={name} aria-label={label} aria-describedby={`${name}-count`} defaultValue={initial} rows={4} maxLength={answerCharacterLimit} onChange={(event) => {
    const nextCount = wordCount(event.target.value); setCount(nextCount);
    event.target.setCustomValidity(nextCount > limit ? `Use ${limit} words or fewer.` : "");
  }} /><small id={`${name}-count`} className={error ? "questionnaire-limit-error" : ""}>{count} / {limit} words</small></label>;
}

export function CandidateQuestionnaireAnswers({ response }: { response?: VoterGuideResponse }) {
  if (!response || !isVoterGuideResponse(response)) return null;
  const office = questionnaireOffice(response.officeId)!;
  return <section className="candidate-questionnaire-public" aria-label="Candidate questionnaire responses">
    <h2>Voter guide responses</h2><p>{office.office} · Candidate-provided answers</p>
    {office.judicial ? <p className="questionnaire-note">{judicialNote}</p> : null}
    {questionnaireSections.map((section) => <section key={section.id} aria-label={section.title}>
      <h3>{section.title}</h3><p>{section.note}</p>
      {office.questions.filter((question) => question.section === section.id).map((question) => {
        const lines = answerLines(question, response.answers[question.number]);
        return <div className="questionnaire-public-answer" key={question.number}><h4>{question.number}. {question.label}</h4><p>{question.text}</p>{question.note ? <p className="questionnaire-note">{question.note}</p> : null}<div className="questionnaire-response">{lines.length ? lines.map((line, index) => <p key={index}>{line}</p>) : <p className="muted">No response provided.</p>}</div></div>;
      })}
    </section>)}
  </section>;
}
