<!-- Generated from shared/report.md by scripts/build.mjs. Edit the source, not this copy. -->

# How to write the review

Every blueline review has the same shape, so a reader can compare two reviews at a glance and act on the first screen.

## Rules for every finding

1. **Evidence or nothing.** A finding quotes its evidence:
   - the command and the part of its output that shows the problem;
   - or the file and line;
   - or the exact text on the page.

   A finding without evidence is not reported.
2. **One law, one check.** Name the law and the check number (for example *Law 2, check 2.1*). If a problem breaks two laws, report it once, under the first, and mention the second.
3. **Say who says so.** When the reason is official guidance, write "Google says" (or the vendor's name) and link the page from the law's references. When the reason is one of our rules, write "our rule". Never cite a search engine from memory: use the references, which are dated.
4. **Severity.** Start from the check's default severity. Raise or lower it only with a reason written next to it, for example "blocker: this is the pricing page".
5. **Not verified is an answer.** When a check needs something you do not have (field data, a Search Console export, access to the repository, the top results for a query), list it under "Not verified", with the command or the data that would settle it. Never estimate a score, a traffic figure or a speed metric.
6. **Holds, in one line.** A law that holds gets one line with its key evidence, not a paragraph.
7. **Fix, then verify.** Every finding ends with the fix and with how to check that the fix worked.

## Severity

| Severity | Meaning |
|---|---|
| **Blocker** | Can remove pages from search, lose traffic that exists today, or publish something false. Fix before the next release. |
| **Fix soon** | Costs rankings, speed or trust in a way you can measure. Plan it this month. |
| **Polish** | Hygiene. Worth doing when you are in the file anyway. |

## Template

```markdown
# blueline review: {site, page or change}

{date} · Reviewed: {URLs, repository, draft or diff} · Evidence: {live site, code, content, data provided}

## Verdict

| Law | Status | In one line |
|---|---|---|
| 1. Everything that matters is in the first HTML response | Holds / Broken / Partly / Not verified | ... |
| 2. One page, one URL | ... | ... |
| 3. No URL dies by accident | ... | ... |
| 4. Every fact has one source | ... | ... |
| 5. Every claim can be checked | ... | ... |
| 6. Every page answers one question | ... | ... |
| 7. No page is an orphan | ... | ... |
| 8. Your page loads first; everything else waits | ... | ... |
| 9. Media is prepared once and cached forever | ... | ... |
| 10. Nothing ships without a gate | ... | ... |

## Fix first

### 1. {What is wrong, in a few words} · Law {n}, check {n.n}

- **Evidence:** {command and output, file and line, or quoted text}
- **Why it matters:** {one line; "Google says ..." with the link, or "our rule"}
- **Fix:** {the change, as specific as the evidence allows}
- **Verify:** {the command or step that shows it is fixed}

## Fix soon

{same format}

## Polish

{same format, shorter}

## Not verified

| Check | Why not | What would settle it |
|---|---|---|
| 8.1 | No field data for this origin | Run the PageSpeed Insights API on the home page once the site has traffic |

## What holds

- **Law 3:** a missing URL answers 404, and the sitemap's 100 sampled URLs are live and canonical.
```

Keep only the laws that were in scope in the verdict table. When the review covers a single law or check, skip the table and start with the findings.

## After the report

End with one line that offers the next step, usually the first blocker: "Want me to fix 1. first?". Do not change files until the user says yes. Then fix one finding at a time, and run its check again before moving to the next.
