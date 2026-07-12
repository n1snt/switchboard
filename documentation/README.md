# Switchboard documentation

The documentation is split into two audiences, each with its own home page:

- **[user/](user/README.md)**: how to use Switchboard. Start here if you want to
  run the tool and point your SIP or voice application at it. User docs are
  first-class and example-driven.
- **[dev/](dev/README.md)**: how Switchboard is built. Start here if you are
  contributing: architecture, data model, the dashboard and UX specs, the
  feature-by-feature implementation plan, and the roadmap.

The project overview and quickstart also live in the
[repository README](../README.md).

## Documentation rule

Everything, whether developer-facing or user-facing, is documented as it is built,
not afterward. A feature is not done until its docs are written:

- Developer-facing behavior is documented under [dev/](dev/).
- Any user-facing capability is documented under [user/](user/) as a first-class
  guide, with runnable examples.

This rule is also recorded in the project rules at [CLAUDE.md](../CLAUDE.md).
