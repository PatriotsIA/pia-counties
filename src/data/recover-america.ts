function recoverAmericaLink(path: string, content: string) {
  const url = new URL(path, "https://recoveramerica.com");
  url.searchParams.set("utm_source", "patriotsinaction");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "recover_america");
  url.searchParams.set("utm_content", content);
  return url.toString();
}

export const recoverAmerica = {
  path: "/recover-america",
  website: recoverAmericaLink("/", "website"),
  about: recoverAmericaLink("/about", "about"),
  pledge: recoverAmericaLink("/protectchildren", "pledge"),
  donate: recoverAmericaLink("/donate", "donate"),
  events: recoverAmericaLink("/events", "events"),
  contact: recoverAmericaLink("/contact", "contact"),
  logo: "/partners/recover-america/logo.webp",
  portrait: "/partners/recover-america/rick-scarborough.webp",
  description: "Meet Recover America, a Patriots in Action partner. Learn about its mission, the Protect Children pledge, and ways to support its work.",
};

export const recoverAmericaPartner = {
  name: "Recover America",
  description: "Learn about our partnership, Recover America’s education and outreach, and its Protect Children pledge.",
  href: recoverAmerica.path,
  image: recoverAmerica.logo,
};
