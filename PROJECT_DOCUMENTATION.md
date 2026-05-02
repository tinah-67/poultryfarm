# BroilerHub Project Documentation

## Project Overview

BroilerHub is a React Native poultry farm management application. It records farm, batch, feed, mortality, vaccination, expense, and sales data using a local SQLite database, then produces operational reports and reminders for users.

## Main Modules

- Authentication: login, owner registration, staff account creation, password recovery, recovery question setup.
- Farm Management: add, view, edit, delete, and summarize farms.
- Batch Management: create, view, edit, complete, and delete poultry batches.
- Feed Records: record feed use by type and calculate remaining feed from farm feed purchases.
- Mortality Records: record bird deaths and causes.
- Vaccination Records: record vaccinations, next due dates, and follow-up completion.
- Expense Records: record farm-wide and batch-specific expenses.
- Sales Records: record sales, revenue, and remaining birds.
- Reports: generate filtered reports for batches, sales, expenses, feed, mortality, and vaccinations.
- Reminders: store farm alerts in an inbox-style message screen with read and unread state.
- Backup Sync: send unsynced records to the backup server.
- Help: role-based help, login help, and an online user manual link that is enabled only when the manual URL is reachable.

## Database Tables

- users
- farms
- batches
- feed_records
- mortality_records
- vaccination_records
- expenses
- sales
- app_session
- notification_delivery_log
- notification_inbox

## User Roles

- Owner: manages farms, staff accounts, batches, reports, sales, expenses, feed, mortality, and vaccinations.
- Manager: manages batches, farm expenses, sales, reports, and farm performance views.
- Worker: records feed, mortality, and vaccination data, and views relevant reports/reminders.

## Reports And Queries

The Reports module supports:

- Batch Report
- Sales Report
- Expense Report
- Feed Report
- Mortality Report
- Vaccination Report

Reports include summary cards, table views, date filters, farm filters, batch filters, and Excel export.

The Search module provides cross-module queries across farms, batches, sales, expenses, feed, mortality, and vaccinations.

## Validation Checks

- Required fields are checked before saving records.
- Email format and password strength are validated during registration and password reset.
- Numeric fields such as chicks, feed quantity, mortality count, expenses, and sales values are checked.
- Batch start dates cannot be later than today.
- Sales cannot exceed available birds.
- Feed type is checked against recommended batch age stage.
- Completed batches block new feed, mortality, vaccination, expense, and sales entries.
- Duplicate farms are blocked for the same owner.

## Security And Integrity

- Role-based access controls restrict owner, manager, and worker actions.
- Staff accounts must be linked to an owner account.
- Soft deletes preserve record history using deleted_at fields.
- Synced flags track backup state for each major data table.
- Recovery questions support password reset.
- Reminder messages are stored in notification_inbox and tracked with read_at.

## Suggested Presentation Test Cases

1. Register an owner account and log in.
2. Add a farm and confirm duplicate farm prevention.
3. Create a batch with valid chicks and purchase cost.
4. Record a farm feed purchase under farm expenses.
5. Record feed usage and show remaining feed calculation.
6. Record mortality and confirm the report updates.
7. Record vaccination with a next due date and show reminders.
8. Record sales and confirm sales cannot exceed available birds.
9. Open Reports, filter by farm/batch/date, and export Excel.
10. Open Reminders and show inbox-style messages with unread/read behavior.
11. Demonstrate role restrictions with owner, manager, and worker accounts.
