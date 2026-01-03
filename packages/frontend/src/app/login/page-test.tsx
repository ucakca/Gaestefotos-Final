'use client';

// Einfache Test-Version ohne Framer Motion
export default function LoginPageTest() {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-app-bg">
      <div className="w-full max-w-md rounded-2xl p-8 bg-app-bg shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center text-app-fg">
          Willkommen zurück
        </h1>
        <p className="text-center mb-8 text-app-muted">
          TEST - Login-Seite wird gerendert!
        </p>
        <div className="bg-app-accent text-app-bg p-4 rounded-lg text-center">
          Wenn du das siehst, funktioniert das Rendering!
        </div>
      </div>
    </div>
  );
}

