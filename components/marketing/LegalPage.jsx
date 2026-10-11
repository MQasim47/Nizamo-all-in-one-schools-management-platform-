import Link from 'next/link'
import { LEGAL } from '@/lib/site'

// Shared shell for /privacy and /terms: one h1, a visible draft banner, and the sections.
export default function LegalPage({ title, intro, sections }) {
  return (
    <article className="legal">
      <div className="wrap">
        <h1>{title}</h1>
        <p className="draft-note" role="note">Draft — to be reviewed before launch</p>
        <p>{intro}</p>
        <p>
          <strong>Operator:</strong> <span className="todo">{LEGAL.operatorName}</span>
          <br />
          <strong>Address:</strong> <span className="todo">{LEGAL.operatorAddress}</span>
        </p>
        {sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.body.map((block, i) =>
              Array.isArray(block) ? (
                <ul key={i}>{block.map((li) => <li key={li}>{li}</li>)}</ul>
              ) : (
                <p key={i}>{block}</p>
              )
            )}
          </section>
        ))}
        <p style={{ marginTop: 40 }}>
          <Link href="/">← Back to Nizamo</Link>
        </p>
      </div>
    </article>
  )
}
