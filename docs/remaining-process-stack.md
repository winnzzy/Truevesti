# Truevestii Remaining Process Stack

This is the working stack for finishing the prototype into a production-shaped platform. Items are ordered by risk and dependency.

## 1. Production Readiness Gate

Status: in progress

- Add an admin-only readiness endpoint.
- Show missing provider secrets and unsafe prototype modes inside Admin.
- Keep secret values hidden.

## 2. Real OAuth Account Creation

Status: pending

- Exchange Google, Apple, and Microsoft authorization codes for provider tokens.
- Verify ID tokens.
- Upsert users by verified provider email.
- Create sessions without requiring a password.

## 3. Email Delivery

Status: pending

- Connect Resend, SendGrid, or SES.
- Send verification, OTP, password reset, support, deposit, investment, and withdrawal messages.
- Add delivery audit events.

## 4. KYC And Compliance Review

Status: pending

- Add admin KYC decision UI.
- Add provider adapter for identity checks.
- Store provider references and rejection reasons.
- Block withdrawals when required KYC is pending or rejected.

## 5. Deposit Confirmation Flow

Status: pending

- Replace mock/manual deposit behavior with signed provider webhooks.
- Add duplicate webhook handling.
- Add admin-safe deposit review and confirmation history.

## 6. Transaction Monitoring

Status: pending

- Add AML/risk scoring provider adapter.
- Flag risky deposits and withdrawals.
- Require admin review for elevated-risk activity.

## 7. Admin Operations Workbench

Status: pending

- Manage users, KYC, support tickets, withdrawals, and plan settings from Admin.
- Add row-level decision actions with audit logs.
- Add filtering and search.

## 8. Notification Center

Status: pending

- Mark notifications as read.
- Add notification preferences.
- Add email/in-app delivery status.

## 9. Automated Tests

Status: pending

- Add API integration tests for auth, deposits, investments, withdrawals, admin access, and support.
- Add frontend smoke tests for signup, dashboard, and admin lockout.

## 10. Deployment Hardening

Status: pending

- Replace development secrets.
- Enforce HTTPS/cookies/proxy settings.
- Add backups, monitoring, logging retention, and incident runbooks.
