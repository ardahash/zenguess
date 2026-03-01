import Link from "next/link"
import { ArrowRight, BarChart3, Shield, Zap, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MarketCard } from "@/components/market-card"
import { marketRepository } from "@/services/markets"
import { formatCompactNumber, formatUSD } from "@/lib/format"

const allMarkets = marketRepository.listMarkets({ status: "open" })
const featuredMarkets = allMarkets.slice(0, 4)
const totalVolume = allMarkets.reduce((acc, market) => acc + market.volume, 0)
const uniqueTraders = new Set(
  marketRepository.listActivity(250).map((event) => event.actor.toLowerCase())
).size

const features = [
  {
    icon: Zap,
    title: "Fast Settlement",
    description:
      "Built on Horizen L3 with low-cost transactions and rapid confirmation.",
  },
  {
    icon: Shield,
    title: "Non-Custodial",
    description:
      "Your funds stay in smart contracts. No intermediary holds your assets.",
  },
  {
    icon: Globe,
    title: "Permissionless",
    description:
      "Anyone can create and trade on markets. No gatekeepers.",
  },
]

const stats = [
  { label: "Total Volume", value: formatUSD(totalVolume) },
  { label: "Active Markets", value: String(allMarkets.length) },
  {
    label: "Total Trades",
    value: formatCompactNumber(
      marketRepository.listActivity(250).filter((event) => event.type === "trade")
        .length
    ),
  },
  { label: "Unique Traders", value: formatCompactNumber(uniqueTraders) },
]

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 pt-8 text-center md:pt-16">
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
          <BarChart3 className="size-4" />
          Powered by Horizen L3
        </div>
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Trade on the Future
        </h1>
        <p className="max-w-xl text-balance text-lg text-muted-foreground">
          Decentralized prediction markets where you bet on real-world outcomes.
          Low fees. Fast settlement. Fully on-chain.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/markets">
              Explore Markets
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/docs">How It Works</Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Featured Markets */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Featured Markets</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/markets">
              View all
              <ArrowRight className="ml-1 size-3" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredMarkets.length > 0 ? (
            featuredMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))
          ) : (
            <Card className="sm:col-span-2 lg:col-span-4">
              <CardContent className="p-6 text-sm text-muted-foreground">
                No featured markets available yet.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="size-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center md:p-12">
        <h2 className="text-2xl font-bold">Ready to trade?</h2>
        <p className="max-w-md text-muted-foreground">
          Connect your wallet and start trading on prediction markets in seconds.
        </p>
        <Button size="lg">
          Connect Wallet
        </Button>
      </section>
    </div>
  )
}
