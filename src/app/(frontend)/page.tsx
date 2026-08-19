import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <div className="slot hero">
        <div className="slot-in">
          <p className="badge">Q4 growth for e-commerce founders</p>
          <h1>Better traffic. Bigger orders. More repeat purchases.</h1>
          <p className="lede">
            eCommHarvest is where we build the strategy behind the quarter that decides your year
            — the promotional calendar, the offers, the flows, and the paid social that makes all
            three cheaper.
          </p>
          <div className="cta-row">
            <Link href="/masterclass" className="btn btn-lg">
              Start with the free masterclass
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
