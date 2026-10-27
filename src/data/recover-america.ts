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

// Patriots in Action TV video (1 hr 6 min), embedded as Vimeo's own player code supplied it.
export const recoverAmericaVideo = {
  embedUrl: "https://player.vimeo.com/video/1239959908?badge=0&autopause=0&player_id=0&app_id=58479",
  watchUrl: "https://vimeo.com/1239959908",
  title: "BONNIE WALLACE RECOVERAMERICA",
  label: "Bonnie Wallace · Recover America",
  details: "Patriots in Action TV · 1 hr 6 min",
};

export const recoverAmericaPartner = {
  name: "Recover America",
  description: "Learn about our partnership, Recover America’s education and outreach, and its Protect Children pledge.",
  href: recoverAmerica.path,
  image: recoverAmerica.logo,
  video: recoverAmericaVideo,
};
