import Link from 'next/link';

export default function Header() {
  return (
    <header className="w-full bg-black/40 backdrop-blur sticky top-0 z-40 border-b border-red-400/12">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-red-400/30 shadow-[0_6px_20px_rgba(255,77,79,0.08)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3v18h18" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 3v6l-9 6-9-6V3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="text-white font-semibold">Thumbnail Maker</div>
            <div className="text-xs text-red-300/70">AI-powered YouTube thumbnails</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center space-x-4 text-sm">
          <a className="text-red-200 hover:text-white" href="#features">Features</a>
          <a className="text-red-200 hover:text-white" href="#how">How it works</a>
          <a className="text-red-200 hover:text-white" href="#pricing">Pricing</a>
          <a className="ml-3 inline-block px-4 py-2 bg-red-600/90 hover:bg-red-700/95 rounded text-white font-medium border border-red-400/20" href="#generate">Get started</a>
        </nav>
      </div>
    </header>
  );
}
