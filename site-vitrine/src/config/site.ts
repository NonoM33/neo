// Configuration centralisée du site Neo Domotique
// TODO: remplacer toutes les valeurs par les vraies informations

export const SITE_CONFIG = {
  // Informations entreprise
  name: 'Neo Domotique',
  legalName: 'Neo Domotique SAS',
  url: 'https://neo-domotique.fr',

  // Contact
  phone: '01 23 45 67 89', // TODO: remplacer
  phoneHref: 'tel:+33123456789', // TODO: remplacer
  email: 'contact@neo-domotique.fr', // TODO: remplacer
  dpoEmail: 'dpo@neo-domotique.fr', // TODO: remplacer

  // Adresse
  address: {
    street: '123 Rue de la Domotique', // TODO: remplacer
    postalCode: '75016', // TODO: remplacer
    city: 'Paris', // TODO: remplacer
    region: 'Île-de-France',
    country: 'France',
    areaServed: 'Paris et Île-de-France',
  },

  // Informations légales
  legal: {
    capitalSocial: '10 000 €', // TODO: remplacer
    rcs: 'XXX XXX XXX', // TODO: remplacer
    siret: 'XXX XXX XXX XXXXX', // TODO: remplacer
    tvaIntra: 'FR XX XXX XXX XXX', // TODO: remplacer
    formeJuridique: 'Société par actions simplifiée (SAS)',
    directeurPublication: 'M. Alexandre Martin, Président', // TODO: remplacer
  },

  // Horaires
  openingHours: 'Mo-Fr 09:00-18:00',
  openingHoursDisplay: 'Lun - Ven : 9h - 18h',
  openingHoursLong: 'Du lundi au vendredi\n9h00 - 18h00',

  // Réseaux sociaux
  social: {
    linkedin: 'https://www.linkedin.com/company/neo-domotique', // TODO: remplacer
    instagram: 'https://www.instagram.com/neodomotique', // TODO: remplacer
    facebook: 'https://www.facebook.com/neodomotique', // TODO: remplacer
  },

  // Hébergement
  hosting: {
    name: 'Vercel Inc.',
    address: '340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis',
  },

  // Formspree
  formspreeId: 'TODO_FORM_ID', // TODO: remplacer par l'ID Formspree

  // Analytics (Plausible)
  plausibleDomain: 'neo-domotique.fr', // TODO: remplacer si différent
} as const;
