import {
  brochureTiers,
  countyPackages,
  formatAdPrice,
  placementTierGuide,
  pricingAddOns,
  pricingDiscounts,
  pricingByKeyFromEntries,
} from "../data/ad-pricing";

const inventoryPlacements = pricingByKeyFromEntries();

export function PaymentsPricingContent() {
  return (
    <div className="payments-pricing-content">
      <section className="payments-pricing-block">
        <p className="eyebrow">Brochure Tiers</p>
        <h2>Published partner pricing</h2>
        <p>Core business tiers from the Patriots in Action sales brochure.</p>
        <div className="payments-tier-grid">
          {brochureTiers.map((tier) => (
            <article className="payments-tier-card" key={tier.name}>
              <h3>{tier.name}</h3>
              <p className="payments-tier-price">
                <strong>{formatAdPrice(tier.monthly)}/mo</strong>
                <span>{formatAdPrice(tier.yearly)}/yr</span>
              </p>
              <p>{tier.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="payments-pricing-block">
        <p className="eyebrow">County Packages</p>
        <h2>Recommended county sponsorship packages</h2>
        <div className="payments-package-grid">
          {countyPackages.map((pkg) => (
            <article className="payments-tier-card" key={pkg.name}>
              <h3>{pkg.name}</h3>
              <p className="payments-tier-price">
                <strong>{formatAdPrice(pkg.monthly)}/mo</strong>
                <span>{formatAdPrice(pkg.yearly)}/yr</span>
              </p>
              <ul>
                {pkg.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="payments-pricing-block">
        <p className="eyebrow">Placement Inventory</p>
        <h2>Website placement pricing</h2>
        <p>Each sellable element maps to a brochure tier. Preview mode shows these rates on live ad spots.</p>
        <div className="payments-inventory-grid">
          {inventoryPlacements.map((placement) => (
            <article className="ad-preview-placeholder payments-inventory-card" key={placement.key}>
              <span className="ad-preview-spot">{placement.label}</span>
              <span className="ad-preview-tier">{placement.tier}</span>
              <span className="ad-preview-monthly">{formatAdPrice(placement.monthly)}/mo</span>
              <span className="ad-preview-yearly">{formatAdPrice(placement.yearly)}/yr</span>
            </article>
          ))}
        </div>
      </section>

      <section className="payments-pricing-block">
        <p className="eyebrow">Placement Guide</p>
        <h2>How placements map to tiers</h2>
        <div className="payments-table-wrap">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Placement</th>
                <th>Tier</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {placementTierGuide.map((row) => (
                <tr key={row.placement}>
                  <td>{row.placement}</td>
                  <td>{row.tier}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="payments-pricing-block">
        <p className="eyebrow">Discounts</p>
        <h2>Discounts and premiums</h2>
        <ul className="payments-list">
          {pricingDiscounts.map((item) => (
            <li key={item.label}>
              <strong>{item.label}:</strong> {item.detail}
            </li>
          ))}
        </ul>
      </section>

      <section className="payments-pricing-block">
        <p className="eyebrow">Add-Ons</p>
        <h2>Optional add-on pricing</h2>
        <ul className="payments-list">
          {pricingAddOns.map((item) => (
            <li key={item.label}>
              <strong>{item.label}:</strong> {item.detail}
            </li>
          ))}
        </ul>
      </section>

      <section className="payments-pricing-block">
        <p className="eyebrow">Statewide &amp; Sitewide</p>
        <h2>Broader network sponsorship</h2>
        <ul className="payments-list">
          <li>
            <strong>State Patriot Preferred:</strong> {formatAdPrice(450)}/yr per business listing across state-related partner pages.
          </li>
          <li>
            <strong>State Gold:</strong> {formatAdPrice(950)}/yr per state-level content sponsorship or regional partner placement.
          </li>
          <li>
            <strong>State Platinum:</strong> {formatAdPrice(4950)}/yr for priority placement across state and county pages in a state.
          </li>
          <li>
            <strong>Sitewide Platinum:</strong> Homepage carousel, bottom banner carousel, partner listing, and one content vertical sponsorship.
          </li>
        </ul>
      </section>
    </div>
  );
}
