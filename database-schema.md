# Campus Thrift & Exchange Hub — Database Schema Specification

> Source of truth: ERD provided for the **Campus Thrift & Exchange Hub** project.
>
> Purpose: This document is written for coding agents and developers to implement or verify the database layer consistently.

---

## 1. Project Overview

The system is a campus-focused thrift, resale, and item-exchange marketplace.

Main capabilities:

- User registration and profile management
- Student / campus item listings
- Item categories
- Favorite items
- Item-for-item exchange requests
- Transactions
- Payments
- Messaging
- Reviews
- Reports / moderation

This specification describes the database entities, keys, relationships, nullable fields, implementation expectations, and known ambiguities visible in the ERD.

---

# 2. Global Conventions

## 2.1 Primary Keys

Use the data type shown in the ERD.

- Most entities use `Guid`
- `Category.Id` uses `int`

Do **not** replace `Guid` with sequential integer IDs unless the project already has an explicit architectural requirement to do so.

---

## 2.2 Date/Time

ERD type:

```text
datetime
```

Recommended application representation:

- C#: `DateTime` / `DateTime?`
- PostgreSQL: preferably `timestamp with time zone`
- Store timestamps consistently in UTC where the existing project architecture permits it.

Fields marked with `?` are nullable.

---

## 2.3 Foreign Keys

All foreign keys must have:

- An explicit FK constraint
- An appropriate index
- Explicit delete behavior

Do not rely on implicit cascade behavior.

Recommended default:

- Use `Restrict` / `NoAction` for important business records such as transactions, payments, reviews, reports, and exchange requests.
- Use cascade deletion only for clearly dependent records when consistent with the existing application behavior.

---

## 2.4 Status and Role Fields

Several fields use `int` in the ERD.

Prefer enums in application code while storing integer values in the database.

Do not invent enum numeric values unless:

1. They already exist in the codebase, or
2. The product requirements define them.

The only values explicitly given by the ERD are:

```text
ApplicationUser.Role
0 = Student/User
1 = Admin
```

---

# 3. Entity Summary

| Entity | Primary Key | Purpose |
|---|---|---|
| `ApplicationUser` | `Guid` | Application users |
| `Category` | `int` | Item categories |
| `Item` | `Guid` | Marketplace listings |
| `Favorite` | `Guid` | User favorite items |
| `ExchangeRequest` | `Guid` | Item exchange requests |
| `Transaction` | `Guid` | Completed/in-progress marketplace transactions |
| `Payment` | `Guid` | Payment information for a transaction |
| `Message` | `Guid` | Messages between users |
| `Review` | `Guid` | Transaction reviews |
| `Report` | `Guid` | User/item reports |

> Note: `ExchangeRequest` appears twice in the source ERD. Both diagrams contain the same fields and represent **one logical table**, not two tables.

---

# 4. ApplicationUser

Represents a registered user.

## Fields

| Field | Type | Nullable | Key / Reference | Notes |
|---|---|---:|---|---|
| `Id` | `Guid` | No | PK | User identifier |
| `StudentCode` | `string` | Yes | — | Nullable for high-school users |
| `FullName` | `string` | No | — | User's full name |
| `Email` | `string` | No | — | General email validation |
| `PasswordHash` | `string` | No | — | Store password hash only |
| `PhoneNumber` | `string` | No* | — | Follow existing auth rules |
| `AvatarUrl` | `string` | No* | — | Avatar location |
| `SchoolName` | `string` | Yes | — | High school or university name |
| `IsEmailVerified` | `bool` | No | — | Email verification state |
| `Role` | `int` | No | — | `0 = Student/User`, `1 = Admin` |
| `CreatedAt` | `datetime` | No | — | Created timestamp |
| `UpdatedAt` | `datetime` | No | — | Last update timestamp |

`*` The ERD does not explicitly mark these fields nullable. Preserve existing project nullability if models already exist.

## Recommended Constraints

```text
PK: Id
UNIQUE: Email
```

Recommended:

- Normalize email for lookup if supported by the authentication architecture.
- Do not store plaintext passwords.
- Consider a unique `StudentCode` only if the business rules guarantee one student code per user.

## Relationships

