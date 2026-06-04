import { adAssetSpecs, formatAdPrice, partnerSubscriptionTiers, stripeCheckoutPlaceholderUrl } from "../data/ad-pricing";

export function PaymentsSubscriptionTable() {
  return (
    <section className="payments-pricing-block payments-subscription-section">
      <p className="eyebrow">Subscribe</p>
      <h2>Choose your partner tier</h2>
      <p>
        Select a monthly or annual subscription below. Checkout is processed securely through Stripe. After payment, email
        your ad artwork to <a href={`mailto:${adAssetSpecs.email}`}>{adAssetSpecs.email}</a>.
      </p>
      <p className="payments-demo-notice">
        Stripe Payment Links are placeholders and open stripe.com in a new tab until live checkout URLs are configured.
      </p>
      <div className="payments-table-wrap payments-subscription-table-wrap">
        <table className="payments-table payments-subscription-table">
          <thead>
            <tr>
              <th scope="col">Partner tier</th>
              <th scope="col">Pricing</th>
              <th scope="col">Perks and placements</th>
              <th scope="col">Subscribe</th>
            </tr>
          </thead>
          <tbody>
            {partnerSubscriptionTiers.map((tier) => (
              <tr key={tier.id}>
                <td className="payments-subscription-tier-cell">
                  <strong>{tier.name}</strong>
                  <span>{tier.tagline}</span>
                </td>
                <td className="payments-subscription-price-cell">
                  {tier.quoteOnly ? (
                    <span className="payments-subscription-quote">{tier.quoteLabel}</span>
                  ) : (
                    <>
                      <span>
                        <strong>{formatAdPrice(tier.monthly)}</strong>/month
                      </span>
                      <span>
                        <strong>{formatAdPrice(tier.yearly)}</strong>/year
                      </span>
                      <span className="payments-subscription-savings">Annual prepay saves about two months vs monthly.</span>
                    </>
                  )}
                </td>
                <td className="payments-subscription-perks-cell">
                  <p className="payments-subscription-label">Perks</p>
                  <ul>
                    {tier.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                  <p className="payments-subscription-label">Placements</p>
                  <ul>
                    {tier.placements.map((placement) => (
                      <li key={placement}>{placement}</li>
                    ))}
                  </ul>
                </td>
                <td className="payments-subscription-actions-cell">
                  {tier.quoteOnly ? (
                    <a className="button primary" href={`mailto:${adAssetSpecs.email}?subject=${encodeURIComponent(tier.name)}`}>
                      Request a quote
                    </a>
                  ) : (
                    <div className="payments-subscription-actions">
                      <a
                        className="button primary"
                        href={tier.stripeMonthlyUrl || stripeCheckoutPlaceholderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Subscribe monthly — {formatAdPrice(tier.monthly)}
                      </a>
                      <a
                        className="button"
                        href={tier.stripeYearlyUrl || stripeCheckoutPlaceholderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Subscribe yearly — {formatAdPrice(tier.yearly)}
                      </a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
