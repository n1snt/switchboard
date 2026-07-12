# Switchboard dashboard UX

This document describes how the dashboard looks and feels: the visual system, the
application shell, navigation, routing, and the screen-by-screen flows. It builds
on [dashboard.md](dashboard.md) (what each screen contains) and is the visual and
interaction companion to it. Implementation details live in
[implementation.md](implementation.md).

Acronyms used here, expanded on first use: SIP is the Session Initiation Protocol.
URI is a Uniform Resource Identifier (a SIP URI looks like
`sip:agent@10.0.0.5:5060`). DID is a Direct Inward Dialing number. DTMF is
Dual-Tone Multi-Frequency (keypad tones). WS is WebSocket. URL is Uniform Resource
Locator. A11y is accessibility.

## Design principles

Switchboard is a tool for developers, so the interface is dense but calm, and it
is honest about state at all times.

1. **Status-forward.** Two pieces of state matter constantly: is the control plane
   connected to the engine, and is there a live call. Both are visible from every
   screen (an engine indicator in the header, a docked call bar at the bottom).
2. **Never hijack the screen.** A ringing call shows a compact corner card, not a
   modal takeover, so you can keep working. Destructive actions confirm; nothing
   else interrupts.
3. **Copy-paste friendly.** Credentials, endpoints, and SIP URIs have one-click
   copy, because the whole point is wiring another system to these values.
4. **Keyboard-reachable.** The dialler keypad, Accept and Decline, mute, and hang
   up all have keyboard shortcuts. Radix primitives give correct focus behavior.
5. **Legible in light and dark.** Developer tools are often used in dark mode. The
   dashboard follows the system theme and offers a manual toggle.

## Visual system

Built on Tailwind with Radix headless primitives (shadcn/ui), so the look is a
thin, consistent layer over accessible behavior.

- **Spacing**: a 4px base scale. Comfortable, not cramped; tables use compact
  rows, forms use roomy ones.
- **Type**: a single sans-serif family (system stack or Inter), three sizes for
  body, one for headings, and a monospace face for addresses, credentials, and SIP
  traces.
- **Color**: one neutral gray palette for surfaces and text, one accent for
  primary actions and the active nav item, and a small set of semantic colors used
  only for meaning:
  - green for connected and answered,
  - amber for ringing and on-hold,
  - red for errors, declined, and abnormal hangups,
  - gray for idle and ended-normally.
- **Elevation**: flat surfaces for the shell, a soft shadow for cards, a stronger
  shadow for the floating call notification and dialogs.
- **Radius**: consistent medium corner radius on cards, inputs, and buttons.

Color is confirmed against the accessibility guidance before use; see the a11y
section.

## Application shell

The chosen layout is a left sidebar for top-level sections, with a contextual tab
strip inside sections that have more than one view, plus a persistent header and a
docked call bar.

```text
+--------------------------------------------------------------+
| Switchboard                              [* engine ok]  [◐]  |  header
+------------+-------------------------------------------------+
|  ☎ Phone   |  Trunks                                  [+ New] |
|  ▤ Trunks ◂|  List | Numbers on this trunk                    |  contextual tabs
|  # Numbers |  +-------------------------------------------+   |
|  ⇄ Routes  |  | Name      Address        Auth    Status   |   |
|  ▦ Calls   |  | agent-dev host.docker..  none    enabled  |   |
|  ⚡ Faults  |  | carrier   10.0.0.5:5061  digest  enabled  |   |
|  ⚙ Settings|  +-------------------------------------------+   |
|            |                                                  |
+------------+-------------------------------------------------+
|  ▶ On call  agent-dev  00:12   [mute] [hold] [keypad] [end]   |  call bar
+--------------------------------------------------------------+
```

- **Header** (about 52px): the product name, the engine connection indicator
  (green dot plus "engine ok", red plus "engine down"), and the theme toggle.
- **Sidebar** (about 240px, collapsible to a 64px icon rail): the seven top-level
  destinations. The active item is highlighted. It collapses to icons on narrower
  windows or by user choice, with tooltips on hover.
- **Contextual tab strip**: appears only inside sections that have sub-views
  (Trunks, Call log detail, Settings). Each tab is a real route, so it is
  linkable and deep-linkable.
- **Docked call bar** (about 56px): hidden when idle. When a call is active it
  shows the party, a running timer, and the core controls, so call control never
  depends on which screen you are on. Clicking it expands to the full Phone
  screen.
- **Global call overlay**: the incoming-call notification (below) floats above
  everything, anchored top-right, independent of the shell.

## Routing

Routing uses TanStack Router with file-based routes generated by its Vite plugin.
The router gives fully typed route parameters and, importantly, typed and
validated search parameters, which the call log relies on for shareable filters.

### Route tree