```text
ApplicationUser 1 ---- N Item
ApplicationUser 1 ---- N Favorite
ApplicationUser 1 ---- N ExchangeRequest (Requester)
ApplicationUser 1 ---- N Transaction (Buyer)
ApplicationUser 1 ---- N Transaction (Seller)
ApplicationUser 1 ---- N Message
ApplicationUser 1 ---- N Review
ApplicationUser 1 ---- N Report
```

---

# 5. Category

Represents an item category.

Examples shown/implied by the ERD include categories such as books or household items.

## Fields

| Field | Type | Nullable | Key / Reference | Notes |
|---|---|---:|---|---|
| `Id` | `int` | No | PK | Category identifier |
| `Name` | `string` | No | — | Human-readable name |
| `Slug` | `string` | No | — | URL-safe category identifier |
| `CreatedAt` | `datetime` | No | — | Created timestamp |

## Recommended Constraints

```text
PK: Id
UNIQUE: Slug
```

Optionally make `Name` unique if duplicate category names are not allowed.

## Relationships

```text
Category 1 ---- N Item
```

---

# 6. Item

Represents a marketplace listing / second-hand item.

## Fields

| Field | Type | Nullable | Key / Reference | Notes |
|---|---|---:|---|---|
| `Id` | `Guid` | No | PK | Item identifier |
| `SellerId` | `Guid` | No | FK → `ApplicationUser.Id` | Owner/seller |
| `CategoryId` | `int` | No | FK → `Category.Id` | Item category |
| `Title` | `string` | No | — | Listing title |
| `Slug` | `string` | No | — | URL-safe identifier |
| `Description` | `string` | No* | — | Listing description |
| `Condition` | `int` | No | — | Item condition enum/status |
| `Location` | `string` | No* | — | Meeting location |
| `Status` | `int` | No | — | Listing state |
| `CreatedAt` | `datetime` | No | — | Created timestamp |
| `UpdatedAt` | `datetime` | No | — | Updated timestamp |

## Constraints

```text
PK: Id
FK: SellerId   -> ApplicationUser.Id
FK: CategoryId -> Category.Id
```

Recommended indexes:

```text
INDEX: SellerId
INDEX: CategoryId
INDEX: Status
INDEX: CreatedAt
INDEX/UNIQUE: Slug
```

Whether `Slug` is globally unique or only unique within a seller/category must follow existing product behavior.

## Relationships

```text
ApplicationUser 1 ---- N Item
Category        1 ---- N Item

Item 1 ---- N Favorite
Item 1 ---- N ExchangeRequest (RequestedItem)
Item 1 ---- N ExchangeRequest (OfferedItem, nullable)
Item 1 ---- N Transaction
Item 1 ---- N Report (nullable)
```

---

# 7. Favorite

Represents an item saved/favorited by a user.

## Fields

| Field | Type | Nullable | Key / Reference |
|---|---|---:|---|
| `Id` | `Guid` | No | PK |
| `UserId` | `Guid` | No | FK → `ApplicationUser.Id` |
| `ItemId` | `Guid` | No | FK → `Item.Id` |
| `CreatedAt` | `datetime` | No | — |

## Constraints

```text
PK: Id
FK: UserId -> ApplicationUser.Id
FK: ItemId -> Item.Id
UNIQUE: (UserId, ItemId)
```

The composite unique constraint is important to prevent the same user from favoriting the same item multiple times.

## Relationships

```text
ApplicationUser 1 ---- N Favorite
Item            1 ---- N Favorite
```

---

# 8. ExchangeRequest

Represents a request by one user to exchange an offered item for another item.

> The ERD draws this table twice. Implement only **one** `ExchangeRequest` entity/table.

## Fields

| Field | Type | Nullable | Key / Reference | Notes |
|---|---|---:|---|---|
| `Id` | `Guid` | No | PK | Exchange request identifier |
| `RequesterId` | `Guid` | No | FK → `ApplicationUser.Id` | User making the request |
| `RequestedItemId` | `Guid` | No | FK → `Item.Id` | Item the requester wants |
| `OfferedItemId` | `Guid` | Yes | FK → `Item.Id` | Item offered in exchange |
| `AdditionalAmount` | `decimal` | Yes | — | Extra money included in exchange |
| `Status` | `int` | No | — | Exchange request state |
| `CreatedAt` | `datetime` | No | — | Request creation time |
| `ExpiresAt` | `datetime` | No | — | Expiration time |
| `RespondedAt` | `datetime` | No* | — | Time request was answered |

