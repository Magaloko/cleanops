const styles = {
  lead:     'bg-blue-100 text-blue-700',
  aktiv:    'bg-emerald-100 text-emerald-700',
  inaktiv:  'bg-gray-100 text-gray-500',
  offen:    'bg-amber-100 text-amber-700',
  gesendet: 'bg-blue-100 text-blue-700',
  akzeptiert: 'bg-emerald-100 text-emerald-700',
  abgelehnt:  'bg-red-100 text-red-600',
  entwurf:    'bg-gray-100 text-gray-500',
}

const labels = {
  lead: 'Lead', aktiv: 'Aktiv', inaktiv: 'Inaktiv',
  offen: 'Offen', gesendet: 'Gesendet',
  akzeptiert: 'Akzeptiert', abgelehnt: 'Abgelehnt', entwurf: 'Entwurf',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  )
}
