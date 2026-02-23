export function getCulturalTip(country: string) {
  switch (country) {
    case "Germany":
      return "In Germany, punctuality is very important.";
    case "Japan":
      return "In Japan, exchanging business cards is done with both hands.";
    case "Russia":
      return "In Russia, hospitality is taken very seriously.";
    case "China":
      return "In China, tea culture is deeply rooted in tradition.";
    default:
      return null;
  }
}
