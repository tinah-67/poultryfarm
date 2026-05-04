import {
  getAccessibleFarms,
  getBatchesByFarmId,
  getFeedRecordsByBatchId,
  getMortalityRecordsByBatchId,
  getSalesByBatchId,
  getUserById,
  getVaccinationRecordsByBatchId,
} from '../database/db';

// Orders reminder priorities so critical items appear before warnings and info.
export const SEVERITY_ORDER = {
  critical: 0,
  warning: 1,
  info: 2,
};

// Defines age checkpoints where active batches should produce milestone reminders.
const MILESTONE_DAYS = [7, 14, 21, 28, 35, 42];

// Parses stored date strings as local dates to avoid timezone shifts in reminder math.
const parseLocalDate = value => {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();

  if (!rawValue) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const [year, month, day] = rawValue.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(rawValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// Normalizes a date to midnight for day-level comparisons.
const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Calculates the whole-day difference between two dates.
const getDaysBetween = (firstDate, secondDate) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(firstDate).getTime() - startOfDay(secondDate).getTime()) / millisecondsPerDay);
};

// Builds a readable label for batch-related reminders.
const getBatchLabel = batch => {
  const breed = String(batch?.breed || '').trim();
  const startDate = String(batch?.start_date || '').trim();

  if (breed && startDate) {
    return `${breed} batch (${startDate})`;
  }

  if (breed) {
    return `${breed} batch`;
  }

  return `Batch #${batch?.batch_id ?? 'N/A'}`;
};

// Determines which reminder categories each role is allowed to see.
export const canRoleSeeNotification = (role, notificationType) => {
  if (role === 'owner') {
    return true;
  }

  if (role === 'manager') {
    return [
      'Vaccination',
      'Mortality',
      'Sale readiness',
      'Feed records',
      'Low birds',
      'Batch status',
    ].includes(notificationType);
  }

  if (role === 'worker') {
    return [
      'Vaccination',
      'Mortality',
      'Feed records',
    ].includes(notificationType);
  }

  return false;
};

// Converts callback-style database helpers into promises for reminder generation.
const toPromise = executor =>
  new Promise(resolve => {
    executor(resolve);
  });

// Promise wrappers for the database reads needed by the reminder engine.
const getUserByIdAsync = userId => toPromise(resolve => getUserById(userId, resolve));
const getAccessibleFarmsAsync = userId => toPromise(resolve => getAccessibleFarms(userId, resolve));
const getBatchesByFarmIdAsync = farmId => toPromise(resolve => getBatchesByFarmId(farmId, resolve));
const getFeedRecordsByBatchIdAsync = batchId => toPromise(resolve => getFeedRecordsByBatchId(batchId, resolve));
const getMortalityRecordsByBatchIdAsync = batchId => toPromise(resolve => getMortalityRecordsByBatchId(batchId, resolve));
const getSalesByBatchIdAsync = batchId => toPromise(resolve => getSalesByBatchId(batchId, resolve));
const getVaccinationRecordsByBatchIdAsync = batchId => toPromise(resolve => getVaccinationRecordsByBatchId(batchId, resolve));

// Sorts reminder items by severity and title for stable display.
export const sortNotifications = items =>
  items.slice().sort((left, right) => {
    const severityDifference = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];

    if (severityDifference !== 0) {
      return severityDifference;
    }

    return left.title.localeCompare(right.title);
  });

// Filters reminders by role and then sorts them for display.
export const filterNotificationsForRole = (items, role) =>
  sortNotifications(items.filter(item => canRoleSeeNotification(role, item.type)));

