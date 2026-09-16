'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!, dangerouslyAllowBrowser: true })

export default function BillPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [aiContent, setAiContent] = useState('')
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)
  const printRef = useRef<any>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', user.id).single()
        setIsPro(profile?.is_pro || false)
      }
      const res = await fetch(`/api/bill/${projectId}`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    }
    load()
  }, [projectId])

  async function generateAIBill() {
    if (!data) return
    setGeneratingAI(true)
    const { project, escrow, confirmations, progressUpdates, owner, constructor } = data
    const prompt = `You are a professional construction billing specialist in Sri Lanka. Generate a formal, detailed project completion report and bill analysis for the following completed construction project.

PROJECT DETAILS:
- Title: ${project.title}
- Code: ${project.project_code}
- Service: ${project.service}
- City: ${project.city}
- Duration: ${project.duration}
- Type: ${project.project_type}
- Total Budget: LKR ${project.budget?.toLocaleString()}

CLIENT: ${owner?.full_name} — ${owner?.city}
CONTRACTOR: ${constructor?.full_name} — ${constructor?.city} ${constructor?.is_verified ? '(CIDA Verified)' : ''}

FINANCIAL SUMMARY:
- Total Escrow Deposited: LKR ${escrow?.total_amount?.toLocaleString()}
- Total Released to Contractor: LKR ${escrow?.released_amount?.toLocaleString()}
- Remaining Balance: LKR ${escrow?.remaining_balance?.toLocaleString()}
- Number of Payments Made: ${confirmations.length}

PROGRESS UPDATES COMPLETED:
${progressUpdates.map((p: any, i: number) => `${i + 1}. ${p.title} — ${p.description?.slice(0, 100)}`).join('\n')}

Write a formal project completion bill report with:
1. Executive Summary (2-3 sentences about what was accomplished)
2. Scope of Work Completed (itemized professional description based on the service type and progress updates)
3. Payment Analysis (professional commentary on the payment structure and releases)
4. Quality Assessment (professional assessment based on the project data)
5. Contractor Performance Note (brief professional statement about the contractor)
6. Recommendations for Similar Future Projects (2-3 practical recommendations)

Write in formal professional English suitable for a construction invoice/report document. Keep it concise but thorough.`

    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000
    })
    setAiContent(response.choices[0]?.message?.content || '')
    setAiGenerated(true)
    setGeneratingAI(false)
  }

  function handlePrint() {
    window.print()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A1628', color: '#fff' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #1E3A5A', borderTopColor: '#E8622A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!data || data.error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A1628', color: '#fff' }}>
      <p>Bill not found or project not completed.</p>
    </div>
  )

  const { project, escrow, confirmations, progressUpdates, owner, constructor } = data
  const totalPaid = confirmations.reduce((sum: number, c: any) => sum + c.amount, 0)

  return (
    <>
      {/* Action bar — hidden when printing */}
      <div className="no-print" style={{ background: '#0A1628', padding: '16px 32px', display: 'flex', gap: '12px', alignItems: 'center', borderBottom: '1px solid #1E3A5A' }}>
        <span style={{ color: '#E8622A', fontWeight: '700', fontSize: '18px', marginRight: 'auto' }}>🏗️ Back2Build</span>
        <span style={{ color: '#64748B', fontSize: '13px' }}>Project Completion Bill — {project.project_code}</span>
        {isPro && !aiGenerated && (
          <button onClick={generateAIBill} disabled={generatingAI}
            style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            {generatingAI ? '🤖 Generating AI Report...' : '🤖 Generate AI Enhanced Bill'}
          </button>
        )}
        {isPro && aiGenerated && (
          <span style={{ color: '#4ADE80', fontSize: '13px', fontWeight: '600' }}>✅ AI Report Ready</span>
        )}
        {!isPro && (
          <span style={{ color: '#475569', fontSize: '13px' }}>🔒 AI Enhanced Bill — Pro Only</span>
        )}
        <button onClick={handlePrint}
          style={{ background: '#E8622A', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          📄 Download PDF
        </button>
        <button onClick={() => window.close()}
          style={{ background: 'transparent', color: '#64748B', border: '1px solid #1E3A5A', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
          ← Back
        </button>
      </div>

      {/* Bill content — this is what gets printed */}
      <div ref={printRef} style={{ background: '#fff', color: '#1a1a1a', maxWidth: '800px', margin: '32px auto', padding: '48px', fontFamily: 'Georgia, serif', lineHeight: '1.7' }}>

        {/* Header */}
        <div style={{ borderBottom: '3px solid #E8622A', paddingBottom: '20px', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#E8622A', letterSpacing: '-0.02em' }}>Back2Build</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Construction Marketplace — Sri Lanka</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>www.back2build.lk</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a' }}>PROJECT COMPLETION BILL</div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Bill No: {project.project_code}-BILL</div>
            <div style={{ fontSize: '13px', color: '#666' }}>Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            <div style={{ marginTop: '8px', background: '#052e16', color: '#4ADE80', border: '1px solid #166534', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', display: 'inline-block' }}>
              ✓ COMPLETED
            </div>
          </div>
        </div>

        {/* Project and Party Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '28px' }}>
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', borderLeft: '3px solid #E8622A' }}>
            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>Project Details</div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{project.title}</div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>Code: {project.project_code}</div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>Service: {project.service}</div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>City: {project.city}</div>
            <div style={{ fontSize: '12px', color: '#555' }}>Duration: {project.duration}</div>
          </div>
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', borderLeft: '3px solid #60A5FA' }}>
            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>Client (Property Owner)</div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{owner?.full_name || '—'}</div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>City: {owner?.city || '—'}</div>
            {owner?.phone && <div style={{ fontSize: '12px', color: '#555' }}>Phone: {owner.phone}</div>}
          </div>
          <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', borderLeft: '3px solid #4ADE80' }}>
            <div style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontFamily: 'Arial, sans-serif' }}>Contractor</div>
            <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>{constructor?.full_name || '—'}</div>
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>City: {constructor?.city || '—'}</div>
            {constructor?.is_verified && (
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: '600', marginTop: '4px' }}>✓ CIDA Verified Contractor</div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#E8622A', marginBottom: '14px', fontFamily: 'Arial, sans-serif', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
            Financial Summary
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {[
                ['Total Project Budget', `LKR ${project.budget?.toLocaleString()}`, false],
                ['Total Escrow Deposited', `LKR ${escrow?.total_amount?.toLocaleString()}`, false],
                ['Total Released to Contractor', `LKR ${escrow?.released_amount?.toLocaleString()}`, false],
                ['Remaining Escrow Balance', `LKR ${escrow?.remaining_balance?.toLocaleString()}`, false],
                ['Number of Payment Releases', `${confirmations.length} payment${confirmations.length !== 1 ? 's' : ''}`, false],
                ['Total Amount Paid', `LKR ${totalPaid?.toLocaleString()}`, true],
              ].map(([label, value, bold]) => (
                <tr key={label as string} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 8px', color: '#555', fontFamily: 'Arial, sans-serif' }}>{label}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: bold ? '700' : '500', fontSize: bold ? '15px' : '13px', color: bold ? '#166534' : '#1a1a1a', fontFamily: 'Arial, sans-serif' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment History */}
        {confirmations.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#E8622A', marginBottom: '14px', fontFamily: 'Arial, sans-serif', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
              Payment Release History
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#555' }}>#</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#555' }}>Release Date</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#555' }}>Note</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#555' }}>Amount</th>
                  <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#555' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {confirmations.map((c: any, i: number) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px', color: '#666' }}>{i + 1}</td>
                    <td style={{ padding: '8px', color: '#333' }}>{new Date(c.released_at || c.created_at).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '8px', color: '#555' }}>{c.note || '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#166534' }}>LKR {c.amount?.toLocaleString()}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '600' }}>PAID</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Progress Updates */}
        {progressUpdates.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#E8622A', marginBottom: '14px', fontFamily: 'Arial, sans-serif', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
              Work Progress Summary
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {progressUpdates.map((p: any, i: number) => (
                <div key={p.id} style={{ display: 'flex', gap: '12px', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#E8622A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', flexShrink: 0, fontSize: '11px' }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: '600', color: '#1a1a1a', marginBottom: '2px' }}>{p.title}</div>
                    <div style={{ color: '#555', lineHeight: '1.5' }}>{p.description}</div>
                    <div style={{ color: '#999', marginTop: '2px' }}>{new Date(p.created_at).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Enhanced Section */}
        {aiGenerated && aiContent && (
          <div style={{ marginBottom: '28px', borderTop: '2px solid #E8622A', paddingTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#E8622A', fontFamily: 'Arial, sans-serif', margin: 0 }}>
                AI Enhanced Report
              </h2>
              <span style={{ background: '#431407', color: '#FB923C', border: '1px solid #7C2D12', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '700', fontFamily: 'Arial, sans-serif' }}>
                🤖 BASS AI — PRO
              </span>
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#333', fontFamily: 'Arial, sans-serif' }}
              dangerouslySetInnerHTML={{ __html: aiContent
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#E8622A;margin:16px 0 6px;text-transform:uppercase;letter-spacing:0.05em">$1</h3>')
                .replace(/^# (.+)$/gm, '<h2 style="font-size:16px;font-weight:700;color:#1a1a1a;margin:18px 0 8px">$1</h2>')
                .replace(/^- (.+)$/gm, '<div style="display:flex;gap:8px;margin-bottom:4px"><span style="color:#E8622A;font-weight:700">•</span><span>$1</span></div>')
                .replace(/\n\n/g, '<br/><br/>')
                .replace(/\n/g, '<br/>')
              }}
            />
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '2px solid #E8622A', paddingTop: '20px', marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '11px', color: '#999', fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
            <div style={{ fontWeight: '700', color: '#E8622A', fontSize: '13px', marginBottom: '4px' }}>Back2Build</div>
            <div>Sri Lanka's Trusted Construction Marketplace</div>
            <div>This document is an official project completion bill generated by the Back2Build platform.</div>
            <div>Generated on: {new Date().toLocaleString('en-GB')}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '11px', color: '#999', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ marginBottom: '40px', color: '#555' }}>Authorized Signature</div>
            <div style={{ borderTop: '1px solid #ccc', paddingTop: '6px' }}>Back2Build Platform</div>
          </div>
        </div>

      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 10mm; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  )
}