## Constraints

```text
PK: Id
FK: RequesterId      -> ApplicationUser.Id
FK: RequestedItemId  -> Item.Id
FK: OfferedItemId    -> Item.Id (nullable)
```

Recommended indexes:

```text
INDEX: RequesterId
INDEX: RequestedItemId
INDEX: OfferedItemId
INDEX: Status
INDEX: ExpiresAt
```

## Business Rules

Recommended validations:

- A requester should not exchange an item with themselves.
- `RequestedItemId` and `OfferedItemId` should not reference the same item.
- If `OfferedItemId` is provided, the requester should own that item.
- The requested item must normally be available.
- An expired request should not be accepted.
- `AdditionalAmount` should not be negative unless the business model explicitly supports signed values.

Do not enforce assumptions at DB level unless confirmed by requirements.

## Relationships

```text
ApplicationUser 1 ---- N ExchangeRequest
Item            1 ---- N ExchangeRequest via RequestedItemId
Item            1 ---- N ExchangeRequest via OfferedItemId
```

---

# 9. Transaction

Represents a marketplace transaction.

## Fields

| Field | Type | Nullable | Key / Reference | Notes |
|---|---|---:|---|---|
| `Id` | `Guid` | No | PK | Transaction identifier |
| `BuyerId` | `Guid` | No | FK → `ApplicationUser.Id` | Buyer |
| `SellerId` | `Guid` | No | FK → `ApplicationUser.Id` | Seller |
| `ItemId` | `Guid` | No | FK → `Item.Id` | Item being transacted |
| `TotalAmount` | `decimal` | No | — | Total transaction value |
| `Method` | `int` | No | — | Transaction/payment method |
| `Status` | `int` | No | — | Transaction state |
| `CreatedAt` | `datetime` | No | — | Created timestamp |
| `CompletedAt` | `datetime` | Yes | — | Completion timestamp |
| `CancelledAt` | `datetime` | Yes | — | Cancellation timestamp |

## Constraints

```text
PK: Id
FK: BuyerId  -> ApplicationUser.Id
FK: SellerId -> ApplicationUser.Id
FK: ItemId   -> Item.Id
```

Recommended indexes:

```text
INDEX: BuyerId
INDEX: SellerId
INDEX: ItemId
INDEX: Status
INDEX: CreatedAt
```

## Business Rules

Recommended validation:

```text
BuyerId != SellerId
TotalAmount >= 0
```

A transaction should not normally be both completed and cancelled.

## Relationships

```text
ApplicationUser 1 ---- N Transaction as Buyer
ApplicationUser 1 ---- N Transaction as Seller
Item            1 ---- N Transaction

Transaction 1 ---- N/1 Payment
Transaction 1 ---- N Review
```

The ERD connects `Payment.TransactionId` to `Transaction.Id`.

Whether a transaction can have one or multiple payment attempts should be determined from the existing implementation.

---

# 10. Payment

Represents payment details associated with a transaction.

## Fields

| Field | Type | Nullable | Key / Reference |
|---|---|---:|---|
| `Id` | `Guid` | No | PK |
| `TransactionId` | `Guid` | No | FK → `Transaction.Id` |
| `Amount` | `int` | No | — |
| `Status` | `int` | No | — |
| `PaymentUrl` | `string` | No* | — |
| `TransactionRef` | `string` | No* | — |
| `CreatedAt` | `datetime` | No | — |

## Important Type Note

The ERD explicitly shows:

```text
Payment.Amount = int
```

while:

```text
Transaction.TotalAmount = decimal
ExchangeRequest.AdditionalAmount = decimal?
```

Do not silently change this when reproducing the ERD.

However, if the application handles fractional currency values or uses a consistent money strategy, review this discrepancy before migration.

Possible strategies:

- Keep `int` as smallest currency unit, e.g. VND
- Change all monetary values to a consistent decimal representation after explicit project approval

## Constraints

```text
PK: Id
FK: TransactionId -> Transaction.Id
```

Recommended indexes:

```text
INDEX: TransactionId
INDEX: Status
INDEX/UNIQUE: TransactionRef
```

