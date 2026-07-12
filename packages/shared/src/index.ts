// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

// Single source of truth for the wire: domain schemas, inferred types, event
// shapes, and the ts-rest contract. The server and web import from here; neither
// redefines an entity or endpoint shape (see CLAUDE.md).

export * from './version';
export * from './schemas/common';
export * from './schemas/trunk';
export * from './schemas/number';
export * from './schemas/route';
export * from './schemas/call';
export * from './schemas/fault-profile';
export * from './schemas/settings';
export * from './events';
export * from './contract';