// Loads farm and batch data, generates reminders, and returns only items visible to the user.
export const loadNotificationsForUser = async userId => {
  if (!userId) {
    return {
      user: null,
      notifications: [],
    };
  }

  const today = startOfDay(new Date());
  const user = await getUserByIdAsync(userId);

  if (!user) {
    return {
      user: null,
      notifications: [],
    };
  }

  const farms = (await getAccessibleFarmsAsync(userId)) || [];

  if (!farms.length) {
    return {
      user,
      notifications: [],
    };
  }

  const farmNotifications = await Promise.all(
    farms.map(async farm => {
      const batches = (await getBatchesByFarmIdAsync(farm.farm_id)) || [];

      if (!batches.length) {
        return [];
      }

      const batchNotifications = await Promise.all(
        batches.map(async batch => {
          const [
            feedRecords,
            mortalityRecords,
            saleRecords,
            vaccinationRecords,
          ] = await Promise.all([
            getFeedRecordsByBatchIdAsync(batch.batch_id),
            getMortalityRecordsByBatchIdAsync(batch.batch_id),
            getSalesByBatchIdAsync(batch.batch_id),
            getVaccinationRecordsByBatchIdAsync(batch.batch_id),
          ]);

          const safeFeedRecords = feedRecords || [];
          const safeMortalityRecords = mortalityRecords || [];
          const safeSaleRecords = saleRecords || [];
          const safeVaccinationRecords = vaccinationRecords || [];
          const initialChicks = Number(batch.initial_chicks || 0);
          const totalDead = safeMortalityRecords.reduce(
            (sum, item) => sum + Number(item.number_dead || 0),
            0
          );
          const totalSold = safeSaleRecords.reduce(
            (sum, item) => sum + Number(item.birds_sold || 0),
            0
          );
          const batchLabel = getBatchLabel(batch);
          const birdsAlive = Math.max(initialChicks - totalDead - totalSold, 0);
          const mortalityRate = initialChicks > 0 ? (totalDead / initialChicks) * 100 : 0;
          const batchStartDate = parseLocalDate(batch.start_date);
          const ageInDays = batchStartDate ? getDaysBetween(today, batchStartDate) : null;
          const isActive = String(batch.status || 'active').toLowerCase() === 'active';
          const latestFeedDate = safeFeedRecords
            .map(item => parseLocalDate(item.date_recorded))
            .filter(Boolean)
            .sort((left, right) => right - left)[0] || null;
          const daysSinceLastFeed = latestFeedDate ? getDaysBetween(today, latestFeedDate) : null;
          const lowBirdThreshold = Math.max(10, Math.ceil(initialChicks * 0.1));
          const items = [];

          // Creates milestone reminders when a batch reaches key growth days.
          if (isActive && ageInDays != null && MILESTONE_DAYS.includes(ageInDays)) {
            items.push({
              id: `milestone-${batch.batch_id}-${ageInDays}`,
              severity: 'info',
              type: 'Age milestone',
              farmName: farm.farm_name,
              farmLocation: farm.location || 'N/A',
              batchLabel,
              batchId: batch.batch_id,
              title: `Batch reached day ${ageInDays}`,
              detail: `${batch.breed || 'Broiler'} batch has reached an important growth milestone.`,
            });
          }

          // Warns when mortality rises above the normal operating threshold.
          if (isActive && mortalityRate >= 5) {
            items.push({
              id: `mortality-${batch.batch_id}`,
              severity: mortalityRate >= 10 ? 'critical' : 'warning',
              type: 'Mortality',
              farmName: farm.farm_name,
              farmLocation: farm.location || 'N/A',
              batchLabel,
              batchId: batch.batch_id,
              title: 'Mortality is above the normal threshold',
              detail: `${totalDead} birds lost so far (${mortalityRate.toFixed(2)}%).`,
            });
          }

          // Flags active batches that are close to market age with birds available.
          if (isActive && ageInDays != null && ageInDays >= 49 && birdsAlive > 0) {
            items.push({
              id: `sale-ready-${batch.batch_id}`,
              severity: 'warning',
              type: 'Sale readiness',
              farmName: farm.farm_name,
              farmLocation: farm.location || 'N/A',
              batchLabel,
              batchId: batch.batch_id,
              title: 'Batch is near or at market age',
              detail: `${birdsAlive} birds are still available at approximately day ${ageInDays}.`,
            });
          }

          // Notes batches where only a small number of birds remain unsold.
          if (isActive && birdsAlive > 0 && birdsAlive <= lowBirdThreshold && totalSold > 0) {
            items.push({
              id: `low-stock-${batch.batch_id}`,
              severity: 'info',
              type: 'Low birds',
              farmName: farm.farm_name,
              farmLocation: farm.location || 'N/A',
              batchLabel,
              batchId: batch.batch_id,
              title: 'Few birds remain in this batch',
              detail: `${birdsAlive} birds are left unsold.`,
            });
          }

          // Reminds users to record feed if records are missing or stale.
          if (isActive && safeFeedRecords.length === 0) {
            items.push({
              id: `feed-missing-${batch.batch_id}`,
              severity: ageInDays != null && ageInDays >= 3 ? 'warning' : 'info',
              type: 'Feed records',
              farmName: farm.farm_name,
              farmLocation: farm.location || 'N/A',
              batchLabel,
              batchId: batch.batch_id,
              title: 'No feed records have been entered',
              detail: 'Record feed usage to keep the batch history complete.',
            });
          } else if (isActive && daysSinceLastFeed != null && daysSinceLastFeed >= 2) {
            items.push({
              id: `feed-stale-${batch.batch_id}`,
              severity: 'warning',
              type: 'Feed records',
              farmName: farm.farm_name,
              farmLocation: farm.location || 'N/A',
              batchLabel,
              batchId: batch.batch_id,
              title: 'Feed records may be outdated',
              detail: `The last feed entry was ${daysSinceLastFeed} day(s) ago.`,
            });
          }

          // Creates overdue and upcoming vaccination reminders from next due dates.
          safeVaccinationRecords.forEach(record => {
            const nextDueDate = parseLocalDate(record.next_due_date);
            const dueCompletedAt = parseLocalDate(record.due_completed_at);

            if (!isActive || !nextDueDate || dueCompletedAt) {
              return;
            }

            const daysUntilDue = getDaysBetween(nextDueDate, today);

            if (daysUntilDue < 0) {
              items.push({
                id: `vaccination-overdue-${record.vaccination_id}`,
                severity: 'critical',
                type: 'Vaccination',
                farmName: farm.farm_name,
                farmLocation: farm.location || 'N/A',
                batchLabel,
                batchId: batch.batch_id,
                title: `${record.vaccine_name || 'Vaccination'} is overdue`,
                detail: `It was due on ${record.next_due_date}.`,
              });
              return;
            }

            if (daysUntilDue <= 1) {
              items.push({
                id: `vaccination-due-${record.vaccination_id}`,
                severity: daysUntilDue === 0 ? 'warning' : 'info',
                type: 'Vaccination',
                farmName: farm.farm_name,
                farmLocation: farm.location || 'N/A',
                batchLabel,
                batchId: batch.batch_id,
                title: `${record.vaccine_name || 'Vaccination'} is due soon`,
                detail: daysUntilDue === 0
                  ? `Due today (${record.next_due_date}).`
                  : `Due in ${daysUntilDue} day(s) on ${record.next_due_date}.`,
              });
            }
          });

          // Warns when a completed batch still shows birds alive.
          if (!isActive && birdsAlive > 0) {
            items.push({
              id: `completed-with-birds-${batch.batch_id}`,
              severity: 'warning',
              type: 'Batch status',
              farmName: farm.farm_name,
              farmLocation: farm.location || 'N/A',
              batchLabel,
              batchId: batch.batch_id,
              title: 'Batch is closed but birds still remain',
              detail: `${birdsAlive} birds are still recorded as alive in this completed batch.`,
            });
          }

          return items;
        })
      );

      return batchNotifications.flat();
    })
  );

  return {
    user,
    notifications: filterNotificationsForRole(farmNotifications.flat(), user.role),
  };
};
