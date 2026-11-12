# Chit Fund Management System — Project Requirements Document

**Document type:** As-built product requirements (reverse-engineered from repository)  
**Review date:** 8 October 2026  
**Status:** Draft for stakeholder validation

## 1. Purpose and scope

This application supports the day-to-day administration of a chit fund business. It provides one authenticated web application with three role-based workspaces: **Admin**, **Staff**, and **Field Agent**. Users manage customers, chit groups, memberships/tickets, periodic dues and collections, auctions, dividends, prize disbursements, business expenses, and operational reports.

This document describes capabilities evidenced in the current codebase. It is not a claim that every feature is production-ready. Items requiring business policy decisions and implementation inconsistencies are listed in Sections 9–10.

## 2. Business context and operating model

A chit group has a defined chit value, member count, installment amount, duration, schedule, and foreman commission. Customers join a group through a membership/ticket. For each cycle, members owe an installment; collections are recorded against dues and produce receipts. A group auction records a winning member and bid discount. The system calculates the prize amount, commission, and member dividend; dividends can reduce member dues, and the winner's prize can be disbursed in one or more payments. The business tracks collection, due balances, expenses, payouts, and audit activity across the groups.

Typical operating flow:

1. Admin configures company settings, creates user accounts, and creates chit groups.
2. Staff registers customers, enrolls them in groups, and manages member/ticket and installment records.
3. Staff or an assigned agent collects installments, records payment mode/date/reference, and issues a receipt.
4. Admin records a group's auction and winner; the system computes prize and dividend values.
5. Admin tracks/disburses prize payments and records expenses.
6. Authorized users review collection, balance, group, and financial reports; audit logs record selected changes.

The above reflects available modules. Exact legal, accounting, auction, and collection policies must be confirmed by the business.

## 3. User roles and requirements

### 3.1 Admin

Admin is the privileged operator responsible for configuration, oversight, and restricted financial actions.

- Sign in and see an operational dashboard.
- Create, edit, deactivate, and manage users across admin, staff, and agent roles; reset credentials.
- Create, edit, activate/cancel, and review chit groups.
- Manage customers, memberships, installments, payments, auctions, dividends, expenses, and prize payments through shared operational modules.
- Record and amend auction outcomes; administer dividend records and prize disbursements.
- Reverse a payment only with a recorded reason.
- Review reports, daily/monthly collections, balance sheet, company settings, notifications, and audit logs.
- Search and navigate to customer/group records and view/print payment receipts.

### 3.2 Staff

Staff supports customer service and daily fund operations.

- Sign in and see the shared operational dashboard.
- Register/update customers and enroll them in chit groups.
- Review groups, memberships, installments, and booking lists.
- Record payments against installments, capture payment mode/date/reference/remarks, and provide receipts.
- View collection, due, and balance reports and customer/payment histories.
- Use shared operational screens subject to API permissions.

The UI exposes multiple shared screens to staff, but the API's authorization rules are not consistently role-specific. See Section 10.

### 3.3 Field Agent

Agent is a field collection user with a dedicated, simplified workspace.

- View agent dashboard, collection summary/trend, and agent profile.
- Review a collection sheet and due/overdue bills; filter/search collection work.
- Record a customer payment with amount, payment method, and notes.
- Review/download collection receipts and view collection/commission summaries.
- View notifications and assigned/customer collection information.
- Access customer and selected collection/balance screens exposed in the agent workspace.

The backend includes agent-specific data queries and tries to scope agent records by collector or customer assignment. Assignment administration and the precise permissions for each agent screen need validation.

## 4. Functional requirements

### FR-01 Authentication and sessions

- Users must sign in with username and password; inactive accounts are rejected.
- The application must return the authenticated user's identity and role and restrict the workspace by role.
- Protected API operations must require a valid, unexpired bearer token.
- Logout must clear the browser's saved session.

### FR-02 Customer management

- Store a unique customer identifier and personal/contact details, address, identity proof, nominee, joining date, and relevant co-applicant/security contact details.
- Search/list customers and open a customer record with membership, payment, and installment history.
- Create, update, and deactivate/remove customer records according to business policy.

### FR-03 Chit group management

