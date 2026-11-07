import "server-only";
import { connectDB } from "@/lib/db";
import { Generation } from "@/lib/models/generation";
import { Payment } from "@/lib/models/payment";
import { User } from "@/lib/models/user";

const DAY = 24 * 60 * 60 * 1000;

export type Overview = {
  users: { total: number; verified: number; linked: number; suspended: number; staff: number };
  signups: { today: number; week: number; month: number; byDay: { day: string; count: number }[] };
  vip: { active: number; expiringSoon: number };
  payments: { stuck: number; mismatched: number; paidWeek: number; paidMonth: number; revenueWeek: number; revenueMonth: number };
  usage: { today: number; failedToday: number; avgLatencyMs: number | null; byService: { service: string; count: number }[] };
};

const startOfUtcDay = (offset = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + offset * DAY);
};

export async function getOverview(): Promise<Overview> {
  await connectDB();
  const now = new Date();
  const today = startOfUtcDay();
  const week = startOfUtcDay(-6);
  const month = startOfUtcDay(-29);
  const soon = new Date(now.getTime() + 3 * DAY);
  const stuckBefore = new Date(now.getTime() - 30 * 60 * 1000);

  const [
    total,
    verified,
    linked,
    suspended,
    staff,
    signToday,
    signWeek,
    signMonth,
    byDay,
    vipActive,
    vipSoon,
    stuck,
    paidWeek,
    paidMonth,
    mismatched,
    genToday,
    genFailed,
    latency,
    byService,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ emailVerifiedAt: { $exists: true } }),
    User.countDocuments({ telegramId: { $exists: true } }),
    User.countDocuments({ status: "suspended" }),
    User.countDocuments({ role: { $in: ["admin", "owner"] } }),
    User.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: week } }),
    User.countDocuments({ createdAt: { $gte: month } }),
    User.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: startOfUtcDay(-13) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
    ]),
    User.countDocuments({ vipUntil: { $gt: now } }),
    User.countDocuments({ vipUntil: { $gt: now, $lte: soon } }),
    Payment.countDocuments({ status: "initiated", createdAt: { $lt: stuckBefore, $gt: new Date(now.getTime() - 3 * DAY) } }),
    Payment.aggregate<{ n: number; sum: number }>([
      { $match: { status: "paid", paidAt: { $gte: week } } },
      { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: { $ifNull: ["$quotedAmount", "$expectedAmount"] } } } },
    ]),
    Payment.aggregate<{ n: number; sum: number }>([
      { $match: { status: "paid", paidAt: { $gte: month } } },
      { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: { $ifNull: ["$quotedAmount", "$expectedAmount"] } } } },
    ]),
    Payment.countDocuments({ $expr: { $and: [{ $ne: ["$quotedAmount", null] }, { $ne: ["$quotedAmount", "$expectedAmount"] }] } }),
    Generation.countDocuments({ at: { $gte: today } }),
    Generation.countDocuments({ at: { $gte: today }, ok: false }),
    Generation.aggregate<{ avg: number }>([
      { $match: { at: { $gte: week }, latencyMs: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: "$latencyMs" } } },
    ]),
    Generation.aggregate<{ _id: string; count: number }>([
      { $match: { at: { $gte: week } } },
      { $group: { _id: "$service", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  // Fill the quiet days so the chart has a bar for every one of the last 14 days.
  const counts = new Map(byDay.map((r) => [r._id, r.count]));
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = startOfUtcDay(i - 13).toISOString().slice(0, 10);
    return { day, count: counts.get(day) ?? 0 };
  });

  return {
    users: { total, verified, linked, suspended, staff },
    signups: { today: signToday, week: signWeek, month: signMonth, byDay: days },
    vip: { active: vipActive, expiringSoon: vipSoon },
    payments: {
      stuck,
      mismatched,
      paidWeek: paidWeek[0]?.n ?? 0,
      paidMonth: paidMonth[0]?.n ?? 0,
      revenueWeek: paidWeek[0]?.sum ?? 0,
      revenueMonth: paidMonth[0]?.sum ?? 0,
    },
    usage: {
      today: genToday,
      failedToday: genFailed,
      avgLatencyMs: latency[0] ? Math.round(latency[0].avg) : null,
      byService: byService.map((r) => ({ service: r._id, count: r.count })),
    },
  };
}

export type UserFilter = "all" | "unlinked" | "vip" | "expiring" | "suspended" | "staff" | "new";
export const USER_FILTERS: { id: UserFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New (7d)" },
  { id: "unlinked", label: "No Telegram" },
  { id: "vip", label: "VIP" },
  { id: "expiring", label: "Expiring (3d)" },
  { id: "suspended", label: "Suspended" },
  { id: "staff", label: "Staff" },
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const USERS_PAGE_SIZE = 25;

export async function listUsers(opts: { q?: string; filter: UserFilter; page: number }) {
  await connectDB();
  const now = new Date();
  const query: Record<string, unknown> = {};

  switch (opts.filter) {
    case "unlinked":
      query.telegramId = { $exists: false };
      break;
    case "vip":
      query.vipUntil = { $gt: now };
      break;
    case "expiring":
      query.vipUntil = { $gt: now, $lte: new Date(now.getTime() + 3 * DAY) };
      break;
    case "suspended":
      query.status = "suspended";
      break;
    case "staff":
      query.role = { $in: ["admin", "owner"] };
      break;
    case "new":
      query.createdAt = { $gte: new Date(now.getTime() - 7 * DAY) };
      break;
  }

  const q = opts.q?.trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q.slice(0, 80)), "i");
    query.$or = [{ email: rx }, { username: rx }, { telegramId: q }, { telegramUsername: rx }];
  }

  const [rows, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * USERS_PAGE_SIZE)
      .limit(USERS_PAGE_SIZE)
      .select("email username telegramId telegramUsername role status vipUntil createdAt")
      .lean(),
    User.countDocuments(query),
  ]);
  return { rows, total, pages: Math.max(1, Math.ceil(total / USERS_PAGE_SIZE)) };
}
