// src/controllers/analyticsController.ts
import { Request, Response } from 'express';
import Event from '../models/Event';
import { PipelineStage } from 'mongoose';
import { cacheKey } from '../config/redis';
import { getCache, setCache } from '../config/cache';

const parseDate = (d?: string) => d ? new Date(d) : undefined;

/**
 * GET /api/analytics/metrics
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const { event, interval = 'daily', orgId, projectId, startDate, endDate } = req.query as any;
    if (!event) return res.status(400).json({ success: false, error: 'event query param is required' });

    const start = parseDate(startDate) ?? new Date(0);
    const end = parseDate(endDate) ?? new Date();

    let format = '%Y-%m-%d';
    if (interval === 'hourly') format = '%Y-%m-%dT%H:00:00Z';
    if (interval === 'weekly') format = '%Y-%V';

    const match: any = {
      eventName: event,
      timestamp: { $gte: start, $lte: end },
    };
    if (orgId) match.orgId = orgId;
    if (projectId) match.projectId = projectId;

    const pipeline: PipelineStage[] = [
      { $match: match },
      { $project: { period: { $dateToString: { format, date: '$timestamp' } } } },
      { $group: { _id: '$period', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: '$_id', count: 1 } },
    ];

    const key = cacheKey({
      t: 'metrics',
      event,
      interval,
      orgId: orgId || null,
      projectId: projectId || null,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const cached = await getCache<any[]>(key);
    if (cached) {
      return res.json({ success: true, event, interval, data: cached, cached: true });
    }

    const results = await Event.aggregate(pipeline).allowDiskUse(true);
    await setCache(key, results, 60 * 5); // 5 min cache

    return res.json({ success: true, event, interval, data: results });
  } catch (err: any) {
    console.error('getMetrics error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/analytics/funnels
 */