- Maintain group identifier/name, chit value, number of members, installment, tenure, dates, auction day/frequency, foreman commission, status, and description.
- List/filter groups and view group members and auctions.
- Enforce unique group identifiers and protect referential integrity for dependent records.

### FR-04 Membership and booking

- Enroll a customer in a group with membership ID, ticket number, joining date, installment, and status.
- Track paid/pending installment counts and amounts.
- Prevent duplicate ticket numbers within a group; duplicate customer participation must follow an explicit policy.

### FR-05 Installments and collection

- Create or manage dues by membership, group, month, and due date, including base amount, dividend deduction, net due, paid amount, and status.
- Support pending, partially paid, paid, and overdue states.
- Record a payment with amount, date, mode, transaction reference, collector, and remarks.
- Calculate previous and remaining balances consistently and update the relevant installment/membership balances.
- Issue a unique receipt with customer, group, ticket, cycle, amount, balance, payment mode, and collector details.
- Allow authorized administrator reversal with a mandatory reason and retained history.

### FR-06 Auctions and dividends

- Record one auction per group cycle with date, winning membership, bid discount, and remarks.
- Calculate prize amount, foreman commission, total distributable dividend, and dividend per eligible member.
- Store dividend review/confirmation/distribution status and apply the agreed dividend deduction to eligible dues.
- Prevent duplicate auction cycle numbers within a group.

### FR-07 Prize disbursement

- Create a prize obligation for the auction winner and track pending, partially paid, and paid amounts.
- Record each disbursement's amount, date, mode, reference, and remarks; preserve the outstanding balance.

### FR-08 Expenses and financial views

- Record business expense date, category, description, amount, mode, reference, creator, and remarks.
- Present daily and monthly collection views and a balance sheet/financial summary.
- Provide filtered operational and financial reports suitable for review/export/printing where implemented.

### FR-09 Users, settings, audit, notifications

- Admin manages users, status, role, and credentials.
- Admin maintains company contact details, currency, financial-year and numbering/commission settings.
- Record auditable actor/action/module/record and before/after values for important changes.
- Show notices for upcoming/overdue installments, upcoming auctions, pending prize payments, and general messages; allow read state where implemented.

### FR-10 Navigation and usability

- Provide role-aware navigation, responsive layouts, global search, filters, pagination where needed, clear status indicators, loading/error feedback, and accessible receipt viewing/printing.

## 5. Data requirements

The principal entities are **User**, **Company Settings**, **Customer**, **Chit Group**, **Membership**, **Installment**, **Payment**, **Auction**, **Dividend**, **Prize Payment**, **Expense**, **Notification**, and **Audit Log**. Relationships include customer-to-membership, group-to-membership, membership-to-installments/payments, group-to-auctions/dividends, auction-to-winner/prize payment, and user-to-collected payment/expense/audit event.

Financial amounts should use fixed precision (the SQL schema specifies `DECIMAL(12,2)`). Identifiers and ticket/auction numbering must be unique in their defined scope. Personal information and identity proof data require restricted access and secure handling.

## 6. Technology stack and architecture (observed)

| Layer | Technology evidenced in repository |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Lucide React, Motion |
| Backend | Node.js, TypeScript, Express 4; REST API under `/api` |
| Database | MySQL via `mysql2`; MySQL 8 schema and seed scripts are provided |
| Authentication | Bearer token with HMAC-SHA256 signing; password hashes support SHA-256 and bcrypt comparison |
| Build/run | `tsx` for development; Vite build plus esbuild server bundle; `npm run dev/build/start/lint` |
| Legacy/alternate assets | A separate PHP backend/API and multiple ZIP/build artifacts are present; the active Express server mounts `server/api.ts`, not those PHP endpoints |

The browser calls the Express REST API and stores the token/user in local storage. The Express process serves the Vite SPA in development and built static assets in production. The database module connects directly to MySQL and also contains startup table creation/seeding logic. `docs/DATABASE_SETUP.md` additionally describes an embedded JSON storage/failover approach, but that does not match the inspected `server/db.ts`; deployment configuration must be reconciled.

## 7. Core business rules evidenced in code/schema

