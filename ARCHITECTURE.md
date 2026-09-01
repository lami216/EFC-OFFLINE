# Architecture

## Runtime boundary

React/TypeScript renders the Arabic RTL workflow and calls a deliberately small Tauri command API. Rust owns validation, authorization boundaries, identifiers, money, SQLite queries, file operations, and transaction commits. Errors are serialized as safe Arabic messages; technical diagnostics stay in tracing output.

## Storage

SQLx opens SQLite under Tauri's application-data directory with foreign keys, WAL, and a busy timeout. The migration models settings, branches, branch/course activation, specialties, users, students, enrollments, scoped sequences, billing periods, payments, allocations, immutable receipt snapshots, and audit events. Integer columns represent MRU.

## Registration transaction

`registration::register` begins one transaction, validates active references, reuses a student by phone or creates one, atomically upserts the `(branch_id, specialty_id)` sequence, snapshots duration and price, generates periods, writes and allocates a payment oldest-first, increments the single receipt sequence, serializes the immutable receipt, audits, then commits. Any error drops the transaction and prevents partial records.

## Billing and status

Calendar arithmetic clamps month-end dates (January 31 plus one month becomes the final valid February date). Monthly expected revenue is represented by periods. Payments remain append-only; voiding preserves audit fields, and all received-income queries filter to `status='active'`. Period state and balances are derived from due dates and active allocations rather than cached totals.

## Receipts and reports

Receipt snapshots preserve historical names and center information. A dedicated RTL component is rasterized at 3× scale and embedded in PDF, avoiding Arabic shaping defects in basic PDF font engines. SQL performs finance and ledger aggregation so large datasets are not transferred to JavaScript.

## Security and recovery

Passwords use Argon2 with random salts. Queries use SQLx binding except the internally generated, escaped `VACUUM INTO` destination. Tauri capabilities expose only open/save and receipt-file writes—no shell. Backups use a consistent SQLite operation rather than copying WAL files.

## Build assets

The application icon is maintained as reviewable SVG source. The Rust build script deterministically rasterizes the mark and writes the PNG and Windows ICO files expected by Tauri before its context and bundler configuration are evaluated. Generated raster files are ignored, so the Git repository and pull-request patch contain no binary icon assets.
