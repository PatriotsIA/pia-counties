import { adClickHint } from "../data/ads";
import {
  adAssetSpecs,
  brochureTiers,
  countyPackages,
  countyPresentedByTier,
  formatAdPrice,
  nationalHomepagePlacements,
  nationalPresentedByTier,
  nationwidePricingLabel,
  placementTierGuide,
  pricingAddOns,
  pricingDiscounts,
  pricingInventoryPlacements,
  pricingNationalPlacements,
} from "../data/ad-pricing";

const inventoryPlacements = pricingInventoryPlacements();
const nationalPlacements = pricingNationalPlacements();

export function PaymentsPricingContent() {
  return (
    <div className="payments-pricing-content">
      <section className="payments-pricing-block">
        <p className="eyebrow">Ad Assets</p>
        <h2>Sponsor creative specifications</h2>
        <p>
          Send finished ad artwork to{" "}
          <a href={`mailto:${adAssetSpecs.email}`}>{adAssetSpecs.email}</a> as a {adAssetSpecs.format} file with a{" "}
          {adAssetSpecs.backgrounds.toLowerCase()}.
        </p>
        <ul className="payments-list">
          <li>
            <strong>Square ads ({adAssetSpecs.square.size}):</strong> {adAssetSpecs.square.placements}.
          </li>
          <li>
            <strong>Bottom banners ({adAssetSpecs.banner.size}):</strong> {adAssetSpecs.banner.placements}.
          </li>
        </ul>
      </section>

      <section className="payments-pricing-block">
        <p className="eyebrow">Brochure Tiers</p>
        <h2>Published partner pricing</h2>
        <p>Core business tiers from the Patriots in Action sales brochure, mapped to current website placements.</p>
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
          <article className="payments-tier-card">
            <h3>{countyPresentedByTier.name}</h3>
            <p className="payments-tier-price">
              <strong>{formatAdPrice(countyPresentedByTier.monthly)}/mo</strong>
              <span>{formatAdPrice(countyPresentedByTier.yearly)}/yr</span>
            </p>
            <p>{countyPresentedByTier.summary}</p>
          </article>
          <article className="payments-tier-card payments-tier-card-quote">
            <h3>{nationalPresentedByTier.name}</h3>
            <p className="payments-tier-price payments-tier-price-quote">
              <strong>{nationalPresentedByTier.quoteLabel}</strong>
            </p>
            <p>{nationalPresentedByTier.summary}</p>
          </article>
        </div>
      </section>

      <section className="payments-pricing-block">
        <p className="eyebrow">National &amp; Homepage</p>
        <h2>Nationwide homepage ad spots</h2>
        <p>
          National-level placements on patriotsinaction.com use custom pricing. Email{" "}
          <a href={`mailto:${adAssetSpecs.email}`}>{adAssetSpecs.email}</a> for availability, creative specs, and a quote.
        </p>
        <div className="payments-national-grid">
          {nationalPlacements.map((placement) => {
            const isBanner = placement.key === "site-footer";
            const placementNote = nationalHomepagePlacements.find((item) => item.key === placement.key)?.note;
            return (
              <article
                className={`ad-preview-placeholder payments-inventory-card payments-inventory-card-quote${isBanner ? " payments-inventory-card-banner" : ""}`}
                key={placement.key}
              >
                <span className="ad-preview-spot">{placement.label}</span>
                <span className="ad-click-hint">{adClickHint}</span>
                <span className="ad-preview-tier">{placement.tier}</span>
                <span className="ad-preview-quote">{placement.quoteLabel || nationwidePricingLabel}</span>
                {placementNote ? <span className="payments-placement-note">{placementNote}</span> : null}
              </article>
            );
          })}
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
        <p>
          Each sellable element maps to a published brochure tier. Standalone placement rates follow the brochure; county
          founding packages below may offer reduced bundle pricing. Preview mode shows these rates on live ad spots.
        </p>
        <div className="payments-inventory-grid">
          {inventoryPlacements.map((placement) => {
            const isBanner = placement.key === "county-page-footer";
            return (
              <article
                className={`ad-preview-placeholder payments-inventory-card${isBanner ? " payments-inventory-card-banner" : ""}`}
                key={placement.key}
              >
                <span className="ad-preview-spot">{placement.label}</span>
                <span className="ad-click-hint">{adClickHint}</span>
                <span className="ad-preview-tier">{placement.tier}</span>
                {placement.quoteOnly ? (
                  <span className="ad-preview-quote">{placement.quoteLabel || nationwidePricingLabel}</span>
                ) : (
                  <>
                    <span className="ad-preview-monthly">{formatAdPrice(placement.monthly)}/mo</span>
                    <span className="ad-preview-yearly">{formatAdPrice(placement.yearly)}/yr</span>
                  </>
                )}
              </article>
            );
          })}
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
            <strong>National Level — Presented By:</strong> {nationwidePricingLabel} for homepage hero, homepage sponsor carousel, and homepage bottom banner carousel.
          </li>
          <li>
            <strong>Sitewide Platinum:</strong> County-level priority placements; national homepage inventory is quoted separately.
          </li>
        </ul>
      </section>
    </div>
  );
}
