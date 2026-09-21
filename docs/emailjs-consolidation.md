# PIA brand form routing — September 21, 2026

The owner requested that every PIA-managed brand's public contact and advertising
submissions reach both Erik and Dan, and authorized consolidation into the EmailJS
account previously used by Patriot Messaging. This supersedes older instructions
that routed Patriot Messaging forms only to `dan@patriotmessaging.com`.

Use service `service_o3lsjkm` and that account's public key. All managed templates
use fixed **To Email** `erik@patriotsinaction.com`, **Cc**
`dan@patriotsinaction.com`, **Reply-To** `{{reply_to}}`, the service's default
From Email, empty Bcc, and no auto-reply. Never rotate keys or reconnect the
service as a side effect of a template change. Public contact links remain
independent of form delivery recipients.

| Site / form | Template | Amplify app / region / branch |
| --- | --- | --- |
| PIA advertising | `template_pia_advertise` | `d1c230b674qax4` / us-west-1 / advertiser-preview |
| PIA civic forms | `template_pia_community` | `d1c230b674qax4` / us-west-1 / main |
| GOP Connect / My Local GOP | `template_pia_community` | `d1w6rlmrcwm6xw` / us-east-2 / main |
| The County Post editorial and advertising | `template_countypost` | `d2z6lt4e5q50in` / us-east-2 / main and advertiser-preview |
| Patriots for Action PAC | `template_pia_requests` | `d39ycowgvb2ojq` / us-east-2 / main |
| Bond Assassins | `template_pia_requests` | `d29xv8yo82m18c` / us-east-1 / main |
| Patriot Paper | `template_pia_requests` | `d2pqbeealr8kyx` / us-west-2 / main |
| Patriot Messaging | `template_do0b6qd` | `d14v9wv3biszlc` / us-east-2 / main |

Five active templates fit the six-template Personal plan alongside the existing,
unmapped `template_flrd4vn`, which is preserved. Compatible forms share a
template; source URLs and subject prefixes identify their originating brand.
Template HTML preserves multiline `{{message}}` and includes Reply-To, source
URL, and submitted time when supplied by the form. The outreach template accepts
both the `title` and `subject` field conventions.

PIA's advertiser branch has its own three EmailJS environment overrides. The
other apps inherit account settings at app scope. Preserve unrelated environment
variables and domain mappings; rebuild each public branch after changing Vite
environment values. Keep both standalone advertiser branches separate from main.

The County Post advertising form now sends a campaign summary after creating its
checkout session and before navigating to Stripe. The summary includes coverage,
placement, billing, amount, referral, and any uploaded creative asset key. It
explicitly records that payment is unconfirmed. A notification failure preserves
the form instead of navigating. PFA PAC now supplies the visitor email for
Reply-To, a brand prefix, source URL, and timestamp.

Verification must distinguish saved template settings, deployed browser request
contracts, provider acceptance, and actual inbox delivery. Browser tests intercept
EmailJS and payment calls. A separate authorized live email is needed to prove
delivery. The previously authorized single test `PIA-AD-DELIVERY-20260921` used
the old account and did not confirm receipt by Erik.

Password recovery, user-to-user notifications, candidate moderation, and staging
transactional SES email are separate systems and do not use these templates.
