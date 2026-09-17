import { getCountiesForState, getStateBySlug } from "../data/counties";
import { judicialNote, questionnaireOffice, voterGuide, type Office, type VoterGuideResponse } from "./model";

export type QuestionnairePlace = { stateSlug: string; countySlug?: string; countyName?: string };
const places = new Map<string, { state: string; county?: string }>();

export function questionnairePlace(place: QuestionnairePlace) {
  const key = `${place.stateSlug}/${place.countySlug || ""}`;
  const cached = places.get(key);
  if (cached) return cached;
  const result = {
    state: getStateBySlug(place.stateSlug)?.name || "your state",
    county: getCountiesForState(place.stateSlug).find((county) => county.slug === place.countySlug)?.displayName,
  };
  places.set(key, result);
  return result;
}

// These questions describe powers or institutions specific to Texas. Outside
// Texas, ask candidates to describe the rules that apply to their own office;
// do not imply that another state has the same agencies, laws, or duties.
const jurisdictionQuestions: Record<string, Record<number, string>> = {
  justice_of_the_peace: {
    1: "Briefly describe your professional history. What legal, law enforcement, business, or mediation experience and training prepare you to serve as a judge in {state}?",
  },
  county_commissioner: {
    8: "What is your position on the tax rate in your county? Under what circumstances, if any, would you support increasing property tax revenue or issuing debt without voter approval, where permitted by {state} law? Where would you cut spending first?",
    10: "What role does the county governing body have in funding and overseeing elections in your county? What is your position on voting equipment, polling locations, and election transparency, and how will you keep the governing body's own business open and transparent?",
  },
  county_treasurer: {
    10: "What are the advantages and disadvantages of having an elected treasurer in your county? How will you report its financial condition in a way ordinary taxpayers can understand?",
  },
  county_tax_assessor_collector: {
    10: "Does this office have voter registration duties in your county? If so, how will you keep the voter rolls accurate and current? If not, describe how you will safeguard and account for the public money your office collects.",
  },
  county_clerk: {
    8: "Which property, vital, court, and county government records is this office responsible for in your county? How will you preserve and digitize those records, protect residents from deed and property fraud, and guard personal information?",
    9: "What election duties, if any, does the county clerk have in your county? Within those duties, how will you ensure secure, accurate, and transparent elections, including chain of custody, poll watcher access, and auditable records? How will you work with other election officials?",
  },
  county_attorney: {
    9: "How will you advise county officials and ensure compliance with the open meetings and public records laws that apply in {state}? What will you do if officials want to take an action you believe is unlawful?",
  },
  district_attorney: {
    10: "What authority does your office have over election-law violations and public corruption under {state} law, and how will you handle those cases? How will you ensure your office meets its duty to disclose evidence and seeks justice rather than just convictions?",
  },
  county_judge: {
    5: "What is the single biggest issue in your county that falls within the county judge's authority under {state} law?",
    7: "What role, if any, does this office have in setting taxes or issuing debt in your county? What limits and voter-approval requirements should apply, and where would you seek spending reductions?",
    8: "What emergency-management responsibilities, if any, does this office have in your county? How will you prepare for disasters, and what limits should apply to emergency orders affecting businesses, churches, and individuals?",
    10: "What responsibilities, if any, does this office have for election funding, voting equipment, and polling locations in your county? How will you support transparent elections and open county government within your authority?",
  },
  state_board_of_education: {
    8: "What role does the board have in setting academic standards in {state}? What should students learn in reading, math, science, and social studies, and how should American and state history, civics, and our founding principles be taught?",
    10: "What oversight does the board have over school funds and charter schools in {state}? How will you approach those responsibilities, and what is your view of charter schools and school choice?",
  },
  state_senator: {
    1: "Briefly describe your professional history and any business, military, community, or public service experience that prepares you to serve in the state legislature in {state}.",
    10: "Which Republican Party of {state} legislative priorities will you champion, and are there any you do not support? Where the Senate has confirmation authority, what criteria will you use to evaluate appointments?",
  },
  justice_supreme_court_of_texas: {
    10: "What authority does this court have over court procedure, attorney regulation, and administration of the judiciary in {state}? What would you change, and how will you handle recusal and campaign contributions from attorneys and parties with cases before the court?",
  },
  railroad_commissioner: {
    7: "How will you put that solution in place? Describe the steps, timeline, cost, and how voters can measure whether it worked. How will you obtain any approvals or support required under {state} law?",
    10: "How should the commission respond to federal regulations affecting energy production in {state}? What recusal and conflict-of-interest standards will you follow, including for campaign contributions from regulated industries?",
  },
  commissioner_of_agriculture: {
    9: "How will you help producers in {state} address animal and plant disease threats, rising input costs, market concentration, and other challenges facing local farmers and ranchers?",
    10: "Which nutrition programs, fees, licensing, and grants fall within this department's authority in {state}? How will you hold down costs, prevent waste, serve rural communities, and avoid conflicts of interest?",
  },
  commissioner_of_the_general_land_office: {
    8: "How will you manage state lands and minerals to benefit the people of {state}? What is your position on oil, gas, wind, and solar leases, and what other public purposes should guide the use of state land?",
    9: "What responsibilities, if any, does this office have for veterans' land, housing, homes, or cemeteries in {state}? How would you improve those services within the office's authority?",
    10: "What responsibilities does this office have for disaster recovery, environmental protection, or historic sites in {state}? How will you improve speed, accountability, and stewardship in those areas?",
  },
  comptroller_of_public_accounts: {
    8: "What role does this office have in revenue estimates and spending limits in {state}? How will you make state and local spending and debt more transparent to taxpayers?",
    9: "What responsibilities does this office have for property valuation, local taxation, and school funding in {state}? What changes would you propose within its authority?",
    10: "How will you administer the programs assigned to this office in {state} while preventing fraud? How will you approach public investments, contracting, and the laws governing them?",
  },
  attorney_general: {
    9: "What authority does the Attorney General have over election crimes and public corruption under {state} law? How will you work with local prosecutors and lawmakers to ensure those cases are investigated and prosecuted?",
  },
  lieutenant_governor: {
    1: "Briefly describe your professional history and the legislative, executive, business, or military experience that prepares you to serve as Lieutenant Governor of {state}.",
    7: "How will you put that solution in place within the office's authority in {state}? Describe the steps, timeline, cost, necessary cooperation, and how voters can measure whether it worked.",
    8: "What role, if any, does this office have in legislative procedure or committee leadership in {state}? How will you use that authority, and what principles will guide your relationships with legislators of both parties?",
    9: "How will you work within this office's authority to limit growth in state spending and achieve lasting property tax relief in {state}?",
    10: "Which Republican Party of {state} priorities will you champion? How will you work with lawmakers and the Governor, including when you disagree?",
  },
  governor: {
    7: "What is your plan for lasting property tax relief in {state}, including your approach to school funding? How will you limit the growth of the state budget?",
    8: "What appointment powers does the Governor have in {state}? What criteria will you use, and how will you assure voters that appointments are based on merit and principle rather than campaign contributions?",
    10: "How will you use the Governor's powers under {state} law to advance conservative priorities such as election integrity? What limits should apply to emergency and disaster powers, and what role should lawmakers have in extended declarations?",
  },
};

