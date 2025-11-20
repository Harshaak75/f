import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge as UiBadge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "../../components/ui/dialog";
import { useToast } from "../../hooks/use-toast";
import {
  Gift,
  MessageSquare,
  Trophy,
  Send,
  ArrowRight,
  RefreshCw,
  Award,
  Star,
  ArrowUp,
} from "lucide-react";
import {
  Badge,
  LeaderboardRow,
  RecognitionFeedItem,
  recognitionService,
} from "../../utils/api/admin.reward.api";

// Small spinner to use inside buttons
const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin h-4 w-4 ${className || ""}`}
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

// Skeleton block
const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

// Leaderboard row UI
const LeaderboardItem: React.FC<LeaderboardRow> = ({
  rank,
  name,
  department,
  points,
}) => (
  <TableRow
    className={`hover:bg-amber-50/50 transition-colors ${
      rank <= 3 ? "bg-amber-50 border-l-4 border-amber-400" : ""
    }`}
  >
    <TableCell className="font-semibold text-center w-12">
      {rank === 1 ? (
        <Trophy className="h-6 w-6 text-yellow-500 inline mr-1 fill-yellow-200" />
      ) : rank === 2 ? (
        <Trophy className="h-5 w-5 text-gray-400 inline mr-1 fill-gray-300" />
      ) : rank === 3 ? (
        <Trophy className="h-5 w-5 text-yellow-800 inline mr-1 fill-yellow-700/50" />
      ) : (
        <span className="text-gray-500">{rank}</span>
      )}
    </TableCell>
    <TableCell className="font-medium text-gray-800">
      {name}
      <p className="text-xs text-gray-400 mt-0.5">{department}</p>
    </TableCell>
    <TableCell className="text-right font-bold text-lg text-amber-600">
      {points.toLocaleString()}
    </TableCell>
    <TableCell className="text-center w-12">
      <ArrowUp className="h-4 w-4 text-green-500" />
    </TableCell>
  </TableRow>
);

export default function RewardsAndRecognitionDashboard() {
  const { toast } = useToast();

  // Data state
  const [feed, setFeed] = useState<RecognitionFeedItem[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [badges, setBadges] = useState<Badge[] | "FORBIDDEN" | null>(null);

  // Loading & UI state
  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Give Recognition dialog state
  const [isGiveOpen, setIsGiveOpen] = useState(false);
  const [submittingRecognition, setSubmittingRecognition] = useState(false);
  const [receiverId, setReceiverId] = useState("");
  const [selectedBadgeId, setSelectedBadgeId] = useState("");
  const [message, setMessage] = useState("");

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [feedRes, lbRes] = await Promise.all([
        recognitionService.getFeed(),
        recognitionService.getLeaderboard(),
      ]);
      setFeed(feedRes);
      setLeaderboard(lbRes);

      // Try loading badges (admin only)
      try {
        const badgeRes = await recognitionService.getBadges();
        setBadges(badgeRes);
      } catch (err: any) {
        // If 403, hide badges admin card gracefully
        if (err?.response?.status === 403) {
          setBadges("FORBIDDEN");
        } else {
          setBadges(null);
          console.error("Badges load error:", err);
        }
      }

      setLastRefreshedAt(new Date());
    } catch (err: any) {
      toast({
        title: "Failed to load data",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
      setFeed([]);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit =
    receiverId.trim() && selectedBadgeId.trim() && message.trim();

  const handleGiveRecognition = async () => {
    if (!canSubmit) return;
    setSubmittingRecognition(true);
    try {
      await recognitionService.giveRecognition({
        receiverId: receiverId.trim(),
        badgeId: selectedBadgeId.trim(),
        message: message.trim(),
      });
      toast({
        title: "Recognition sent 🎉",
        description: "Your shout-out is now live on the wall.",
      });

      // Reset form + close
      setReceiverId("");
      setSelectedBadgeId("");
      setMessage("");
      setIsGiveOpen(false);

      // Refresh feed to show the new record
      const updatedFeed = await recognitionService.getFeed();
      setFeed(updatedFeed);
    } catch (err: any) {
      toast({
        title: "Failed to send recognition",
        description: err?.response?.data?.message || err?.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingRecognition(false);
    }
  };

  const headerRight = useMemo(() => {
    return (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="text-gray-700 border-gray-300 hover:bg-gray-100 shadow-sm"
        >
          <Trophy className="mr-2 h-4 w-4" />
          Redeem Rewards
        </Button>

        <Button
          variant="default"
          className="bg-amber-600 hover:bg-amber-700 shadow-md"
          onClick={() => setIsGiveOpen(true)}
        >
          {submittingRecognition ? (
            <Spinner className="mr-2" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Give Recognition
        </Button>

        <Button
          variant="outline"
          onClick={refreshAll}
          disabled={loading}
          className="border-gray-300"
        >
          {loading ? (
            <Spinner className="mr-2" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>
    );
  }, [loading, submittingRecognition]);

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Gift className="h-7 w-7 text-amber-600" />
            Rewards & Recognition Center
          </h1>
          <p className="text-gray-500 mt-1">
            Celebrate peers, track performance, and view company achievements.
          </p>
          {lastRefreshedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last refreshed: {lastRefreshedAt.toLocaleString()}
            </p>
          )}
        </div>
        {headerRight}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recognition Wall */}
        <Card className="p-6 shadow-xl lg:col-span-2">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-600" />
            Recognition Wall
          </h2>

          {/* Feed content */}
          {!feed ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : feed.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded-lg p-6 bg-white">
              No recognitions yet. Be the first to celebrate a teammate!
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 border border-gray-100 rounded-xl bg-white hover:shadow-sm transition-shadow flex items-start gap-4"
                >
                  <div className="flex-shrink-0">
                    <Star className="h-6 w-6 text-amber-500 fill-amber-100" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm text-gray-800">
                      <span className="font-bold text-indigo-600">
                        {rec.receiver}
                      </span>{" "}
                      recognized by{" "}
                      <span className="text-gray-600">{rec.sender}</span>
                    </p>
                    <UiBadge className="mt-1 bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-semibold">
                      {rec.award}
                    </UiBadge>
                    <p className="text-sm text-gray-500 mt-2 italic">
                      "{rec.message}"
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 pt-1">
                    {new Date(rec.date).toLocaleString()}
                  </div>
                </div>
              ))}

              <Button variant="link" className="mt-2 p-0 text-amber-600 h-auto">
                View Full Recognition History{" "}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          )}
        </Card>

        {/* Leaderboard + Badges */}
        <div className="lg:col-span-1 space-y-6">
          {/* Leaderboard */}
          <Card className="p-6 shadow-xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-500" />
              Top Point Earners
            </h3>

            {!leaderboard ? (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-sm text-gray-500">
                No leaderboard data yet.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[10%] text-center text-gray-600">
                      Rank
                    </TableHead>
                    <TableHead className="w-[50%] text-gray-600">
                      Employee
                    </TableHead>
                    <TableHead className="w-[30%] text-right text-gray-600">
                      Points
                    </TableHead>
                    <TableHead className="w-[10%] text-center text-gray-600">
                      Trend
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((row) => (
                    <LeaderboardItem key={row.rank} {...row} />
                  ))}
                </TableBody>
              </Table>
            )}

            <Button variant="link" className="mt-4 p-0 text-blue-600 h-auto">
              View Full Leaderboard
            </Button>
          </Card>

          {/* Badges (admin only – hide if 403) */}
          {badges !== "FORBIDDEN" && (
            <Card className="p-6 shadow-xl">
              <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Available Recognition Badges
              </h3>

              {badges === null ? (
                <div className="space-y-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : badges && badges.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {badges.map((b) => {
                    const hasHex = /^#([0-9a-f]{3}){1,2}$/i.test(b.color);
                    return (
                      <UiBadge
                        key={b.id}
                        className={`px-3 py-1 text-sm font-medium shadow-md ${
                          hasHex ? "" : `${b.color} text-white`
                        }`}
                        style={
                          hasHex
                            ? { backgroundColor: b.color, color: "#fff" }
                            : {}
                        }
                        title={`${b.name} — ${b.points} pts`}
                      >
                        {/* we don't dynamically eval icon names; show a dot if color present */}
                        <span className="inline-block w-2 h-2 rounded-full bg-white/70 mr-2" />
                        {b.name} ({b.points})
                      </UiBadge>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No badges configured yet.
                </div>
              )}

              <Button variant="link" className="mt-4 p-0 text-green-600 h-auto">
                Manage Badges & Tiers
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Give Recognition Dialog */}
      <Dialog open={isGiveOpen} onOpenChange={setIsGiveOpen}>
        <DialogContent className="w-full max-w-lg">
          <DialogTitle>Give Recognition</DialogTitle>
          <DialogDescription>Send a shout-out to a teammate.</DialogDescription>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">
                Receiver ID
              </label>
              <input
                type="text"
                className="p-2 mt-2 border border-gray-300 rounded-md"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="paste receiver's userId"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700">Badge</label>
              <select
                className="p-2 mt-2 border border-gray-300 rounded-md"
                value={selectedBadgeId}
                onChange={(e) => setSelectedBadgeId(e.target.value)}
                disabled={badges === "FORBIDDEN" || !Array.isArray(badges)}
              >
                <option value="">Select a badge</option>
                {Array.isArray(badges) &&
                  badges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.points})
                    </option>
                  ))}
              </select>
              {badges === "FORBIDDEN" && (
                <p className="text-xs text-gray-400 mt-1">
                  You don’t have access to badge list. Ask an admin to confirm
                  badge IDs.
                </p>
              )}
            </div>

            <div className="sm:col-span-2 flex flex-col">
              <label className="text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                className="p-2 mt-2 border border-gray-300 rounded-md min-h-[100px]"
                placeholder="Say what they did great!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGiveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGiveRecognition}
              disabled={!canSubmit || submittingRecognition}
              className={`bg-amber-600 hover:bg-amber-700 ${
                submittingRecognition ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {submittingRecognition ? (
                <Spinner className="mr-2" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {submittingRecognition ? "Sending..." : "Send Recognition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
