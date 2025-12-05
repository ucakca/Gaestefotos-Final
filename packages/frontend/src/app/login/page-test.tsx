'use client';

// Einfache Test-Version ohne Framer Motion
export default function LoginPageTest() {
  return (
    <div 
      style={{ 
        backgroundColor: '#295B4D', 
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{ 
          backgroundColor: '#F9F5F2',
          borderRadius: '1rem',
          padding: '2rem',
          width: '100%',
          maxWidth: '28rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <h1 style={{ color: '#295B4D', fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
          Willkommen zurück
        </h1>
        <p style={{ color: '#295B4D', textAlign: 'center', marginBottom: '2rem' }}>
          TEST - Login-Seite wird gerendert!
        </p>
        <div style={{ backgroundColor: '#EAA48F', color: 'white', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
          Wenn du das siehst, funktioniert das Rendering!
        </div>
      </div>
    </div>
  );
}

