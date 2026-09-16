// ── Shared style objects ─────────────────────────────────────────
export const S = {
  // Cards
  card: { background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '10px', padding: '20px' } as React.CSSProperties,
  cardSm: { background: '#111E2E', border: '1px solid #1E3A5A', borderRadius: '8px', padding: '14px' } as React.CSSProperties,
  cardDark: { background: '#0D1B2E', border: '1px solid #1E3A5A', borderRadius: '8px', padding: '14px' } as React.CSSProperties,

  // Buttons
  btnPrimary: { background: '#E8622A', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' } as React.CSSProperties,
  btnSecondary: { background: '#1A2D45', color: '#93C5FD', border: '1px solid #1E3A5A', borderRadius: '6px', padding: '10px 18px', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' } as React.CSSProperties,
  btnGhost: { background: 'transparent', color: '#94A3B8', border: '1px solid #1E3A5A', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
  btnSuccess: { background: '#14532D', color: '#86EFAC', border: '1px solid #166534', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
  btnDanger: { background: '#450A0A', color: '#FCA5A5', border: '1px solid #7F1D1D', borderRadius: '6px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,

  // Text
  muted: { color: '#64748B', fontSize: '13px' } as React.CSSProperties,
  label: { display: 'block', fontSize: '13px', color: '#94A3B8', marginBottom: '6px', fontWeight: '500' } as React.CSSProperties,

  // Alerts
  alertError: { background: '#450A0A', border: '1px solid #7F1D1D', color: '#FCA5A5', padding: '10px 14px', borderRadius: '6px', fontSize: '14px', marginBottom: '14px' } as React.CSSProperties,
  alertSuccess: { background: '#052e16', border: '1px solid #166534', color: '#86EFAC', padding: '10px 14px', borderRadius: '6px', fontSize: '14px', marginBottom: '14px' } as React.CSSProperties,

  // Layout
  sidebar: { width: '220px', background: '#0D1B2E', borderRight: '1px solid #1E3A5A', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0 } as React.CSSProperties,
  mainContent: { marginLeft: '220px', flex: 1, padding: '28px', minHeight: '100vh' } as React.CSSProperties,
}

// ── Badge helper ─────────────────────────────────────────────────
export function Badge({ text, color }: { text: string; color: 'orange' | 'green' | 'blue' | 'yellow' | 'red' | 'gray' }) {
  const colors = {
    orange: { background: '#431407', color: '#FB923C', border: '1px solid #7C2D12' },
    green:  { background: '#052e16', color: '#4ADE80', border: '1px solid #14532D' },
    blue:   { background: '#082550', color: '#60A5FA', border: '1px solid #1E3A5A' },
    yellow: { background: '#422006', color: '#FCD34D', border: '1px solid #78350F' },
    red:    { background: '#450A0A', color: '#F87171', border: '1px solid #7F1D1D' },
    gray:   { background: '#1C2030', color: '#94A3B8', border: '1px solid #334155' },
  }
  return (
    <span style={{ ...colors[color], padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', display: 'inline-block' }}>
      {text}
    </span>
  )
}

// ── Status badge ─────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, 'yellow' | 'blue' | 'green' | 'red' | 'gray'> = {
    pending: 'yellow', ongoing: 'blue', completed: 'green', cancelled: 'red'
  }
  return <Badge text={status} color={map[status] || 'gray'} />
}

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
}

// ── Mock data ─────────────────────────────────────────────────────
export const MOCK_PROJECTS = [
  { id: 'p1', project_code: 'B2B-PRJ-1001', title: 'Bathroom Tiling Renovation', service: 'Tiling', city: 'Kandy', budget: 85000, duration: '10 days', status: 'pending', type: 'direct', description: 'Need floor and wall tiling for a small bathroom.', constructor: null },
  { id: 'p2', project_code: 'B2B-PRJ-1002', title: 'Kitchen Renovation Work', service: 'Renovation', city: 'Colombo', budget: 245000, duration: '3 weeks', status: 'ongoing', type: 'bidding', description: 'Full kitchen renovation including cabinets, tiling and plumbing.', constructor: 'Gelioya Builders' },
  { id: 'p3', project_code: 'B2B-PRJ-1003', title: 'Roof Repair & Waterproofing', service: 'Roofing', city: 'Gampaha', budget: 140000, duration: '2 weeks', status: 'completed', type: 'direct', description: 'Roof leak repair and full waterproofing treatment.', constructor: 'Kandy Roof Works' },
]

export const MOCK_APPLICATIONS = [
  { id: 'a1', project_id: 'p1', name: 'Gelioya Builders', city: 'Kandy', rating: 4.8, message: 'We have 5 years experience in tiling. Available immediately.', bid: 80000 },
  { id: 'a2', project_id: 'p1', name: 'Silva Tile Works', city: 'Kandy', rating: 4.5, message: 'Specialised in residential tiling. Can start Monday.', bid: 75000 },
]

export const MOCK_ESCROW = {
  total: 245000,
  deposited: 122500,
  released: 60000,
  remaining: 62500,
  commission: 3000,
}

export const MOCK_PROGRESS = [
  { id: 'pr1', title: 'Day 1 — Site preparation', description: 'Cleared kitchen area and removed old tiles.', requested: 20000, status: 'approved', date: '2026-06-01' },
  { id: 'pr2', title: 'Day 3 — Cabinet removal', description: 'Old cabinets removed, walls cleaned and prepped.', requested: 25000, status: 'approved', date: '2026-06-03' },
  { id: 'pr3', title: 'Day 5 — Floor tiling started', description: 'Floor tiles laid 60% complete. Materials used: 80 tiles.', requested: 30000, status: 'submitted', date: '2026-06-05' },
]

export const MOCK_AVAILABLE_PROJECTS = [
  { id: 'ap1', project_code: 'B2B-PRJ-1001', title: 'Bathroom Tiling Renovation', service: 'Tiling', city: 'Kandy', budget: 85000, duration: '10 days', owner: 'Nimal Perera', description: 'Need floor and wall tiling for a small bathroom using mid-range materials.' },
  { id: 'ap2', project_code: 'B2B-PRJ-1004', title: 'Living Room Flooring', service: 'Tiling', city: 'Colombo', budget: 120000, duration: '1 week', owner: 'Kamani Silva', description: 'Replace old flooring in living room and dining area with ceramic tiles.' },
  { id: 'ap3', project_code: 'B2B-PRJ-1005', title: 'House Exterior Painting', service: 'Painting', city: 'Kandy', budget: 65000, duration: '5 days', owner: 'Sunil Jayawardena', description: 'Full exterior painting for a two storey house.' },
]

export const MOCK_CONVERSATIONS = [
  { id: 'c1', project: 'Bathroom Tiling Renovation', project_code: 'B2B-PRJ-1001', other_party: 'Gelioya Builders', last_message: 'I can start on Monday morning.' },
  { id: 'c2', project: 'Kitchen Renovation Work', project_code: 'B2B-PRJ-1002', other_party: 'Gelioya Builders', last_message: 'Day 5 progress update submitted.' },
]

export const MOCK_MESSAGES: Record<string, Array<{id: string; from: 'me' | 'other'; text: string; time: string}>> = {
  c1: [
    { id: 'm1', from: 'other', text: 'Hello, I saw your tiling project. I have 5 years experience in residential tiling.', time: '10:00 AM' },
    { id: 'm2', from: 'me', text: 'Great! The bathroom is 180 sq ft. When can you start?', time: '10:05 AM' },
    { id: 'm3', from: 'other', text: 'I can start on Monday morning. I will need to do a site visit first.', time: '10:08 AM' },
    { id: 'm4', from: 'me', text: 'That works. The budget is around LKR 85,000.', time: '10:10 AM' },
  ],
  c2: [
    { id: 'm5', from: 'other', text: 'Good morning. Day 5 progress update has been submitted for your review.', time: '8:00 AM' },
    { id: 'm6', from: 'me', text: 'Looks good! I will review and release the payment shortly.', time: '9:15 AM' },
    { id: 'm7', from: 'other', text: 'Thank you. We expect to complete the floor tiling by Day 7.', time: '9:20 AM' },
  ],
}