```text
/                         -> redirect to /phone
/phone                    dialler and the full-size in-call view
/trunks                   section layout (renders the contextual tabs)
  /trunks                 index: the trunk list
  /trunks/new             the advanced create form (grouped sections)
  /trunks/$trunkId        edit a trunk
  /trunks/$trunkId/numbers  numbers attached to this trunk (contextual tab)
/numbers                  the numbers list
  /numbers/new            create a number
  /numbers/$numberId      edit a number
/routes                   routing rules (advanced, secondary)
/calls                    the call log (filters live in typed search params)
  /calls/$callId          per-call detail: timeline, SIP ladder, recording
/faults                   fault profiles (arrives with milestone M3)
  /faults/new
  /faults/$profileId
/settings                 section layout with contextual tabs
  /settings/recording
  /settings/engine
  /settings/environment
  /settings/credentials
```

### URL and search-parameter scheme

- Deep links work everywhere. `/trunks/$trunkId` opens straight to a trunk;
  `/calls/$callId` opens a specific call's detail.
- The call log encodes its filters as validated search params, so a filtered view
  is shareable and survives reload:
  `/calls?direction=received&trunkId=abc&state=ended&from=2026-07-01&to=2026-07-13`.
  The search schema is defined once (a Zod schema) and TanStack Router validates
  and types it, so a bad query string is coerced or rejected rather than crashing
  a component.
- Contextual tabs are navigation between sibling routes, rendered through an
  `<Outlet />` in the section layout, so the tab strip is just a set of typed
  `<Link>`s with active styling.
- Route-level code splitting keeps the initial bundle small; the softphone code
  (SIP.js) loads with the Phone route.
- Where TanStack Router loaders are used, they prefetch through the TanStack Query
  client so data is warm before a screen renders and stays in one cache.

## Screens and flows

Each screen below lists its layout and the primary flow through it. Wireframes are
schematic, not pixel-exact.

### Phone: dialler

```text
+-------------------------------------------------+
|  Place a call                                   |
|  Destination [ agent-dev            v ]  or URI |
|              [ sip:...            ] [ paste ]    |
|                                                 |
|            +-----+  +-----+  +-----+            |
|            |  1  |  |  2  |  |  3  |            |
|            +-----+  +-----+  +-----+            |
|            |  4  |  |  5  |  |  6  |            |
|            +-----+  +-----+  +-----+            |
|            |  7  |  |  8  |  |  9  |            |
|            +-----+  +-----+  +-----+            |
|            |  *  |  |  0  |  |  #  |            |
|            +-----+  +-----+  +-----+            |
|                                                 |
|                 [   Call   ]                    |
|  Recent: carrier-sim, +14155550123              |
+-------------------------------------------------+
```

Flow, place a call:

1. Pick a destination from the dropdown (dialable trunks by name, saved numbers,
   or an ad-hoc SIP URI), or type into the field.
2. Optionally enter or append digits on the keypad.
3. Press Call (or Enter). The button turns into a Calling state with the address
   and a Cancel control.
4. On answer, the screen becomes the in-call view and the docked call bar
   activates. On failure, an inline message shows the cause (busy, timeout,
   rejected) and the attempt lands in the call log.

### Phone: incoming-call notification

```text
                                  +---------------------------+
                                  |  Incoming call            |
                                  |  +14155550123             |
                                  |  via  carrier-sim         |
                                  |                           |
                                  |  [ Decline ]   [ Accept ] |
                                  +---------------------------+
```

Flow, receive a call:

1. The card slides in at top-right with a ringtone. The rest of the dashboard
   stays usable behind it.
2. Accept moves straight into the in-call view and stops the ringtone. Decline
   rejects with a busy or declined cause. No answer times out and the card
   dismisses.
3. If more calls arrive, the cards stack; each has its own Accept and Decline.

### Phone: in-call

```text
+-------------------------------------------------+
|                 agent-dev                       |
|                 00:12   PCMU                    |
|                                                 |
|     [ mute ]   [ hold ]   [ keypad ]            |
|     [ record ] [ volume ] [ SIP trace ]         |
|                                                 |
|                 [  End call  ]                  |
+-------------------------------------------------+
```

Flow, during a call: mute and unmute the microphone, hold and resume the far end,
open the keypad to send DTMF into a phone tree, toggle recording (when enabled),
adjust output volume, and open the live SIP trace. End call hangs up and writes
the final state to the log. All of these are mirrored in the compact docked call
bar so they work from any screen.

### Trunks: list and quick add

```text
+-------------------------------------------------+
|  Trunks                    [ Quick add ] [+ New]|
|  List | ...                                     |
|  +-------------------------------------------+  |
|  | Name       Address         Auth   Status  |  |
|  | agent-dev  host.docker..    none   ●       |  |
|  | carrier    10.0.0.5:5061    digest ●  env  |  |
|  +-------------------------------------------+  |
+-------------------------------------------------+

Quick add (dialog):
   +-----------------------------------+
   |  Quick add SIP server             |
   |  Name    [ my-agent            ]  |
   |  Address [ 192.168.1.10:5060   ]  |
   |             [ Cancel ] [ Save ]   |
   +-----------------------------------+
```

