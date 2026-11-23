import { test } from "node:test";
import assert from "node:assert/strict";
import { emailLinkFrom } from "../lib/email-links.ts";

const at = (query: string) => emailLinkFrom(new URL(`https://www.wonslinen.vn/account${query}`));

test("an account email link verifies by token hash in any browser", () => {
  assert.deepEqual(at("?token_hash=pkce_abc123DEF456&type=email"), { tokenHash: "pkce_abc123DEF456", type: "email" });
  assert.deepEqual(at("?token_hash=abc123def456&type=magiclink"), { tokenHash: "abc123def456", type: "magiclink" });
  assert.deepEqual(at("?token_hash=abc123def456&type=signup"), { tokenHash: "abc123def456", type: "signup" });
});

test("other links and malformed tokens are not treated as sign-in links", () => {
  assert.equal(at(""), undefined);
  assert.equal(at("?code=abc123def456"), undefined);
  assert.equal(at("?token_hash=abc123def456"), undefined);
  assert.equal(at("?token_hash=abc123def456&type=recovery"), undefined);
  assert.equal(at("?token_hash=abc123def456&type=email_change"), undefined);
  assert.equal(at("?token_hash=short&type=email"), undefined);
  assert.equal(at("?token_hash=abc%3Cscript%3E123&type=email"), undefined);
});