- Supported payment modes include cash, UPI, bank transfer, cheque, and other.
- Group statuses include upcoming, active, completed, and cancelled.
- Membership statuses include active, prized, completed, and cancelled.
- Installments can be pending, partially paid, paid, or overdue.
- Prize payments can be pending, partially paid, or paid.
- Auction calculations include a configurable foreman commission (default shown as 5% in code/schema).
- Money is represented as decimal values in MySQL; calculations and rounding behavior should be centrally defined and verified.

## 8. Non-functional requirements

- **Security:** Enforce authorization on the server for every operation; protect credentials, identity information, and financial records; use secure production secrets and HTTPS; avoid exposing credentials in source/configuration.
- **Integrity:** Financial operations must be transactional, idempotency/duplicate handling should be defined, and all balance changes should be traceable.
- **Auditability:** Preserve payment reversals and material edits with actor, timestamp, reason, and before/after values.
- **Availability and recovery:** Define backup frequency, restore objectives, database monitoring, and recovery procedure.
- **Performance:** Support searchable/filterable lists and dashboard summaries over operational data with indexes and bounded API responses.
- **Usability:** Support desktop and field/mobile use, including legible collection workflows and printable receipts.
- **Maintainability:** Keep API, database schema, seed data, deployment guide, and role matrix consistent; remove or clearly label stale artifacts.

## 9. Out of scope or not established by code

No customer self-service portal/mobile app, online payment gateway, SMS/WhatsApp delivery, automated recurring debit, accounting-system integration, KYC verification provider, or legally compliant auction workflow is evidenced. Treat these as future scope unless stakeholders confirm otherwise. The repository does not establish jurisdictional compliance requirements.

## 10. Gaps and decisions to validate

1. **Three-role schema mismatch:** `server/db.ts` creates `admin`, `staff`, and `agent`, while `database/schema.sql` defines only `admin` and `staff`. Align canonical schema, migrations, and seed data.
2. **Permission model:** Several Express routes require only authentication even when they mutate financial or operational records; only selected actions use `requireAdmin`. Define a least-privilege role/action matrix and enforce it server-side. UI hiding alone is insufficient.
3. **Credential/token security:** The inspected source has fallback database credentials and a fallback JWT secret; SHA-256 password verification is supported. Production must use secret configuration and an adaptive password hashing scheme, with credential rotation and session invalidation policy.
4. **Agent assignment and data visibility:** Confirm how customers are assigned to agents, who can change assignments, and whether agents may access customer records beyond assigned routes.
5. **Database/deployment documentation drift:** Docs mention JSON persistence/failover and a different DB setup than the active MySQL-only connection code appears to implement. Confirm production topology and update setup instructions.
6. **Auction and accounting rules:** Confirm exact formulas, eligibility rules, rounding, dividend application timing, partial payment rules, overdue logic, and cancellation/reversal behavior with the fund operator/accountant.
7. **Reporting:** Confirm required reports, filters, exports, date/time zone, financial-year boundaries, and reconciliation expectations.
8. **Personal data:** Confirm retention, masking, permissions, backup encryption, and deletion rules for ID proofs and nominee/security details.
9. **Product completeness:** Some screens/API capabilities may be partial or inconsistent; confirm which are acceptance-critical before treating this document as a delivery baseline.

## 11. Acceptance criteria for a validated release

- Admin, staff, and agent can sign in and only perform approved role actions; unauthorized API requests are denied.
- Admin can configure a group, staff can register/enroll a customer, and installment obligations are visible for the member.
- Staff/assigned agent can record an allowed collection; balances update once, and a unique printable receipt is available.
- An authorized admin can record an auction, review the calculated values, confirm dividends, and track partial/full prize disbursement.
- Daily/monthly collection and outstanding balances reconcile to the underlying payment and installment records.
- Material changes and payment reversals are attributable and retained in audit history.
- The canonical schema and setup guide install the same role model and features as the running application.
- Agreed security, backup, recovery, and personal-data handling requirements are documented and met.

## 12. Source areas reviewed

Requirements were derived from `fund/src/App.tsx`, role-specific view folders under `fund/src/views/`, `server/api.ts`, `server/auth.ts`, `server/db.ts`, `database/schema.sql`, `database/seed.sql`, `package.json`, and `docs/DATABASE_SETUP.md`. The PHP backend and generated ZIP/build artifacts were treated as alternate/legacy until confirmed otherwise.
