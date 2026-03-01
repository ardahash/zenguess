"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DollarSign, Gauge, Globe, Save } from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const [network, setNetwork] = useState<"testnet" | "mainnet">("testnet")
  const [customRpc, setCustomRpc] = useState("")
  const [slippage, setSlippage] = useState(1)
  const [currency, setCurrency] = useState<"usd" | "zen">("usd")
  const [notifications, setNotifications] = useState(true)

  function handleSave() {
    toast.success("Settings saved", {
      description: "Your preferences have been updated.",
    })
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your ZenGuess preferences
        </p>
      </div>

      {/* Network */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4" />
            Network
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Default Network</Label>
            <Select
              value={network}
              onValueChange={(v) => setNetwork(v as "testnet" | "mainnet")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="testnet">
                  Horizen Testnet (Chain ID: 2651420)
                </SelectItem>
                <SelectItem value="mainnet">
                  Horizen Mainnet (Chain ID: 26514)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customRpc">Custom RPC URL (optional)</Label>
            <Input
              id="customRpc"
              placeholder={
                network === "testnet"
                  ? "https://horizen-testnet.rpc.caldera.xyz/http"
                  : "https://horizen.calderachain.xyz/http"
              }
              value={customRpc}
              onChange={(e) => setCustomRpc(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default RPC endpoint.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trading */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="size-4" />
            Trading
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Default Slippage Tolerance</Label>
              <span className="text-sm font-medium text-foreground">
                {slippage}%
              </span>
            </div>
            <Slider
              value={[slippage]}
              onValueChange={(values) => setSlippage(values[0] ?? slippage)}
              min={0.1}
              max={10}
              step={0.1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1%</span>
              <span>10%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="size-4" />
            Display
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Currency Display</Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as "usd" | "zen")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD ($)</SelectItem>
                <SelectItem value="zen">ZEN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show toast notifications for trades and events
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-fit self-end">
        <Save className="mr-1.5 size-4" />
        Save Settings
      </Button>
    </div>
  )
}