const jurisdictionLabels: Record<string, Record<number, string>> = {
  state_board_of_education: { 10: "School Funds and Charter Schools" },
  commissioner_of_the_general_land_office: { 8: "State Lands and Public Revenue", 10: "Disaster Recovery, Conservation, and Historic Sites" },
  comptroller_of_public_accounts: { 10: "Public Programs, Investments, and Contracts" },
  lieutenant_governor: { 8: "Legislative Responsibilities" },
};

export function localizeQuestionnaireText(text: string, place: QuestionnairePlace): string {
  const { state, county } = questionnairePlace(place);
  let result = text.replaceAll("{state}", state);
  if (place.stateSlug !== "texas") {
    result = result.replace(/across the 254 counties of Texas/g, `across ${state}'s local election jurisdictions`)
      .replace(/the 254 counties of Texas/g, `local election jurisdictions across ${state}`)
      .replace(/Texans/g, `residents of ${state}`).replace(/Texas/g, state)
      .replace(/in Austin/g, "in state government").replace(/the commissioners court/gi, "the county governing body")
      .replace(/commissioners court/gi, "county governing body");
  }
  if (county) result = result.replace(/your precinct or county/g, `your precinct or ${county}`)
    .replace(/your precinct and county/g, `your precinct and ${county}`).replace(/your county/g, county);
  return result;
}

export function localizedQuestionnaireOffice(id: string, place: QuestionnairePlace): Office | undefined {
  const original = questionnaireOffice(id);
  if (!original) return undefined;
  return {
    ...original,
    office: localizeQuestionnaireText(original.office, place),
    questions: original.questions.map((question) => {
      let text = question.text;
      if (place.stateSlug !== "texas") {
        text = jurisdictionQuestions[id]?.[question.number] || text;
        if (question.number === 3 && !id.startsWith("us_")) {
          text = `In your own words, what are the responsibilities of the office of ${original.office} under {state} law? What authority and limits apply, and how does the office's work benefit the people you serve?`;
        }
      }
      const note = place.stateSlug !== "texas" && question.note?.includes("Judicial Campaign Fairness Act")
        ? "Judicial candidates: Answer as permitted by the campaign finance and judicial conduct rules that apply in {state}."
        : question.note;
      const label = place.stateSlug !== "texas" ? jurisdictionLabels[id]?.[question.number] || question.label : question.label;
      return { ...question, label: localizeQuestionnaireText(label, place), text: localizeQuestionnaireText(text, place), ...(note ? { note: localizeQuestionnaireText(note, place) } : {}) };
    }),
  };
}

export function localizedJudicialNote(place: QuestionnairePlace) {
  if (place.stateSlug === "texas") return judicialNote;
  return `Note to judicial candidates: Answer within the judicial conduct rules that apply in ${questionnairePlace(place).state}. These questions do not ask you to comment on pending or impending cases or to pledge how you would rule on any matter. The election transparency questions concern election policy and your own race.`;
}

export function initialQuestionnaireOffice(candidate?: { office?: string; voterGuide?: VoterGuideResponse }) {
  if (candidate?.voterGuide) return candidate.voterGuide.officeId;
  if (!candidate?.office) return "";
  const normalized = candidate.office.toLowerCase().replace(/[^a-z0-9]/g, "");
  return voterGuide.offices.find((office) => office.office.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized)?.id || "other";
}
