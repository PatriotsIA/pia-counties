import parallelRoofing from "../../NewAds/parallel-roofing.png";
import parallelBuilders from "../../NewAds/parallel-builders.png";

const countyKeys = ["texas/randall", "texas/potter"];

// Share the artwork, destinations, and coverage between ads and partner cards.
export const parallelPartners = [
  {
    id: "parallel-roofing",
    name: "Parallel Roofing",
    description: "Roofing services from a division of Parallel Builders.",
    href: "https://pb-tx.com/",
    image: parallelRoofing,
    countyKeys,
  },
  {
    id: "parallel-builders",
    name: "Parallel Builders",
    description: "General contractors serving Randall and Potter counties.",
    href: "https://pb-tx.com/",
    image: parallelBuilders,
    countyKeys,
  },
];
