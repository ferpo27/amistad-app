// src/culture/culturalTips.ts
// Preserva la firma original: getCulturalTip(country: string): string | null
export function getCulturalTip(country: string): string | null {
  switch (country) {
    case "Germany":   return "En Alemania la puntualidad es sagrada — llegar tarde es una falta de respeto.";
    case "Japan":     return "En Japón se intercambian tarjetas con ambas manos y una leve reverencia.";
    case "Russia":    return "En Rusia la hospitalidad es muy importante — siempre te ofrecen comida y bebida.";
    case "China":     return "En China el número 4 trae mala suerte porque suena como 'muerte' en chino.";
    case "Argentina": return "En Argentina el saludo es un beso en la mejilla, incluso entre hombres.";
    case "USA":       return "En EE.UU. '¿cómo estás?' es solo saludo — no esperan una respuesta real.";
    case "Spain":     return "En España la siesta es real — muchos negocios cierran de 2 a 5 de la tarde.";
    case "Mexico":    return "En México el regateo es aceptado en mercados y tianguis.";
    case "France":    return "En Francia hay que decir 'bonjour' al entrar a cualquier local — no hacerlo es maleducado.";
    case "Italy":     return "En Italia pedir cappuccino después de las 11am te delata como turista.";
    case "Brazil":    return "En Brasil el contacto físico es normal — los brasileños son muy expresivos.";
    case "Korea":     return "En Corea servir bebida a los demás antes que a uno mismo es señal de respeto.";
    default:          return null;
  }
}