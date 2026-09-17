import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CandidateQuestionnaireAnswers } from "../../src/components/CandidateQuestionnaire";
import { states } from "../../src/data/states";
import { initialQuestionnaireOffice, localizedJudicialNote, localizedQuestionnaireOffice } from "../../src/voter-guide/localize";
import { legacyVoterGuideVersion, voterGuide, voterGuideVersion } from "../../src/voter-guide/model";
import { readVoterGuide } from "../../src/lib/voter-guide-form";

it("adapts every questionnaire to each state without copying Texas-only institutions or county counts", () => {
  for (const state of states.filter((item) => item.slug !== "texas")) {
    for (const office of voterGuide.offices) {
      const localized = localizedQuestionnaireOffice(office.id, { stateSlug: state.slug })!;
      expect(localized.questions).toHaveLength(20);
      const text = [localized.office, ...localized.questions.map((question) => `${question.label} ${question.text} ${question.note || ""}`)].join(" ");
      expect(text).toContain(state.name);
      expect(text).not.toMatch(/Texas|Texans|Austin|254 counties|Judicial Campaign Fairness Act|Permanent School Fund|Veterans Land Board|Alamo|Legislative Budget Board|\{state\}/);
      expect(text).not.toContain("across local election jurisdictions across");
      expect(localized.questions.map((question) => question.type)).toEqual(office.questions.map((question) => question.type));
    }
    expect(localizedJudicialNote({ stateSlug: state.slug })).toContain(state.name);
  }
});

it("uses the canonical county, parish, or city name, and clears it when the state no longer matches", () => {
  for (const [stateSlug, countySlug, name] of [["texas", "potter", "Potter County"], ["louisiana", "west-carroll", "West Carroll Parish"], ["maryland", "baltimore-city", "Baltimore City"]]) {
    const office = localizedQuestionnaireOffice("sheriff", { stateSlug, countySlug })!;
    expect(office.questions[4].text).toContain(name);
    expect(office.questions[11].text).toContain(name);
  }
  const changed = localizedQuestionnaireOffice("sheriff", { stateSlug: "alaska", countySlug: "potter", countyName: "Potter County" })!;
  expect(changed.questions[4].text).toContain("your county");
  expect(changed.questions[4].text).not.toContain("Potter");
});

it("preserves original question wording for saved legacy responses", () => {
  const props = { response: { version: legacyVoterGuideVersion, officeId: "governor", answers: {} }, place: { stateSlug: "alaska" } };
  const legacy = renderToStaticMarkup(createElement(CandidateQuestionnaireAnswers, props));
  expect(legacy).toContain("Governor of Texas");
  const localized = renderToStaticMarkup(createElement(CandidateQuestionnaireAnswers, { ...props, response: { ...props.response, version: voterGuideVersion } }));
  expect(localized).toContain("Governor of Alaska");
  expect(localized).not.toContain("Texas");
});

it("matches existing office titles and preserves a profile with no questionnaire when nothing changes", () => {
  expect(initialQuestionnaireOffice({ office: "Governor" })).toBe("governor");
  expect(initialQuestionnaireOffice({ office: "Local water district board member" })).toBe("other");
  const values = new FormData(); values.set("voterGuideOffice", "governor"); values.set("voterGuideUnchangedOffice", "governor");
  expect(readVoterGuide(values)).toBeUndefined();
  values.set("voterGuide.1.text", "My response.");
  expect(readVoterGuide(values)?.version).toBe(voterGuideVersion);
});
