import { Link } from "react-router-dom";
import {
  adAssetDeliveryInstructions,
  formatAdPrice,
  partnerSubscriptionTiers,
  paymentsQuotePath,
  tierHasStripeCheckout,
} from "../data/ad-pricing";
import { PaymentsQuoteLink } from "./PaymentsQuoteLink";

export function PaymentsSubscriptionTable() {
  return (
    <section className="payments-pricing-block payments-subscription-section">
      <p className="eyebrow">Subscribe</p>
      <h2>Choose your partner tier</h2>
      <p>
        Select a monthly or annual subscription below. Checkout is processed securely through Stripe.{" "}
        {adAssetDeliveryInstructions}
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
                <td className="payments-subscription-tier-cell" data-label="Partner tier">
                  <strong>{tier.name}</strong>
                  <span>{tier.tagline}</span>
                </td>
                <td className="payments-subscription-price-cell" data-label="Pricing">
                  {tier.quoteOnly ? (
                    <span className="payments-subscription-quote">{tier.quoteLabel || "Custom pricing"}</span>
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
                <td className="payments-subscription-perks-cell" data-label="Perks and placements">
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
                <td className="payments-subscription-actions-cell" data-label="Subscribe">
                  {tierHasStripeCheckout(tier) ? (
                    <div className="payments-subscription-actions">
                      <a
                        className="button primary"
                        href={tier.stripeMonthlyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Subscribe monthly — {formatAdPrice(tier.monthly)}
                      </a>
                      <a
                        className="button"
                        href={tier.stripeYearlyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Subscribe yearly — {formatAdPrice(tier.yearly)}
                      </a>
                    </div>
                  ) : (
                    <PaymentsQuoteLink tierName={tier.name} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="payments-subscription-footnote">
        Tiers without Stripe checkout above require a custom quote—use{" "}
        <Link to={paymentsQuotePath}>the contact form</Link> or email erik@patriotsinaction.com.
      </p>
    </section>
  );
}
