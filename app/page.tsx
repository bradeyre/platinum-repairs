export default function HomePage() {
  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">🚀 DEPLOYMENT TEST v4 - ROOT PAGE</h1>
        <p className="text-xl mb-6">If you see this, the new deployment is working!</p>
        <a 
          href="/dashboard/admin" 
          className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-600"
        >
          Go to Admin Dashboard →
        </a>
      </div>
    </div>
  )
}