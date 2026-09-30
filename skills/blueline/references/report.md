<!-- Generated from shared/report.md by scripts/build.mjs. Edit the source, not this copy. -->

# How to write the review

Every blueline review has the same shape, so a reader can compare two reviews at a glance and act on the first screen.

## Rules for every finding

1. **Evidence or nothing.** A finding quotes its evidence:
   - the command and the part of its output that shows the problem;
   - or the file and line;
   - or the exact text on the page.

   A finding without evidence is not reported.
2. **File it under the check written for it.** Every problem goes under the most specific check that describes it, and mentions the other checks it touches. When two checks fit, these win:
   - indexing (`noindex`, `Disallow: /`, staging settings): 10.1 and 10.2;
   - missing image or video dimensions: 9.3;
   - a missing or wrong canonical: 2.2;
   - FAQ, breadcrumb or other markup without visible content: 4.2.

   Report each problem once.
3. **Say who says so.** When the reason is official guidance, write "Google says" (or the vendor's name) and link the page from the law's references. When the reason is one of our rules, write "our rule". Never cite a search engine from memory: use the references, which are dated.
4. **State the severity, and why it changed.** Every finding carries a severity line. It starts from the check's default. When you raise or lower it, write the default and the reason, for example "Fix soon (default blocker: the site is a demo kept out of search on purpose)".
5. **Not verified is an answer.** When a check needs something you do not have, list it under "Not verified", with the command or the data that would settle it:
   - field data;
   - a Search Console export;
   - access to the repository;
   - the top results for a query;
   - a browser.

   Never estimate a score, a traffic figure or a speed metric.
6. **Ask what only the owner knows.** When a finding depends on intent or on a fact you cannot check, write the finding as if the problem is real, and put the question under "Open decisions". Examples:
   - Is the `noindex` deliberate?
   - Was this image made with a generative model?
   - Is this quote approved?
7. **Fix, then verify.** Every finding ends with the fix and with how to check that the fix worked. When the fix belongs to another layer (the host, the CDN, the CMS), say which one.

## Severity and status

| Severity | Meaning |
|---|---|
| **Blocker** | Can remove pages from search, lose traffic that exists today, or publish something false. Fix before the next release. |
| **Fix soon** | Costs rankings, speed or trust in a way you can measure. Plan it this month. |
| **Polish** | Hygiene. Worth doing when you are in the file anyway. |

Each law in the verdict table gets one status, from the findings filed under it:

| Status | Meaning |
|---|---|
| **Broken** | At least one blocker. |
| **Partly** | Findings, but no blocker. |
| **Holds** | No findings. |
| **Not verified** | The checks that decide the law could not be run. |

## Template

```markdown
# blueline review: {site, page or change}

{date} · Reviewed: {the URLs, repository, draft or diff} · Evidence: {live site, code, content, data provided}
Pages sampled: {the list, and any template the site does not have} · Sources in the references checked on 30 September 2026

## Verdict

| Law | Status | In one line | Findings |
|---|---|---|---|
| 1. Everything that matters is in the first HTML response | Holds / Partly / Broken / Not verified | ... | 3, 7 |
| 2. One page, one URL | ... | ... | ... |
| 3. No URL dies by accident | ... | ... | ... |
| 4. Every fact has one source | ... | ... | ... |
| 5. Every claim can be checked | ... | ... | ... |
| 6. Every page answers one question | ... | ... | ... |
| 7. No page is an orphan | ... | ... | ... |
| 8. Your page loads first; everything else waits | ... | ... | ... |
| 9. Media is prepared once and cached forever | ... | ... | ... |
| 10. Nothing ships without a gate | ... | ... | ... |

## Blockers

### 1. {What is wrong, in a few words} · Law {n}, check {n.n}

- **Severity:** Blocker{, and the default and the reason when you changed it}
- **Evidence:** {command and output, file and line, or quoted text}
- **Why it matters:** {one line; "Google says ..." with the link, or "our rule"}
- **Fix:** {the change, as specific as the evidence allows, and who owns it}
- **Verify:** {the command or step that shows it is fixed}

## Fix soon

### 2. ... (same format; numbers continue across the three sections)

## Polish

### 3. ... (same format, shorter)

## Open decisions

1. {The question for the owner, and the findings that depend on the answer.}

## Not verified

| Check | Why not | What would settle it |
|---|---|---|
| 8.1 | No field data for this origin | Run the PageSpeed Insights API on the home page once the site has traffic |

## What holds

- **Law 3:** a missing URL answers 404, and the sitemap's sampled URLs are live and canonical.
- **Law 8, partly:** no third-party scripts and no web fonts from other origins.
```

**Scope.** Keep only the laws that were in scope in the verdict table. When the review covers a single law or check, skip the table and start with the findings.

**What holds** has one line for every law in scope that fully or partly holds, with the evidence for what works.

## After the report

End with one line that offers the next step. For example, "Want me to fix 1. first?" when you can edit the code, or "Want the exact change for 1.?" when you reviewed a live site only.

Do not change files until the user says yes. Then fix one finding at a time, and run its check again before moving to the next.
