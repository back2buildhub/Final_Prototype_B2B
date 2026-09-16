export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <nav style={{ background: '#0D1B2E', borderBottom: '1px solid #1E3A5A', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#E8622A', letterSpacing: '-0.02em' }}>Back2Build</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <a href="/admin" style={{ fontSize: '12px', color: '#475569', textDecoration: 'none' }}>
            Admin
          </a>
          <a href="/login">
            <button style={{ background: '#1A2D45', color: '#93C5FD', border: '1px solid #1E3A5A', borderRadius: '6px', padding: '9px 20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              Log In
            </button>
          </a>
          <a href="/register">
            <button style={{ background: '#E8622A', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              Get Started
            </button>
          </a>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
        <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', letterSpacing: '0.06em', marginBottom: '22px', display: 'inline-block' }}>
          WHERE TRUST BUILDS
        </span>

        <h1 style={{ fontSize: '52px', fontWeight: '700', color: '#E2E8F0', lineHeight: '1.1', marginBottom: '20px', maxWidth: '680px' }}>
          Sri Lanka&apos;s Trusted{' '}
          <span style={{ color: '#E8622A' }}>Construction</span>{' '}
          Marketplace
        </h1>

        <p style={{ fontSize: '17px', color: '#64748B', maxWidth: '480px', lineHeight: '1.7', marginBottom: '40px' }}>
          Find trusted constructors, manage projects safely, and get paid securely — all in one platform.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '70px' }}>
          <a href="/register?role=property_owner">
            <button style={{ background: '#E8622A', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px 32px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
              🏠 Find a Constructor
            </button>
          </a>
          <a href="/register?role=constructor">
            <button style={{ background: '#1A2D45', color: '#93C5FD', border: '1px solid #1E3A5A', borderRadius: '8px', padding: '14px 32px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
              🏗️ Join as a Constructor
            </button>
          </a>
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', maxWidth: '860px', width: '100%' }}>
          {[
            { icon: '🔍', title: 'Find Professionals', desc: 'Browse verified construction teams by service, city, and budget.' },
            { icon: '🔒', title: 'Secure Escrow', desc: 'Funds released only after you confirm daily progress.' },
            { icon: '📊', title: 'Track Progress', desc: 'Constructors submit daily updates. You stay in full control.' },
            { icon: '🤖', title: 'Bass AI', desc: 'AI-powered construction Q&A, cost estimates, and material calculations.' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '10px', padding: '20px', textAlign: 'left' }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>{f.icon}</div>
              <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '6px', color: '#E2E8F0' }}>{f.title}</div>
              <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Demo note */}
        <div style={{ marginTop: '40px', padding: '14px 24px', background: '#0D1B2E', border: '1px solid #1E3A5A', borderRadius: '8px', maxWidth: '460px' }}>
          <p style={{ fontSize: '13px', color: '#64748B' }}>
            🎓 <strong style={{ color: '#94A3B8' }}>Demo Version</strong> — Register as either role to explore the full platform.
            All data is simulated — no real payments or database.
          </p>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid #1E3A5A', padding: '20px 40px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
        Back2Build — Final Year Project Demo
      </footer>
    </div>
  )
}