Do not enforce `TransactionRef` uniqueness if the payment provider semantics do not guarantee uniqueness.

---

# 11. Message

Represents a chat message.

## Fields

| Field | Type | Nullable | Key / Reference |
|---|---|---:|---|
| `Id` | `Guid` | No | PK |
| `ConversationId` | `Guid` | No | FK → `Conversation.Id` |
| `BuyerId` | `Guid` | No | FK → `ApplicationUser.Id` |
| `SenderId` | `Guid` | No | FK → `ApplicationUser.Id` |
| `Content` | `string` | No | — |
| `IsRead` | `bool` | No | — |
| `SentAt` | `datetime` | No | — |

## Known ERD Ambiguity

The ERD references:

```text
ConversationId -> Conversation.Id
```

but **does not include a `Conversation` table definition**.

Agent instructions:

1. Search the existing backend for:
   - `Conversation`
   - `ConversationId`
   - chat entities
   - message repositories/services
2. If a `Conversation` entity already exists, use it.
3. If it does not exist, do **not** invent a schema silently.
4. Add a TODO / implementation note or create a `Conversation` entity only when required by the task or confirmed by project requirements.

## Constraints

```text
PK: Id
FK: ConversationId -> Conversation.Id
FK: BuyerId        -> ApplicationUser.Id
FK: SenderId       -> ApplicationUser.Id
```

Recommended indexes:

```text
INDEX: ConversationId
INDEX: SenderId
INDEX: SentAt
INDEX: IsRead
```

## Naming Observation

`BuyerId` is unusual on a generic message entity because a conversation may contain both buyer and seller participants.

Preserve the ERD field unless the existing codebase clearly uses a different participant model.

---

# 12. Review

Represents a review associated with a transaction.

## Fields

| Field | Type | Nullable | Key / Reference |
|---|---|---:|---|
| `Id` | `Guid` | No | PK |
| `TransactionId` | `Guid` | No | FK → `Transaction.Id` |
| `ReviewerId` | `Guid` | No | FK → `ApplicationUser.Id` |
| `RevieweeId` | `Guid` | No | FK → `ApplicationUser.Id` |
| `Rating` | `int` | No | — |
| `Comment` | `string` | No* | — |
| `CreatedAt` | `datetime` | No | — |

## Constraints

```text
PK: Id
FK: TransactionId -> Transaction.Id
FK: ReviewerId    -> ApplicationUser.Id
FK: RevieweeId    -> ApplicationUser.Id
```

Recommended:

```text
CHECK: ReviewerId != RevieweeId
INDEX: TransactionId
INDEX: ReviewerId
INDEX: RevieweeId
```

If the product uses a 1–5 rating system, add:

```text
CHECK: Rating BETWEEN 1 AND 5
```

Only add this constraint if confirmed by application requirements.

Potential uniqueness rule:

```text
UNIQUE(TransactionId, ReviewerId, RevieweeId)
```

This can prevent duplicate reviews for the same participant pair, but only enforce it if consistent with business requirements.

---

# 13. Report

Represents a moderation report against a user and/or item.

## Fields

| Field | Type | Nullable | Key / Reference | Notes |
|---|---|---:|---|---|
| `Id` | `Guid` | No | PK | Report identifier |
| `ReporterId` | `Guid` | No | FK → `ApplicationUser.Id` | Reporting user |
| `ReportedUserId` | `Guid` | Yes | FK → `ApplicationUser.Id` | Reported user |
| `ItemId` | `Guid` | Yes | FK → `Item.Id` | Reported item |
| `Reason` | `int` | No | — | Report reason |
| `Description` | `string` | No* | — | User description |
| `Status` | `int` | No | — | Moderation status |
| `AdminNote` | `string` | Yes | — | Admin/moderator note |
| `CreatedAt` | `datetime` | No | — | Created timestamp |
| `ResolvedAt` | `datetime` | Yes | — | Resolution timestamp |

## Constraints

```text
PK: Id
FK: ReporterId     -> ApplicationUser.Id
FK: ReportedUserId -> ApplicationUser.Id (nullable)
FK: ItemId         -> Item.Id (nullable)
```

Recommended business validation:

At least one report target should normally be present:

```text
ReportedUserId IS NOT NULL
OR
ItemId IS NOT NULL
```

Do not add this as a database `CHECK` unless this behavior is confirmed.

Recommended indexes:

```text
INDEX: ReporterId
INDEX: ReportedUserId
INDEX: ItemId
INDEX: Status
INDEX: CreatedAt
```

---

# 14. Relationship Map

High-level relationship model:

```text
ApplicationUser
├── 1:N Item                via Item.SellerId
├── 1:N Favorite            via Favorite.UserId
├── 1:N ExchangeRequest     via ExchangeRequest.RequesterId
├── 1:N Transaction         via Transaction.BuyerId
├── 1:N Transaction         via Transaction.SellerId
├── 1:N Message             via Message.BuyerId
├── 1:N Message             via Message.SenderId
├── 1:N Review              via Review.ReviewerId
├── 1:N Review              via Review.RevieweeId
├── 1:N Report              via Report.ReporterId
└── 1:N Report              via Report.ReportedUserId

Category
└── 1:N Item                via Item.CategoryId

Item
├── 1:N Favorite
├── 1:N ExchangeRequest     via RequestedItemId
├── 1:N ExchangeRequest     via OfferedItemId
├── 1:N Transaction
└── 1:N Report

Transaction
├── 1:N or 1:1 Payment
└── 1:N Review

Conversation
└── 1:N Message

NOTE:
Conversation is referenced by Message but is not defined in the supplied ERD.
```

---

# 15. Suggested Application Enums

These enum names are recommendations only.

Reuse existing enums if they already exist.

```text
UserRole
- StudentUser = 0
- Admin = 1
```

Possible enums requiring product confirmation:

```text
ItemCondition
ItemStatus
ExchangeRequestStatus
TransactionMethod
TransactionStatus
PaymentStatus
ReportReason
ReportStatus
```

Do not assign integer values to these without checking the existing codebase.

---

# 16. Recommended Database Indexes

Minimum recommended indexes:

```text
ApplicationUser
- UNIQUE Email

Category
- UNIQUE Slug

Item
- SellerId
- CategoryId
- Status
- CreatedAt
- Slug

Favorite
- UserId
- ItemId
- UNIQUE(UserId, ItemId)

ExchangeRequest
- RequesterId
- RequestedItemId
- OfferedItemId
- Status
- ExpiresAt

Transaction
- BuyerId
- SellerId
- ItemId
- Status
- CreatedAt

Payment
- TransactionId
- Status
- TransactionRef

Message
- ConversationId
- SenderId
- SentAt
- IsRead

Review
- TransactionId
- ReviewerId
- RevieweeId

Report
- ReporterId
- ReportedUserId
- ItemId
- Status
- CreatedAt
```

---

# 17. Delete Behavior Guidance

Deletion rules are not fully specified in the ERD.

Use the following as safe defaults unless existing project behavior differs.

## ApplicationUser

Avoid cascading deletion into:

- Transactions
- Payments
- Reviews
- Reports
- Exchange requests

Historical business records should normally remain intact.

## Category

Prefer restricting deletion while items reference the category.

## Item

Avoid deleting transaction history when an item is removed.

Prefer soft-delete or an item status when supported by the application.

## Favorite

Cascade delete is acceptable when either the user or item is permanently deleted, if the project uses hard deletion.

## Payment

Never cascade from user deletion indirectly if that would destroy accounting/payment history.

## Review

Preserve transaction history unless legal/product requirements explicitly require deletion.

---

# 18. Monetary Data

The ERD contains:

```text
ExchangeRequest.AdditionalAmount : decimal?
Transaction.TotalAmount          : decimal
Payment.Amount                    : int
```

Agents must not arbitrarily normalize these types.

Before changing monetary types:

1. Inspect existing models.
2. Inspect database provider.
3. Inspect payment provider requirements.
4. Determine whether `Payment.Amount` represents smallest currency units.
5. Avoid floating-point types such as `float` or `double` for money.

For PostgreSQL, monetary decimals should normally map to an appropriate `numeric(p,s)` definition.

---

# 19. Validation Rules

Implement validation at the appropriate application layer.

Recommended baseline:

## ApplicationUser

```text
Email:
- required
- valid format
- unique

Password:
- never persisted as plaintext
```

