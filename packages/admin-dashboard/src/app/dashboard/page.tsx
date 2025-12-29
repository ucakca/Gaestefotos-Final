export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Events</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">-</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Fotos</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">-</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Benutzer</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">-</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">System Status</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">Online</p>
        </div>
      </div>
    </div>
  );
}

