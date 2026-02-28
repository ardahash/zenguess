"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  PlusCircle,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createMarket } from "@/lib/contracts"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { MarketCategory } from "@/data/types"

const steps = [
  "Question",
  "Category & Tags",
  "End Time & Resolution",
  "Outcomes",
  "Liquidity",
  "Review",
]

const categories: Array<{ value: MarketCategory; label: string }> = [
  { value: "crypto", label: "Crypto" },
  { value: "politics", label: "Politics" },
  { value: "sports", label: "Sports" },
  { value: "science", label: "Science" },
  { value: "culture", label: "Culture" },
  { value: "economics", label: "Economics" },
  { value: "other", label: "Other" },
]

export default function CreateMarketPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [question, setQuestion] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<MarketCategory>("crypto")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("23:59")
  const [resolutionSource, setResolutionSource] = useState("")
  const [outcomes, setOutcomes] = useState(["Yes", "No"])
  const [liquidity, setLiquidity] = useState("1000")

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setTagInput("")
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function addOutcome() {
    setOutcomes([...outcomes, ""])
  }

  function updateOutcome(index: number, value: string) {
    const updated = [...outcomes]
    updated[index] = value
    setOutcomes(updated)
  }

  function removeOutcome(index: number) {
    if (outcomes.length <= 2) return
    setOutcomes(outcomes.filter((_, i) => i !== index))
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return question.trim().length >= 10
      case 1:
        return !!category
      case 2:
        return !!endDate && !!resolutionSource.trim()
      case 3:
        return outcomes.every((o) => o.trim().length > 0) && outcomes.length >= 2
      case 4:
        return parseFloat(liquidity) > 0
      default:
        return true
    }
  }

  async function handleCreate() {
    setIsSubmitting(true)
    try {
      const endDateTime = new Date(`${endDate}T${endTime}:00Z`)
      const result = await createMarket({
        question,
        category,
        endTime: endDateTime.getTime(),
        outcomes,
        initialLiquidity: parseFloat(liquidity),
      })
      if (result.success) {
        toast.success("Market created successfully!", {
          description: `Market ID: ${result.marketId}`,
        })
        router.push("/markets")
      }
    } catch {
      toast.error("Failed to create market. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Create Market</h1>
        <p className="text-sm text-muted-foreground">
          Set up a new prediction market in a few steps
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1" role="progressbar" aria-valuenow={step + 1} aria-valuemax={steps.length}>
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "border-2 border-primary text-primary"
                    : "border border-border text-muted-foreground"
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-[10px] md:block",
                i <= step ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{steps[step]}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Step 0: Question */}
          {step === 0 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="question">Market Question</Label>
                <Input
                  id="question"
                  placeholder="Will Bitcoin exceed $150,000 by end of 2026?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Write a clear, unambiguous question with a definitive YES/NO
                  answer.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide more details about resolution criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {/* Step 1: Category + Tags */}
          {step === 1 && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as MarketCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Step 2: End Time + Resolution */}
          {step === 2 && (
            <>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex w-32 flex-col gap-1.5">
                  <Label htmlFor="endTime">End Time (UTC)</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resolution">Resolution Source</Label>
                <Input
                  id="resolution"
                  placeholder="e.g., CoinGecko price feed, official results"
                  value={resolutionSource}
                  onChange={(e) => setResolutionSource(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Describe the source of truth that will determine the outcome.
                </p>
              </div>
            </>
          )}

          {/* Step 3: Outcomes */}
          {step === 3 && (
            <>
              <p className="text-xs text-muted-foreground">
                Default is YES/NO. You can add more outcomes for multi-outcome
                markets.
              </p>
              <div className="flex flex-col gap-2">
                {outcomes.map((outcome, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={outcome}
                      onChange={(e) => updateOutcome(i, e.target.value)}
                      placeholder={`Outcome ${i + 1}`}
                    />
                    {outcomes.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOutcome(i)}
                        className="shrink-0"
                        aria-label={`Remove outcome ${i + 1}`}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addOutcome}
                className="w-fit"
              >
                <PlusCircle className="mr-1 size-3.5" />
                Add Outcome
              </Button>
            </>
          )}

          {/* Step 4: Liquidity */}
          {step === 4 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="liquidity">Initial Liquidity (USD)</Label>
              <Input
                id="liquidity"
                type="number"
                min="0"
                step="100"
                placeholder="1000"
                value={liquidity}
                onChange={(e) => setLiquidity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Higher initial liquidity means tighter spreads and less slippage
                for traders.
              </p>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Question</span>
                <span className="max-w-[60%] text-right font-medium">
                  {question}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Category</span>
                <span className="capitalize font-medium">{category}</span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Tags</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                  {tags.length === 0 && (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">End Date</span>
                <span className="font-medium">
                  {endDate} {endTime} UTC
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Resolution</span>
                <span className="max-w-[60%] text-right font-medium">
                  {resolutionSource}
                </span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Outcomes</span>
                <div className="flex flex-wrap justify-end gap-1">
                  {outcomes.map((o) => (
                    <Badge key={o} variant="secondary" className="text-xs">
                      {o}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  Initial Liquidity
                </span>
                <span className="font-medium">${liquidity}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
        >
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Button>
        {step < steps.length - 1 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="ml-1 size-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="mr-1 size-4" />
                Create Market
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
