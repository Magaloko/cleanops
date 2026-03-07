export const ROLES = {
  super_admin: {
    label: 'Super Admin',
    description: 'Plattform-Betreiber · Vollzugriff über alle Mandanten',
    color: 'bg-red-500',
    nav: ['dashboard', 'kunden', 'objekte', 'angebote', 'vertraege', 'projekte', 'aufgaben', 'mitarbeiter', 'qualitaet', 'rechnungen', 'material', 'berichte', 'einstellungen'],
  },
  admin: {
    label: 'Admin',
    description: 'Firmen-Administrator · Vollzugriff im Mandanten',
    color: 'bg-orange-500',
    nav: ['dashboard', 'kunden', 'objekte', 'angebote', 'vertraege', 'projekte', 'aufgaben', 'mitarbeiter', 'qualitaet', 'rechnungen', 'material', 'berichte', 'einstellungen'],
  },
  manager: {
    label: 'Manager',
    description: 'Bereichsleiter · Projekte, Angebote, Berichte',
    color: 'bg-blue-500',
    nav: ['dashboard', 'kunden', 'objekte', 'angebote', 'vertraege', 'projekte', 'aufgaben', 'qualitaet', 'berichte'],
  },
  dispatcher: {
    label: 'Dispatcher',
    description: 'Einsatzplanung · Tasks, Tagesplan, Material',
    color: 'bg-violet-500',
    nav: ['dashboard', 'aufgaben', 'projekte', 'mitarbeiter', 'material'],
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Qualitätskontrolle · Inspektionen & Bewertungen',
    color: 'bg-teal-500',
    nav: ['dashboard', 'qualitaet', 'aufgaben', 'objekte'],
  },
  accountant: {
    label: 'Buchhaltung',
    description: 'Rechnungen & Berichte · keine Operationen',
    color: 'bg-emerald-500',
    nav: ['dashboard', 'rechnungen', 'berichte'],
  },
  worker: {
    label: 'Mitarbeiter',
    description: 'Außendienst · nur eigene Aufgaben',
    color: 'bg-yellow-500',
    nav: ['dashboard', 'aufgaben'],
  },
  customer: {
    label: 'Kunde',
    description: 'Kundenportal · Einsätze, Fotos, Rechnungen',
    color: 'bg-gray-500',
    nav: ['dashboard'],
  },
}
