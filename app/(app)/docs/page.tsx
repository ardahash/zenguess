import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  Shield,
  Zap,
  AlertTriangle,
  Clock,
  ExternalLink,
  BarChart3,
} from "lucide-react"

export default function DocsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">How It Works</h1>
        <p className="text-sm text-muted-foreground">
          Learn how ZenGuess prediction markets work on Horizen L3
        </p>
      </div>

      {/* Overview */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookOpen className="size-5 text-primary" />
          Overview
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-3 p-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              ZenGuess is a decentralized prediction market platform built on{" "}
              <strong className="text-foreground">Horizen L3</strong>, an OP
              Stack Layer 3 chain on Base. Users can create and trade on markets
              that resolve based on real-world outcomes.
            </p>
            <p>
              Each market has two or more outcomes (typically YES/NO). The price
              of each outcome share reflects the market{"'"}s consensus
              probability of that outcome occurring. Shares pay out $1 if the
              outcome is correct, and $0 otherwise.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* How to Trade */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="size-5 text-primary" />
          How to Trade
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Connect Wallet",
              description:
                "Connect your wallet and ensure you are on the Horizen network. You will need ZEN for gas fees.",
            },
            {
              step: "2",
              title: "Choose a Market",
              description:
                "Browse markets by category, volume, or ending time. Each market shows the current probability of each outcome.",
            },
            {
              step: "3",
              title: "Buy/Sell Shares",
              description:
                'Select your outcome (YES/NO), enter an amount, and confirm the trade. You can sell anytime before resolution.',
            },
          ].map((item) => (
            <Card key={item.step}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Market Resolution */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="size-5 text-primary" />
          Market Resolution
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-3 p-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              Markets resolve based on a pre-defined resolution source (e.g.,
              official announcements, price feeds, or verified data sources). The
              market creator specifies the resolution criteria upfront.
            </p>
            <p>
              Once resolved, holders of the winning outcome can claim their
              winnings. Each winning share pays out $1.00.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Fees */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Zap className="size-5 text-primary" />
          Fees
        </h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Trading fee</span>
                <Badge variant="secondary">2%</Badge>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">
                  Market creation fee
                </span>
                <Badge variant="secondary">Free</Badge>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Gas fees</span>
                <span className="text-xs text-muted-foreground">
                  Minimal (Horizen L3)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Risk / Finality */}
      <section className="flex flex-col gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="size-5 text-warning" />
          Risks & Finality
        </h2>
        <Card className="border-warning/30">
          <CardContent className="flex flex-col gap-3 p-6 text-sm leading-relaxed text-muted-foreground">
            <div className="flex items-start gap-2 rounded-lg bg-warning/5 p-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="font-semibold text-foreground">
                  OP Stack Challenge Window
                </p>
                <p className="mt-1">
                  Horizen is an OP Stack L3 chain. Withdrawals to L1 are subject
                  to a <strong className="text-foreground">7-day challenge window</strong>.
                  During this period, transactions can theoretically be disputed.
                  Do not assume instant finality for high-value operations or
                  bridging.
                </p>
              </div>
            </div>
            <p>
              Prediction markets involve real financial risk. The price of
              outcome shares can be volatile, and you may lose your entire
              investment. Only trade with funds you can afford to lose.
            </p>
            <p>
              Smart contracts may contain bugs or vulnerabilities. While
              contracts are audited, no audit provides 100% security guarantees.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Links */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Resources</h2>
        <div className="flex flex-wrap gap-3">
          {[
            {
              label: "Horizen Explorer",
              url: "https://horizen.calderaexplorer.xyz/",
            },
            {
              label: "Horizen Bridge",
              url: "https://horizen.hub.caldera.xyz/",
            },
            {
              label: "Testnet Faucet",
              url: "https://horizen-testnet.hub.caldera.xyz/",
            },
          ].map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-accent"
            >
              {link.label}
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
