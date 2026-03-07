import { Construction } from 'lucide-react'

export default function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 text-center p-8">
      <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
        <Construction size={28} className="text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-700 mb-1">{title}</h2>
      <p className="text-sm text-gray-400">Dieses Modul wird gerade entwickelt.</p>
    </div>
  )
}
