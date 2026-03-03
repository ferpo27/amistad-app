// amistad-app/src/culture/culturalTips.ts
export function getCulturalTip(country: string): string | null {
  switch (country) {
    case "Germany":  return "In Germany, punctuality is very important.";
    case "Japan":    return "In Japan, exchanging business cards is done with both hands.";
    case "Russia":   return "In Russia, hospitality is taken very seriously.";
    case "China":    return "In China, tea culture is deeply rooted in tradition.";
    case "USA":      return "In the US, tipping at restaurants is expected (15-20%).";
    case "France":   return "In France, greeting with 'la bise' (cheek kiss) is common.";
    case "Brazil":   return "In Brazil, personal space is smaller and physical contact is normal.";
    case "Korea":    return "In Korea, age determines social hierarchy and forms of address.";
    default:         return null;
  }
}