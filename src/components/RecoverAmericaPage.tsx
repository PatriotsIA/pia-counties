import { Link } from "react-router-dom";
import { recoverAmerica as ra } from "../data/recover-america";
import "./RecoverAmericaPage.css";

export function RecoverAmericaPage() {
  return (
    <article className="recover-page">
      <div className="recover-brand-row">
        <Link to="/partners" className="recover-back">← PIA partners</Link>
        <img src={ra.logo} width="916" height="100" alt="Recover America" />
        <span>A Patriots in Action partner</span>
      </div>

      <section className="recover-hero" aria-labelledby="recover-title">
        <div className="recover-hero-copy">
          <p className="recover-eyebrow">Faith · Family · Civic engagement</p>
          <h1 id="recover-title">Recover America.<br /><em>Get to know the mission.</em></h1>
          <p className="recover-intro">Education, community involvement, and a voice for parents.</p>
          <p>Recover America is a Christian ministry that equips pastors and community members to participate in public life. Patriots in Action is connecting our community with its work, resources, and opportunities to get involved.</p>
          <div className="recover-actions">
            <a className="recover-button" href={ra.pledge} target="_blank" rel="noopener noreferrer">View &amp; sign the pledge <span aria-hidden="true">↗</span></a>
            <a className="recover-button recover-button-outline" href={ra.donate} target="_blank" rel="noopener noreferrer">Support Recover America <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <figure className="recover-portrait">
          <img src={ra.portrait} width="800" height="1064" alt="Dr. Rick Scarborough speaking at a lectern" fetchPriority="high" />
          <figcaption><strong>Dr. Rick Scarborough</strong><span>Founder &amp; President, Recover America</span></figcaption>
        </figure>
      </section>

      <nav className="recover-section-nav" aria-label="On this page">
        <a href="#recover-goals">Their goals</a>
        <a href="#recover-partnership">Our partnership</a>
        <a href="#protect-children">Protect Children pledge</a>
        <a href="#support-recover-america">Ways to support</a>
      </nav>

      <section className="recover-section" id="recover-goals" aria-labelledby="recover-goals-title">
        <div className="recover-section-heading">
          <div><p className="recover-eyebrow">The organization</p><h2 id="recover-goals-title">What Recover America works toward</h2></div>
          <a className="recover-text-link" href={ra.about} target="_blank" rel="noopener noreferrer">Read their mission <span aria-hidden="true">↗</span></a>
        </div>
        <div className="recover-goals">
          <div><span className="recover-number">01</span><h3>Education &amp; training</h3><p>Conferences, resources, and training help pastors and faith leaders understand civic issues and their role in public life.</p></div>
          <div><span className="recover-number">02</span><h3>Parental involvement</h3><p>The organization advocates for parental rights, school board accountability, and age-appropriate materials in schools and libraries.</p></div>
          <div><span className="recover-number">03</span><h3>Local participation</h3><p>Community outreach and parent forums connect people with information about school governance and opportunities for civic involvement.</p></div>
        </div>
      </section>

      <section className="recover-partnership recover-section" id="recover-partnership" aria-labelledby="recover-partnership-title">
        <div><p className="recover-eyebrow">Patriots in Action × Recover America</p><h2 id="recover-partnership-title">Connecting people.<br />Sharing resources.</h2></div>
        <div><p>PIA’s partnership with Recover America brings its mission and resources to our county-by-county civic network.</p><p>PIA helps people find local connections and practical ways to participate. Recover America provides education, training, and issue resources. Together, we’re making it easier for the PIA community to learn about this work and choose how to get involved.</p><p className="recover-partnership-note">Explore the initiative below, attend an event, or support Recover America directly.</p></div>
      </section>

      <section className="recover-section recover-pledge" id="protect-children" aria-labelledby="recover-pledge-title">
        <div className="recover-pledge-copy">
          <p className="recover-eyebrow">Featured initiative · Texas</p>
          <h2 id="recover-pledge-title">The Protect Children pledge</h2>
          <p>Recover America’s pledge asks Texas residents and taxpayers to support changes to school and library material policies. Its four requests address:</p>
          <ul className="recover-priorities">
            <li><strong>Legislative attention</strong><span>Making the issue a priority for the 90th Texas Legislative Session.</span></li>
            <li><strong>Material review</strong><span>Reviewing and removing materials that meet the pledge’s stated criteria.</span></li>
            <li><strong>School board accountability</strong><span>Requiring districts to confirm compliance with Texas law.</span></li>
            <li><strong>Community oversight</strong><span>Preserving a voice for local residents in school library decisions.</span></li>
          </ul>
          <p className="recover-small">This is a summary. Read the full wording on Recover America’s website before signing.</p>
        </div>
        <aside className="recover-signup" aria-labelledby="recover-signup-title">
          <p className="recover-eyebrow">How to take part</p>
          <h3 id="recover-signup-title">Read. Review. Sign up.</h3>
          <ol>
            <li><strong>Open the official pledge.</strong><span>Read its full text and decide whether you wish to add your name.</span></li>
            <li><strong>Complete the sign-up form.</strong><span>Select your Texas county and enter your first and last name. The form also includes title and email fields.</span></li>
            <li><strong>Submit on Recover America’s site.</strong><span>The pledge form and county totals are managed by Recover America.</span></li>
          </ol>
          <a className="recover-button" href={ra.pledge} target="_blank" rel="noopener noreferrer">Go to Protect Children <span aria-hidden="true">↗</span></a>
          <p className="recover-small">Opens recoveramerica.com in a new tab.</p>
        </aside>
      </section>

      <section className="recover-support recover-section" id="support-recover-america" aria-labelledby="recover-support-title">
        <p className="recover-eyebrow">Support the work</p>
        <h2 id="recover-support-title">More ways to get involved</h2>
        <div className="recover-support-options">
          <div><h3>Make a contribution</h3><p>Support Recover America’s outreach, education, and training with a one-time or recurring gift through its official donation page.</p><a className="recover-button" href={ra.donate} target="_blank" rel="noopener noreferrer">Donate to Recover America <span aria-hidden="true">↗</span></a></div>
          <div><h3>Attend an event</h3><p>Explore upcoming events and opportunities to learn more about the organization’s work.</p><a className="recover-text-link" href={ra.events} target="_blank" rel="noopener noreferrer">Explore their events <span aria-hidden="true">↗</span></a></div>
          <div><h3>Connect with the team</h3><p>Contact Recover America with questions about its programs or other ways to participate.</p><a className="recover-text-link" href={ra.contact} target="_blank" rel="noopener noreferrer">Contact Recover America <span aria-hidden="true">↗</span></a></div>
        </div>
      </section>
      <p className="recover-source-note">Learn more at <a href={ra.website} target="_blank" rel="noopener noreferrer">Recover America’s official website ↗</a>. Pledge sign-ups and contributions take place directly with Recover America.</p>
    </article>
  );
}
