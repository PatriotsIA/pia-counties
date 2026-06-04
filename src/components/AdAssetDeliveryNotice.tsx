import { adAssetDeliveryInstructions } from "../data/ad-pricing";

type AdAssetDeliveryNoticeProps = {
  className?: string;
};

export function AdAssetDeliveryNotice({ className = "ad-asset-delivery-notice" }: AdAssetDeliveryNoticeProps) {
  return <p className={className}>{adAssetDeliveryInstructions}</p>;
}
