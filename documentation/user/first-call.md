# Your first call

This guide walks you through making and receiving real calls between the
Switchboard dashboard and your own SIP application, all on your machine, with no
phone number and no carrier account. LiveKit is used as the example application,
but the steps are the same for any SIP voice agent, softphone, or PBX.

Acronyms, expanded on first use: SIP is the Session Initiation Protocol (how
calls are set up). E.164 is the international phone-number format, for example
`+14155550123`. RTP is the Real-time Transport Protocol (the audio stream). TLS
is Transport Layer Security (encryption).

## How it works, in one minute

Switchboard stands in for the phone network. Your application connects to it
through a **trunk**: a named connection with an address and, optionally,
credentials. The browser dashboard is the person on the other end of the line.
When your application places a call, it rings in the dashboard and you answer it;
when you place a call in the dashboard, it goes to your application.

"Inbound" and "outbound" are always from your application's point of view, the
same as most SIP platforms name them:

- **Outbound**: your application places a call out. It rings in the dashboard,
  and you answer and talk.
- **Inbound**: your application receives a call. You place it from the dashboard.

You need your SIP application running to make a call. The dashboard phone talks to
your application, not to itself, so a call always has your application on one end
and the dashboard on the other.

## Before you start

1. Start Switchboard and open the dashboard. See
   [Running with Docker](running-with-docker.md); in short, run
   `docker compose up` and open `http://localhost:8080`.
2. Check the phone status. In the top-right of the dashboard, next to the engine
   indicator, you should see **phone ready**. That means the dashboard phone has
   connected and can make and take calls. If it says **phone offline**, see
   [Troubleshooting](#troubleshooting).
3. Have your SIP application running on the same machine, able to send and receive
   SIP.

## Step 1: Create a trunk

In the dashboard, go to **Trunks** and choose **New trunk** (or **Quick add** for
just the essentials). Fill in:

- **Name**: anything you like, for example `my-app`.
- **Direction**: choose **Both** so you can try inbound and outbound, or pick one.
- **Authentication**: how your application proves who it is. Pick one:
  - **IP address**: enter the address your application sends from. Simplest when
    your application has a fixed address.
  - **Username and password**: set them here and use the same values in your
    application.
  - **None**: accept anything. Fine for a first try, but with None, Switchboard
    cannot tell which trunk an incoming call belongs to, so switch to IP or
    Username and password once you have more than one trunk.
- **Your system's SIP address** (target host and port): where your application
  listens for calls, for example `host.docker.internal` and `5060`. Switchboard
  delivers inbound calls here.

Save it. The trunk page shows the address and any credentials your application
should use to reach Switchboard. Copy them.

**Switchboard's address for your application:**

- SIP signaling: your machine, port `5060`.
- Audio: your machine, ports `10000-10099`.

If your application also runs in Docker, give it an address it can use to reach
your machine (for example `host.docker.internal`, or your machine's network IP
address). If your application is on a different machine, see
[Reaching Switchboard from another machine](running-with-docker.md#reaching-switchboard-from-another-machine),
which needs TLS.

## Step 2: Outbound, your application calls and you answer

This is the quickest way to hear audio: your application places a call and it
rings in your browser.

1. Make sure your trunk's Direction is **Outbound** or **Both**.
2. In your application, add an outbound trunk pointing at Switchboard's SIP
   address (your machine, port `5060`) using the same authentication you chose in
   Step 1. In LiveKit, this is an outbound trunk that your outbound-call request
   uses; see LiveKit's own SIP documentation for the exact commands.
3. Place an outbound call from your application. It can dial any number; the
   digits do not need to match anything.
4. In the dashboard, an incoming-call card slides in at the top-right. Click
   **Accept**.
5. You are now connected. Talk and listen. Use headphones to avoid an echo.
6. Click **End** to hang up.

## Step 3: Inbound, you call from the dashboard and your application answers

1. Make sure your trunk's Direction is **Inbound** or **Both**, and that its
   target host and port point at your application's SIP address.
2. Give the trunk a number: go to **Numbers**, choose **New**, enter a number in
   E.164 format (for example `+14155550100`), and assign it to the trunk.
3. Get your application ready to receive the call. In LiveKit, set up an inbound
   trunk and a dispatch rule that routes the call to your agent or room; see
   LiveKit's own SIP documentation.
4. In the dashboard, open **Phone**, choose the number (or the trunk) from the
   destination list, and press **Call**.
5. Your application receives the call and answers. Talk and listen from the
   dashboard.

## Step 4: See what happened

- **Call log**: every call, shown as Placed or Received, with who, when, how long
  it lasted, and how it ended.
- Open any call to see its detail: the timeline, the audio codec that was used,
  and a step-by-step diagram of the call setup.
- **Recordings**: turn on Record for a single trunk (on the trunk form), for
  every call (in **Settings**), or press **Record** during a call. Finished
  recordings play back and download from the call log.

## Troubleshooting

- **The phone status says "phone offline."** The browser could not connect to
  Switchboard. Confirm the stack is running, that you opened
  `http://localhost:8080`, and that you allowed the browser to use your
  microphone when it asked. Reload the page.
- **The call connects but you hear nothing, or only one side.** This is almost
  always the audio address Switchboard advertises. Work through the no-audio
  checklist in [Running with Docker](running-with-docker.md#troubleshooting-no-audio-or-one-way-audio).
  Headphones rule out an echo being mistaken for a fault.
- **Your application's outbound call never rings the dashboard.** Switchboard may
  not recognize which trunk it came from. Use IP or Username and password
  authentication (not None), and make sure the address or credentials match
  exactly what your application sends. Confirm your application is sending to port
  `5060` at the right address.
- **Your dashboard call never reaches your application.** Check that the trunk's
  target host and port point at your application's SIP address, and that your
  application is listening there.

## Where to next

- [Using Switchboard](using-switchboard.md): the full trunk form, numbers, the
  call log and its SIP trace, recordings, and settings.
- [Running with Docker](running-with-docker.md): starting and stopping, the
  development mode, and deeper no-audio help.