## Item

```text
SellerId must exist.
CategoryId must exist.
Title must not be empty.
```

## Favorite

```text
UserId must exist.
ItemId must exist.
Duplicate (UserId, ItemId) is forbidden.
```

## ExchangeRequest

```text
Requester must exist.
RequestedItem must exist.
OfferedItem must exist if supplied.
RequestedItemId != OfferedItemId.
AdditionalAmount should not be negative unless explicitly supported.
```

## Transaction

```text
Buyer must exist.
Seller must exist.
Item must exist.
BuyerId != SellerId.
TotalAmount >= 0.
```

## Payment

```text
Transaction must exist.
Amount >= 0.
```

## Review

```text
Transaction must exist.
Reviewer must exist.
Reviewee must exist.
ReviewerId != RevieweeId.
```

## Report

```text
Reporter must exist.
ReportedUser must exist when provided.
Item must exist when provided.
At least one report target should normally be present.
```

---

# 20. Agent Implementation Instructions

## Primary Goal

Implement or update the database layer to match this specification while preserving the existing project architecture.

---

## Step 1 — Inspect Existing Project First

Before writing code, inspect:

```text
- project structure
- ORM / data-access framework
- database provider
- existing DbContext / database context
- existing entities/models
- DTOs
- migrations
- repositories
- services
- authentication/identity implementation
- enum definitions
- naming conventions
```

Do not recreate entities that already exist.

Do not replace working architecture simply to match a preferred pattern.

---

## Step 2 — Compare Existing Models With This Schema

For each entity:

```text
ApplicationUser
Category
Item
Favorite
ExchangeRequest
Transaction
Payment
Message
Review
Report
```

Classify it as:

```text
- already correct
- exists but needs modification
- missing
```

Also search for:

```text
Conversation
```

because `Message.ConversationId` references it even though the entity is missing from the supplied ERD.

---

## Step 3 — Implement Entities

Create or modify entity classes while preserving:

- field names
- data types
- nullability
- PKs
- FKs
- navigation properties
- existing coding conventions

Do not rename schema fields without a concrete reason.

---

## Step 4 — Configure Relationships

Configure relationships explicitly.

Important multiple-FK relationships:

```text
Transaction
- BuyerId  -> ApplicationUser
- SellerId -> ApplicationUser

Review
- ReviewerId -> ApplicationUser
- RevieweeId -> ApplicationUser

ExchangeRequest
- RequestedItemId -> Item
- OfferedItemId   -> Item

Report
- ReporterId     -> ApplicationUser
- ReportedUserId -> ApplicationUser
```

These relationships often require explicit ORM configuration to prevent ambiguous navigation or multiple cascade path problems.

---

## Step 5 — Configure Constraints and Indexes

At minimum implement:

```text
UNIQUE ApplicationUser.Email
UNIQUE Category.Slug
UNIQUE Favorite(UserId, ItemId)
```

Add foreign-key indexes.

Add status/query indexes where supported.

---

## Step 6 — Resolve `Conversation`

Before modifying `Message`, search the codebase.

If `Conversation` exists:

- connect `Message.ConversationId` to it.

If it does not exist:

- do not silently create an arbitrary implementation;
- report the missing ERD definition;
- only implement it if the current task explicitly requires messaging infrastructure.

---

## Step 7 — Migrations

If using a migration-based ORM:

1. Create a migration.
2. Review generated SQL / schema changes.
3. Verify no unexpected destructive changes occur.
4. Ensure FK order is valid.
5. Ensure nullable columns match this specification.
6. Ensure duplicate `ExchangeRequest` tables are not generated.

Do not apply destructive migrations automatically to production.

---

## Step 8 — Build and Validate

After implementation:

```text
1. Restore/install dependencies if necessary.
2. Compile/build the backend.
3. Run existing tests.
4. Run schema-related tests.
5. Verify migration generation.
6. Check for FK cycle/cascade errors.
7. Check for nullable-reference errors.
```

---

# 21. Agent Safety Rules

The agent must follow these rules:

