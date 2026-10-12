# Native session authentication supplement

This versioned CLI protocol supplement accompanies the public OpenAPI snapshot.
It documents native-client interactions, not server implementation, browser
cookie authentication or a promise of availability in every self-host profile.
The SDK accepts tokens; the CLI currently owns interactive login and refresh.

## Discovery and device login

Use the configured API root (including `/v1`). `GET /auth/oidc/config` is
unauthenticated and returns `{ issuer, clients: { cli, desktop } }`. An API without
this identity profile returns 404. The CLI requires `issuer` and `clients.cli`.
Configure a trusted API URL and use HTTPS outside local development; discovery
selects the identity provider to which the CLI sends its native-client requests.

The CLI uses the returned public client ID, with no client secret. It sends
form-encoded `client_id`, `scope=openid email profile`, `code_challenge` and
`code_challenge_method=S256` to
`{issuer}/protocol/openid-connect/auth/device`. The challenge is SHA-256 of a
fresh random PKCE verifier, encoded as base64url.

The response supplies `device_code`, `user_code`, `verification_uri`, optional
`verification_uri_complete`, `expires_in` and optional `interval`. Display the
verification URL and code to the user. Poll `{issuer}/protocol/openid-connect/token`
with the device-code grant, public client ID, device code and PKCE verifier.
Honor the interval; `authorization_pending` continues, `slow_down` adds five
seconds, and expiry/denial stops the flow. Each network request has a deadline.
Never put the verifier, device code or token response in diagnostic logs.

## Refresh and local credentials

Native refresh uses `POST /auth/refresh` with JSON:

```json
{
  "refresh_token": "<stored-refresh-token>",
  "provider": "keycloak",
  "client_id": "<discovered-native-client-id>"
}
```

Do not attach a browser refresh cookie. A successful response contains
`access_token`, `refresh_token`, `token_type` and `expires_in`. The issuing client
ID must be accepted by the API; unknown clients fail with 400 and a rejected
refresh fails with 401. Persist rotated credentials before subsequent use.
Concurrent CLI requests share a refresh attempt. Do not automatically replay a
failed refresh because the provider may already have rotated the token.

The CLI keeps configuration at `~/.liquidlm/config.json`, credentials at
`~/.liquidlm/credentials.json`, and a refresh token in the OS keychain when
available. Explicit `LIQUIDLM_CREDENTIAL_STORE=file` uses the private file with
owner-only permissions and bypasses keychain access. The file backend stores
tokens unencrypted. Do not commit, upload or use real credential files as fixtures.

`LIQUIDLM_API_TOKEN` takes precedence over `LIQUIDLM_TOKEN`, then the saved
interactive session. Environment PATs do not refresh and do not inherit the saved
session's organization header. Native sessions forward their saved organization
as `X-LiquidLM-Active-Org`.

## Caller and organization discovery

`GET /auth/me` is already included in the public OpenAPI snapshot. The CLI also
uses `GET /account/organizations` for session organization selection. It expects
an array with `id`, `name`, optional `role` and optional `is_default`. This is a
session capability; PAT callers must not depend on it being available. Listing
organizations does not grant access to their vaults. Unsupported profile features
must be reported explicitly, not bypassed with anonymous or administrator access.

The native protocol tests use synthetic discovery/token responses and verify PKCE,
polling and safe failures. They do not prove a real provider realm, browser flow
or OS keychain works on a particular installation.
