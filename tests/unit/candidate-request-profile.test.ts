import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import { CandidateProfile } from "../../src/components/CandidateProfile";

it("offers target-specific Request Changes only on public profiles", () => {
  const candidate = { id: "alex /?&", name: "Alex Test", office: "Governor", stateSlug: "texas", scope: "statewide" as const };
  const render = (preview: boolean) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CandidateProfile, { candidate, preview, backPath: "/candidates" })));
  expect(render(false)).toContain('class="button" href="/candidate-form?mode=published&amp;candidate=alex%20%2F%3F%26"');
  expect(render(false)).toContain("Request Changes</a>");
  expect(render(true)).not.toContain("Request Changes");
  expect(render(true)).not.toContain("/candidate-form?");
});
