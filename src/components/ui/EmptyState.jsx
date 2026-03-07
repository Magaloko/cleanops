export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-4">
          <Icon size={24} className="text-gray-400" />
        </div>
      )}
      <p className="text-base font-medium text-gray-700">{title}</p>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
