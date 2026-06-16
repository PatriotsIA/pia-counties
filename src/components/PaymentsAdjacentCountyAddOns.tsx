import {
  adjacentCountyAddOns,
  adjacentCountyPricingNote,
  adAssetDeliveryInstructions,
  formatAdPrice,
} from "../data/ad-pricing";
import { PaymentsQuoteLink } from "./PaymentsQuoteLink";

export function PaymentsAdjacentCountyAddOns() {
  return (
    <section className="payments-pricing-block payments-adjacent-county-section">
      <p className="eyebrow">Multi-County</p>
      <h2>Additional adjacent county add-ons</h2>
      <p>{adjacentCountyPricingNote}</p>
      <p>
        Subscribe to your <strong>base county</strong> at full tier price first, then add one contiguous neighboring
        county at a time at half price using the add-on rates below. Each add-on is a separate Stripe product/price—not a
        coupon on the primary checkout.
      </p>
      <p>{adAssetDeliveryInstructions}</p>
      <div className="payments-table-wrap">
        <table className="payments-table payments-adjacent-county-table">
          <thead>
            <tr>
              <th scope="col">Add-on product</th>
              <th scope="col">Matches base tier</th>
              <th scope="col">Monthly add-on</th>
              <th scope="col">Annual add-on</th>
              <th scope="col">Subscribe</th>
            </tr>
          </thead>
          <tbody>
            {adjacentCountyAddOns.map((addOn) => (
              <tr key={addOn.id}>
                <td className="payments-adjacent-county-name-cell" data-label="Add-on product">
                  <strong>{addOn.name}</strong>
                </td>
                <td data-label="Matches base tier">{addOn.matchesTier}</td>
                <td data-label="Monthly add-on">{formatAdPrice(addOn.monthly)}/mo</td>
                <td data-label="Annual add-on">{formatAdPrice(addOn.yearly)}/yr</td>
                <td className="payments-adjacent-county-actions" data-label="Subscribe">
                  <PaymentsQuoteLink tierName={addOn.name} label="Get a quote" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="payments-adjacent-county-footnote">
        Adjacent-county Stripe add-on links are configured separately. Use the contact form to request checkout links for
        your counties.
      </p>
    </section>
  );
}