export const postFunnel = async (req: Request, res: Response) => {
  try {
    const { steps, orgId, projectId, startDate, endDate } = req.body as any;
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ success: false, error: 'steps array is required in body' });
    }

    const start = parseDate(startDate) ?? new Date(0);
    const end = parseDate(endDate) ?? new Date();

    const key = cacheKey({
      t: 'funnels',
      steps: steps.join(','),
      orgId: orgId || null,
      projectId: projectId || null,
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const cached = await getCache<any>(key);
    if (cached) return res.json({ ...cached, cached: true });

    const match: any = {
      eventName: { $in: steps },
      timestamp: { $gte: start, $lte: end },
    };
    if (orgId) match.orgId = orgId;
    if (projectId) match.projectId = projectId;

    const pipeline: any[] = [
      { $match: match },
      { $group: { _id: { userId: '$userId', eventName: '$eventName' }, firstTs: { $min: '$timestamp' } } },
      { $group: { _id: '$_id.userId', events: { $push: { k: '$_id.eventName', v: '$firstTs' } } } },
      { $project: { userId: '$_id', eventMap: { $arrayToObject: '$events' } } },
    ];

    const stepChecks: any = {};
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      stepChecks[`has_${i}`] = { $cond: [{ $ifNull: [`$eventMap.${step}`, false] }, true, false] };
    }

    const orderChecks: any = {};
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      const cur = steps[i];
      orderChecks[`ordered_${i}`] = {
        $and: [
          { $gt: [`$eventMap.${cur}`, null] },
          { $gt: [`$eventMap.${prev}`, null] },
          { $gt: [`$eventMap.${cur}`, `$eventMap.${prev}`] },
        ],
      };
    }

    pipeline.push({ $project: { userId: 1, ...stepChecks, ...orderChecks } });

    const countProj: any = { _id: null, totalUsers: { $sum: 1 } };
    for (let i = 0; i < steps.length; i++) {
      countProj[`step_${i + 1}`] = { $sum: { $cond: [`$has_${i}`, 1, 0] } };
      if (i >= 1) countProj[`step_${i + 1}_ordered`] = { $sum: { $cond: [`$ordered_${i}`, 1, 0] } };
    }
    pipeline.push({ $group: countProj });

    const aggRes = await Event.aggregate(pipeline).allowDiskUse(true);
    const totals = aggRes[0] ?? { totalUsers: 0 };

    const stepsResult = steps.map((s: string, idx: number) => ({
      step: s,
      users: totals[`step_${idx + 1}`] ?? 0,
      users_in_order: idx >= 1 ? totals[`step_${idx + 1}_ordered`] ?? 0 : totals[`step_${idx + 1}`] ?? 0,
    }));

    const response = { success: true, totalUsers: totals.totalUsers ?? 0, steps: stepsResult };
    await setCache(key, response, 60 * 5);

    return res.json(response);
  } catch (err: any) {
    console.error('postFunnel error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/analytics/retention
 */
export const getRetention = async (req: Request, res: Response) => {
  try {
    const { cohort, startDate, days = '7', orgId, projectId } = req.query as any;

    if (!cohort) return res.status(400).json({ success: false, error: 'cohort is required' });

    // Use provided startDate, or default to 7 days ago
    const cohortDay = startDate ? new Date(startDate) : new Date();
    cohortDay.setHours(0, 0, 0, 0);
    if (!startDate) cohortDay.setDate(cohortDay.getDate() - 7); // default start 7 days ago

    const daysNum = parseInt(days, 10) || 7;

    const key = cacheKey({
      t: 'retention',
      cohort,
      startDate: cohortDay.toISOString(),
      days: daysNum,
      orgId: orgId || null,
      projectId: projectId || null,
    });

    const cached = await getCache<any>(key);
    if (cached) return res.json({ ...cached, cached: true });

    // Find cohort users (who did the initial event on the cohortDay)
    const cohortStart = new Date(cohortDay);
    const cohortEnd = new Date(cohortDay);
    cohortEnd.setDate(cohortEnd.getDate() + 1);

    const cohortMatch: any = {
      eventName: cohort,
      timestamp: { $gte: cohortStart, $lt: cohortEnd },
    };
    if (orgId) cohortMatch.orgId = orgId;
    if (projectId) cohortMatch.projectId = projectId;

    const cohortUsers: string[] = await Event.distinct('userId', cohortMatch);

    if (!cohortUsers.length) {
      const emptyRes = { success: true, cohortSize: 0, retention: [] };
      await setCache(key, emptyRes, 60 * 5);
      return res.json(emptyRes);
    }

    const retention = [];
    for (let i = 0; i < daysNum; i++) {
      const dStart = new Date(cohortStart);
      dStart.setDate(dStart.getDate() + i);
      const dEnd = new Date(dStart);
      dEnd.setDate(dEnd.getDate() + 1);

      const matchAny: any = {
        userId: { $in: cohortUsers },
        timestamp: { $gte: dStart, $lt: dEnd },
      };
      if (orgId) matchAny.orgId = orgId;
      if (projectId) matchAny.projectId = projectId;

      const usersCount = await Event.distinct('userId', matchAny).then(arr => arr.length);
      retention.push({
        day: i,
        count: usersCount,
        percent: Math.round((usersCount / cohortUsers.length) * 10000) / 100,
      });
    }

    const finalRes = { success: true, cohortSize: cohortUsers.length, retention };
    await setCache(key, finalRes, 60 * 5);
    return res.json(finalRes);
  } catch (err: any) {
    console.error('getRetention error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


/**
 * GET /api/analytics/users/:id/journey
 */
export const getUserJourney = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { orgId, projectId, startDate, endDate, limit = '100' } = req.query as any;

    const key = cacheKey({
      t: 'journey',
      userId: id,
      orgId: orgId || null,
      projectId: projectId || null,
      startDate: startDate || null,
      endDate: endDate || null,
      limit,
    });

    const cached = await getCache<any>(key);
    if (cached) return res.json({ ...cached, cached: true });

    const match: any = { "metadata.userId": id };
    if (orgId) match.orgId = orgId;
    if (projectId) match.projectId = projectId;
    if (startDate || endDate) {
      match["metadata.timestamp"] = {};
      if (startDate) match["metadata.timestamp"].$gte = new Date(startDate);
      if (endDate) match["metadata.timestamp"].$lte = new Date(endDate);
    }

    const events = await Event.find(match)
      .sort({ "metadata.timestamp": 1 })
      .limit(parseInt(limit, 10))
      .lean();

    const result = { success: true, events };
    await setCache(key, result, 60 * 5);

    return res.json(result);
  } catch (err: any) {
    console.error('getUserJourney error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


