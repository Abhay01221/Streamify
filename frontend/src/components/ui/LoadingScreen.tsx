import { Code2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-coders-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-coders-green rounded-xl flex items-center justify-center animate-pulse">
          <Code2 className="w-7 h-7 text-black" />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-coders-green rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
