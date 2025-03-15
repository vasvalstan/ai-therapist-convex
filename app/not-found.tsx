import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-6xl font-bold">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">Page Not Found</h2>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link 
        href="/"
        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
} 