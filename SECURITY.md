# Security Policy

## 🔒 Supported Versions

SparrowBase is actively maintained. Security updates are applied to the latest release on the `main` branch.

| Version | Supported          |
| :---    | :---               |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🛡️ Security Architecture

SparrowBase is architected with strict edge-runtime security:
1. **Web Crypto Native**: Authentication tokens and password hashing leverage native `crypto.subtle` without third-party C++ bindings.
2. **HMAC Webhook Verification**: Stripe and third-party webhooks are verified using raw `ArrayBuffer` payloads against cryptographic signatures.
3. **Sliding-Window Rate Limiting**: Abuse and DDoS mitigation via Cloudflare Workers KV.
4. **Cloudflare Turnstile**: Managed challenge protection against bot traffic.
5. **No Secret Custody**: Local BYOK (Bring-Your-Own-Key) provisioning ensures your Cloudflare credentials never touch external servers.

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within SparrowBase, please **DO NOT** open a public issue.

Instead, please send an email to:
📧 **security@sparrowbase.dev** or **sheraztariq033@gmail.com**

Please include:
- A description of the vulnerability.
- Steps to reproduce or proof-of-concept code.
- Potential impact and affected packages.

We will acknowledge your report within 48 hours and work with you on a coordinated disclosure and patch release.
