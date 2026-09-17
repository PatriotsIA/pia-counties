import { questionnaireOffice, voterGuideVersion, type VoterGuideAnswer, type VoterGuideResponse } from "../voter-guide/model";

export function voterGuideField(number: number, field: string) { return `voterGuide.${number}.${field}`; }

export function readVoterGuide(values: FormData, fallback?: VoterGuideResponse): VoterGuideResponse | undefined {
  // An unmounted questionnaire must not erase an existing response.
  if (!values.has("voterGuideOffice")) return fallback;
  const office = questionnaireOffice(String(values.get("voterGuideOffice") || ""));
  if (!office) return undefined;
  const answers: Record<string, VoterGuideAnswer> = {};
  for (const question of office.questions) {
    const text = (field: string) => String(values.get(voterGuideField(question.number, field)) || "").trim();
    const answer: VoterGuideAnswer = {};
    if (text("text")) answer.text = text("text");
    if (text("choice")) answer.choice = text("choice") as "Yes" | "No";
    const selections = (question.options || []).filter((option) => values.getAll(voterGuideField(question.number, "selections")).includes(option));
    if (question.type === "checkbox_explain" && selections.length) answer.selections = selections;
    const history = Object.fromEntries((question.years || []).filter((year) => text(`history.${year}`)).map((year) => [year, text(`history.${year}`)]));
    if (Object.keys(history).length) answer.history = history;
    const amounts = Object.fromEntries((question.amountFields || []).flatMap((field, index) => text(`amount.${index}`) ? [[field, text(`amount.${index}`)]] : []));
    if (Object.keys(amounts).length) answer.amounts = amounts;
    if (text("fundSource")) answer.fundSource = text("fundSource");
    if (Object.keys(answer).length) answers[question.number] = answer;
  }
  // Opening an existing profile must not add an empty questionnaire by itself.
  if (!fallback && !Object.keys(answers).length && values.get("voterGuideUnchangedOffice") === office.id) return undefined;
  return { version: voterGuideVersion, officeId: office.id, answers };
}

export function voterGuideKey(value?: VoterGuideResponse) {
  return JSON.stringify(value ?? null, (key, entry: unknown) => {
    if (key === "selections" && Array.isArray(entry)) return [...entry].sort();
    return entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry;
  });
}