Quick add is a small dialog capturing only a name and an address, auth none, for
"save this SIP server so I can dial it." The env-managed rows carry a small "env"
badge and a tooltip saying they reset on restart.

### Trunks: advanced create and edit

The full carrier-style form (all the fields in [dashboard.md](dashboard.md)) is a
full route page, not a cramped dialog, because there are many fields. They are
grouped into collapsible sections so the common case stays short:

```text
+-------------------------------------------------+
|  New trunk                                      |
|  v Identity                                     |
|     Name [        ]  Direction [ both v ]  [x]en|
|  v Server & transport                           |
|     Host [        ] Port [5060] Transport [udp v]|
|  > Authentication              (collapsed)      |
|  > Number handling             (collapsed)      |
|  > Media & codecs              (collapsed)      |
|  > Limits                      (collapsed)      |
|                     [ Cancel ] [ Save trunk ]   |
+-------------------------------------------------+
```

Identity and Server are open by default; Authentication, Number handling, Media,
and Limits are collapsed until needed. The form uses inline validation from the
shared Zod schema, so errors appear per field on blur. On save it returns to the
list with a success toast, and the new trunk is immediately dialable.

### Numbers

A straightforward list and a small create form: enter an E.164 value and pick the
inbound trunk that delivers it. Dialling the number later routes to that trunk.

### Call log and detail

```text
+-------------------------------------------------+
|  Call log            [ direction v ][ trunk v ] |
|                      [ date range ][ state v ]  |
|  +-------------------------------------------+  |
|  | When     Dir      Party        Dur  Rec   |  |
|  | 10:02    Received +1415...     0:42  ⭳    |  |
|  | 09:58    Placed   agent-dev    1:15  ⭳    |  |
|  | 09:40    Placed   carrier      fail       |  |
|  +-------------------------------------------+  |
+-------------------------------------------------+

Detail (/calls/$callId):
   State timeline  ->  ringing 0.0s, answered 2.1s, ended 44s
   Media           ->  codec PCMU, two-way
   Hangup          ->  normal
   SIP ladder      ->  [ INVITE / 100 / 180 / 200 / ACK / BYE ]
   Recording       ->  [ ▶ player ]   [ Download ]
```

Direction shows as Placed or Received in plain language, never inbound or
outbound. Filters write to the URL search params (see routing), so a filtered log
is shareable. A recording, when present, shows an inline player and a Download
button. The detail view adds the state timeline, negotiated media, hangup cause,
and the SIP trace and call-ladder diagram from milestone M2.

### Settings

A section with contextual tabs: Recording (record-all toggle, storage directory,
disk usage, per-recording delete), Engine (connection status, advertised media
address), Environment (read-only list of env-seeded items with a "resets on
restart" note), and Credentials (a read-only, copyable overview of every trunk's
address and credentials).

## States

- **Empty states** explain the next action: "No trunks yet. Add a SIP server to
  place your first call." with the primary button inline.
- **Loading** uses skeleton rows for tables and a subtle spinner for actions;
  never a full-page blank.
- **Errors** are specific. A failed call shows the SIP cause; a failed save shows
  the field error. A lost engine connection turns the header indicator red and
  shows a banner, since nothing call-related will work until it returns.
- **Toasts** confirm background successes (trunk saved, recording deleted) and
  auto-dismiss; they never carry the only copy of important information.

## Responsive behavior

The dashboard is desktop-first, since it is a development tool used beside an
editor and a terminal.

- Comfortable from about 1024px and up.
- Below that, the sidebar collapses to the icon rail and wide tables scroll
  horizontally inside their own container so the page never scrolls sideways.
- The call bar and the incoming-call card remain fully functional at every width,
  because taking a call must never depend on window size.
- A phone-sized viewport is not a target for the admin screens, but the core call
  controls stay usable.

## Accessibility

- Radix primitives provide focus trapping, roving focus, and correct roles for
  dialogs, menus, tabs, and the like.
- The incoming-call card and call-state changes are announced through an ARIA
  live region, so a screen-reader user hears "Incoming call from ..." and "Call
  connected."
- Every control has a keyboard path: keypad digits map to number keys, Accept and
  Decline and hang up have shortcuts, and the command actions are reachable
  without a pointer.
- Color is never the only signal. Status uses an icon or label alongside the
  color, and combinations meet contrast guidance in both themes.

## Component inventory

The screens map onto this set of shadcn/ui (Radix plus Tailwind) primitives, so
there is little bespoke UI:

- Navigation: sidebar nav, contextual `Tabs`.
- Data: `Table` with a light data-table wrapper, `Badge` for status and env,
  `Tooltip` for the direction explainer.
- Input: `Form` (with the shared Zod schema), `Input`, `Select`, `Switch`,
  `Button`, `Accordion` for the trunk form sections.
- Overlays: `Dialog` for quick add and confirmations, the custom floating
  incoming-call card, `Toast` for confirmations, `Popover` and `DropdownMenu` for
  the destination picker and row actions.
- Media: an audio player for recordings.
