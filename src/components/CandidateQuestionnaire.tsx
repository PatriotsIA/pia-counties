import { useEffect, useRef, useState } from "react";
import { answerCharacterLimit, answerLines, answerWordLimit, isVoterGuideResponse, judicialNote, legacyVoterGuideVersion, questionnaireOffice, questionnaireSections, voterGuide, wordCount, type Question, type VoterGuideAnswer, type VoterGuideResponse } from "../voter-guide/model";
import { readVoterGuide, voterGuideField } from "../lib/voter-guide-form";
import { localizeQuestionnaireText, localizedJudicialNote, localizedQuestionnaireOffice, type QuestionnairePlace } from "../voter-guide/localize";

export function CandidateOfficeField({ officeId, onOfficeChange, place, initialOffice, initialResponse }: {
  officeId: string; onOfficeChange: (office: string) => void; place: QuestionnairePlace; initialOffice?: string; initialResponse?: VoterGuideResponse;
}) {
  const office = localizedQuestionnaireOffice(officeId, place);
  const [customTitle, setCustomTitle] = useState(initialOffice && initialOffice !== office?.office ? initialOffice : "");
  const [initialId] = useState(officeId);
  return <div className="candidate-office-field">
    <label className="field"><span>Office sought <span className="required-mark" aria-hidden="true">*</span></span>
      <select name="voterGuideOffice" aria-label="Office sought" value={officeId} required onChange={(event) => {
        const next = event.target.value;
        const form = event.currentTarget.form;
        const values = form ? new FormData(form) : undefined;
        values?.set("voterGuideOffice", officeId);
        if (values && Object.keys(readVoterGuide(values)?.answers || {}).length && !window.confirm("Changing the office clears its current questionnaire answers. Continue?")) return;
        setCustomTitle("");
        onOfficeChange(next);
      }}>
        <option value="">Select an office</option>
        {voterGuide.offices.map((item) => <option key={item.id} value={item.id}>{localizeQuestionnaireText(item.office, place)}</option>)}
        <option value="other">Other office</option>
      </select>
      <small>Your office selection determines the questions below. All answers are optional.</small>
    </label>
    <input type="hidden" name="office" value={customTitle.trim() || office?.office || ""} />
    <input type="hidden" name="voterGuideUnchangedOffice" value={initialOffice && !initialResponse ? initialId : ""} />
    {officeId === "other" ? <label className="field"><span>Office title <span className="required-mark" aria-hidden="true">*</span></span><input aria-label="Office title" name="voterGuideOfficeTitle" value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} maxLength={200} required /></label> : office ? <details className="candidate-office-title" open={initialOffice && initialOffice !== office.office && customTitle ? true : undefined}>
      <summary>Use a specific office title</summary>
      <label className="field"><span>Specific office title (optional)</span><input name="voterGuideOfficeTitle" value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder={office.office} maxLength={200} /></label>
    </details> : null}
  </div>;
}

export function CandidateContactInterests() {
  return <div className="candidate-contact-interests">
    <label className="checkbox-row"><input type="checkbox" name="interviewRequested" /><span>Would you like to schedule an interview with Patriots In Action?</span></label>
    <label className="checkbox-row"><input type="checkbox" name="advertisingRequested" /><span>Would you like to advertise your candidacy on Patriots In Action?</span></label>
    <a href="https://advertise.patriotsinaction.com" target="_blank" rel="noreferrer">View advertising options</a>
  </div>;
}

export function CandidateQuestionnaireFields({ initial, officeId, place }: { initial?: VoterGuideResponse; officeId: string; place: QuestionnairePlace }) {
  const office = localizedQuestionnaireOffice(officeId, place);
  if (!office) return null;
  return (
    <fieldset className="candidate-questionnaire">
      <legend>Voter guide questionnaire</legend>
      <p>Your responses will appear on your public candidate profile after review. Questions reflect your selected state and county. Office duties vary by jurisdiction; answer for the office you seek and skip questions that do not apply. Candidates of every party may use this questionnaire.</p>
      <div key={office.id} className="candidate-questionnaire-questions">
        <h2>{office.office}</h2>
        <p>All twenty questions are optional. Answer as many as you wish; unanswered questions will show “No response provided” on the public profile. Limit each written answer to 150 words. Yes-or-No explanations in the final section should be 50 words or fewer.</p>
        {office.judicial ? <p className="questionnaire-note">{localizedJudicialNote(place)}</p> : null}
        {questionnaireSections.map((section) => <section key={section.id} aria-label={section.title}>
          <h3>{section.title}</h3><p>{section.note}</p>
          {office.questions.filter((question) => question.section === section.id).map((question) => <QuestionFields key={question.number} question={question} initial={initial?.officeId === office.id ? initial.answers[question.number] : undefined} />)}
        </section>)}
      </div>
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

export function CandidateQuestionnaireAnswers({ response, place }: { response?: VoterGuideResponse; place: QuestionnairePlace }) {
  if (!response || !isVoterGuideResponse(response)) return null;
  const legacy = response.version === legacyVoterGuideVersion;
  const office = (legacy ? questionnaireOffice(response.officeId) : localizedQuestionnaireOffice(response.officeId, place))!;
  return <section className="candidate-questionnaire-public" aria-label="Candidate questionnaire responses">
    <h2>Voter guide responses</h2><p>{office.office} · Candidate-provided answers</p>
    {office.judicial ? <p className="questionnaire-note">{legacy ? judicialNote : localizedJudicialNote(place)}</p> : null}
    {questionnaireSections.map((section) => <section key={section.id} aria-label={section.title}>
      <h3>{section.title}</h3><p>{section.note}</p>
      {office.questions.filter((question) => question.section === section.id).map((question) => {
        const lines = answerLines(question, response.answers[question.number]);
        return <div className="questionnaire-public-answer" key={question.number}><h4>{question.number}. {question.label}</h4><p>{question.text}</p>{question.note ? <p className="questionnaire-note">{question.note}</p> : null}<div className="questionnaire-response">{lines.length ? lines.map((line, index) => <p key={index}>{line}</p>) : <p className="muted">No response provided.</p>}</div></div>;
      })}
    </section>)}
  </section>;
}
