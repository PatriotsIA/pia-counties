import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Candidate } from "../../src/data/candidates";
import { CandidateQuestionnaireAnswers } from "../../src/components/CandidateQuestionnaire";
import { buildCandidateChangePatch } from "../../src/lib/candidate-change-form";
import { readVoterGuide, voterGuideField, voterGuideKey } from "../../src/lib/voter-guide-form";
import { voterGuide, voterGuideVersion, type VoterGuideResponse } from "../../src/voter-guide/model";

const response: VoterGuideResponse = { version: voterGuideVersion, officeId: "justice_of_the_peace", answers: {
  "1": { text: "A candidate-provided answer." }, "11": { choice: "No", text: "My explanation." },
  "16": { history: { "2018": "Did not vote", "2026": "Republican" } },
  "18": { selections: ["Party or campaign volunteer", "Precinct chair"], text: "Two years." },
  "19": { choice: "Yes", text: "My explanation.", amounts: { "Local party, last four years ($)": "0", "State party, last four years ($)": "50.25" }, fundSource: "Personal funds" },
} };
function values() {
  const data = new FormData(); data.set("voterGuideOffice", response.officeId);
  for (const question of voterGuide.offices.find((office) => office.id === response.officeId)!.questions) {
    const answer = response.answers[question.number]; if (!answer) continue;
    for (const field of ["text", "choice", "fundSource"] as const) if (answer[field]) data.set(voterGuideField(question.number, field), answer[field]!);
    for (const [year, choice] of Object.entries(answer.history || {})) data.set(voterGuideField(question.number, `history.${year}`), choice);
    for (const selection of answer.selections || []) data.append(voterGuideField(question.number, "selections"), selection);
    question.amountFields?.forEach((field, index) => { if (answer.amounts?.[field] !== undefined) data.set(voterGuideField(question.number, `amount.${index}`), answer.amounts[field]); });
  }
  return data;
}

it("preserves the exact supplied JSON catalog for this version", () => {
  const raw = readFileSync(new URL("../../src/voter-guide/questions.json", import.meta.url));
  expect(createHash("sha256").update(raw).digest("hex")).toBe("e87dcff33d6a0ca9285694b93ff064967986863f6b5ac3f2bfdb93f3066c47c2");
  expect(voterGuide.offices).toHaveLength(28);
});
it("reads structured answers, zero dollars and partial histories without fabricating blanks", () => {
  const parsed = readVoterGuide(values())!;
  expect(voterGuideKey(parsed)).toBe(voterGuideKey(response));
  expect(parsed.answers[2]).toBeUndefined();
  expect(parsed.answers[16].history).not.toHaveProperty("2020");
  expect(parsed.answers[19].amounts!["Local party, last four years ($)"]).toBe("0");
  const onlySecondAmount = values(); onlySecondAmount.delete(voterGuideField(19, "amount.0"));
  expect(readVoterGuide(onlySecondAmount)!.answers[19].amounts).toEqual({ "State party, last four years ($)": "50.25" });
});
it("changes only the questionnaire, preserves unmounted controls, and supports explicit removal", () => {
  const base: Candidate = { id: "legacy-candidate", name: "Legacy Candidate", office: "Justice of the Peace", stateSlug: "texas", scope: "precinct", voterGuide: response };
  const data = values();
  for (const field of ["name", "office", "stateSlug", "scope"] as const) data.set(field, base[field]);
  expect(buildCandidateChangePatch(base, data)).toEqual({});
  data.set(voterGuideField(1, "text"), "A correction.");
  const patch = buildCandidateChangePatch(base, data);
  expect(Object.keys(patch)).toEqual(["voterGuide"]);
  expect(patch.voterGuide?.answers[1].text).toBe("A correction.");
  data.delete("voterGuideOffice"); expect(buildCandidateChangePatch(base, data)).toEqual({});
  data.set("voterGuideOffice", ""); expect(buildCandidateChangePatch(base, data)).toEqual({ voterGuide: null });
});
it("renders all supplied questions, judicial notes, structured responses and explicit unanswered labels", () => {
  const html = renderToStaticMarkup(createElement(CandidateQuestionnaireAnswers, { response }));
  expect(html).toContain("Voter guide responses");
  expect(html).toContain("Note to judicial candidates");
  expect(html).toContain("Judicial Campaign Fairness Act");
  expect(html).toContain("2018: Did not vote");
  expect(html).toContain("Local party, last four years ($): $0");
  expect(html).toContain("State party, last four years ($): $50.25");
  expect(html.match(/No response provided\./g)).toHaveLength(15);
  expect(html).not.toContain("[object Object]");
  const unsafe = structuredClone(response); unsafe.answers[1].text = "<script>alert('test')</script>";
  expect(renderToStaticMarkup(createElement(CandidateQuestionnaireAnswers, { response: unsafe }))).not.toContain("<script>");
  expect(renderToStaticMarkup(createElement(CandidateQuestionnaireAnswers, {}))).toBe("");
});