1. **Do not delete existing functionality without a demonstrated requirement.**
2. **Do not create two `ExchangeRequest` tables.**
3. **Do not invent a `Conversation` schema without checking the existing project.**
4. **Do not silently change primary-key types.**
5. **Do not silently change monetary types.**
6. **Do not assign arbitrary enum integer values.**
7. **Do not store plaintext passwords.**
8. **Do not use destructive cascade deletion by default for historical business data.**
9. **Do not generate a new architecture when equivalent project infrastructure already exists.**
10. **Do not modify unrelated frontend/backend files.**
11. **Do not execute destructive database operations against production.**
12. **Preserve naming conventions already used by the project unless they conflict with the source-of-truth schema.**

---

# 22. Expected Agent Output

After implementation, report:

```text
## Summary
Brief explanation of what was implemented.

## Files Created
- path/to/file

## Files Modified
- path/to/file

## Database Changes
- tables added
- columns changed
- indexes created
- constraints created

## Migration
- migration name
- important SQL/schema effects

## Validation
- build result
- test result
- migration validation result

## Unresolved Issues
- Conversation entity missing from ERD, if still unresolved
- any unclear enum/status values
- any type mismatch with existing code
```

---

# 23. Source-of-Truth Priority

When implementing the project, resolve conflicts in this order:

```text
1. Explicit new user requirement
2. This database specification / supplied ERD
3. Existing working project architecture
4. Existing implementation details
5. Agent assumptions
```

However:

- Never overwrite important existing behavior blindly.
- If the current code conflicts materially with this specification, report the conflict.
- Prefer minimal, targeted modifications.

---

# 24. ERD Ambiguities / Review Checklist

The following details require special attention.

## A. Duplicate ExchangeRequest Diagram

The supplied ERD displays `ExchangeRequest` twice.

Interpretation:

```text
One logical entity/table only.
```

---

## B. Missing Conversation Entity

`Message.ConversationId` references:

```text
Conversation.Id
```

but `Conversation` is not defined in the ERD.

Action:

```text
Inspect existing code before implementing.
```

---

## C. Payment Amount Type

ERD:

```text
Payment.Amount = int
```

but transaction amounts use decimal.

Action:

```text
Preserve ERD initially.
Verify currency/storage strategy before changing.
```

---

## D. Nullable Fields

Explicitly nullable in the ERD:

```text
ApplicationUser.StudentCode
ApplicationUser.SchoolName
ExchangeRequest.OfferedItemId
ExchangeRequest.AdditionalAmount
Transaction.CompletedAt
Transaction.CancelledAt
Report.ReportedUserId
Report.ItemId
Report.AdminNote
Report.ResolvedAt
```

Some other reference/string fields are not marked nullable in the image.

When existing source code defines stricter or clearer nullability, review before changing database migrations.

---

# 25. Final Schema Checklist

Before considering database implementation complete, verify:

- [ ] `ApplicationUser` implemented
- [ ] `Category` implemented
- [ ] `Item` implemented
- [ ] `Favorite` implemented
- [ ] Only one `ExchangeRequest` implemented
- [ ] `Transaction` implemented
- [ ] `Payment` implemented
- [ ] `Message` implemented or Conversation dependency documented
- [ ] `Review` implemented
- [ ] `Report` implemented
- [ ] All PKs correct
- [ ] All FKs correct
- [ ] Nullable fields correct
- [ ] `Email` unique
- [ ] `Category.Slug` unique
- [ ] `Favorite(UserId, ItemId)` unique
- [ ] FK indexes created
- [ ] Multiple relationships to `ApplicationUser` explicitly configured
- [ ] Multiple relationships to `Item` explicitly configured
- [ ] Delete behavior explicitly reviewed
- [ ] Money types reviewed
- [ ] Migration reviewed
- [ ] Backend builds successfully
- [ ] Existing tests pass

---

# 26. Short Instruction for Coding Agents

Use the following instruction together with this file:

```text
Read this database specification completely before making changes.

Inspect the existing backend first.

Implement the database layer so it conforms to this schema while reusing
the project's existing architecture, ORM, naming conventions, entities,
services, and migration system.

Do not create duplicate entities.
Do not create two ExchangeRequest tables.
Do not invent missing enum values.
Do not invent the missing Conversation schema without first checking the codebase.
Do not perform destructive database operations.

After implementation, build/test the project and report:
- files created
- files modified
- schema changes
- migration changes
- unresolved ambiguities
- build/test result
```
