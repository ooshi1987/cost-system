import Link from 'next/link';

interface HelpButtonProps {
  href: string;
}

export default function HelpButton({ href }: HelpButtonProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors border border-gray-200 hover:border-amber-200"
    >
      <span className="text-sm">？</span>
      <span>使い方</span>
    </Link>
  );
}
