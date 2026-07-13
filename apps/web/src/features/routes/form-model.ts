// Copyright 2026 Nishant Bhandari
// SPDX-License-Identifier: Apache-2.0

import {
  RouteCreateSchema,
  type Route,
  type RouteCreate,
  type RouteDirection,
} from '@switchboard/shared';

// The routing-rule form's shape and its conversion to and from the wire type.
// Pure, so the pattern/priority validation is unit-tested directly.

export interface RouteFormValues {
  direction: RouteDirection;
  match: string;
  destination: string;
  priority: string;
}

export function defaultRouteForm(): RouteFormValues {
  return { direction: 'outbound', match: '', destination: '', priority: '100' };
}

export function routeToForm(route: Route): RouteFormValues {
  return {
    direction: route.direction,
    match: route.match,
    destination: route.destination,
    priority: String(route.priority),
  };
}

export function formToRouteInput(values: RouteFormValues): RouteCreate {
  const priority = Number(values.priority.trim());
  return {
    direction: values.direction,
    match: values.match.trim(),
    destination: values.destination.trim(),
    ...(values.priority.trim() !== '' && !Number.isNaN(priority)
      ? { priority }
      : {}),
  };
}

export function validateRouteForm(
  values: RouteFormValues,
): Record<string, string> {
  const result = RouteCreateSchema.safeParse(formToRouteInput(values));
  if (result.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    errors[key] ??= issue.message;
  }
  return errors;
}
