# The ten laws of a marketing site

A marketing site has five jobs. It must be readable by the machines that send visitors, true in everything it claims, useful for the question that brought each visitor, fast on a cheap phone, and safe to change. Each job has one or two laws, and each law is a set of checks you can run and prove.

| Job | Law | In one line |
|---|---|---|
| Readable | [1. Everything that matters is in the first HTML response](01-first-html.md) | Crawlers and AI assistants read the HTML your server sends, often without running JavaScript. |
| | [2. One page, one URL](02-one-url.md) | One scheme, one host, one path spelling, one canonical. Everything else redirects. |
| | [3. No URL dies by accident](03-no-dead-urls.md) | Moved pages redirect, removed pages return 404 on purpose, the sitemap lists only live pages. |
| True | [4. Every fact has one source](04-one-source.md) | Prices, requirements, FAQ and authors live in one place, and the page, the metadata and the structured data all read it. |
| | [5. Every claim can be checked](05-checkable-claims.md) | Numbers are dated and sourced, quotes are real, authors are real, AI images are declared. |
| Useful | [6. Every page answers one question](06-one-question.md) | One search intent per page, answered first, better than what already ranks. |
| | [7. No page is an orphan](07-no-orphans.md) | Every page is linked from another, with an anchor that says where it leads. |
| Fast | [8. Your page loads first; everything else waits](08-page-first.md) | Your HTML, CSS, fonts and hero image come first. Scripts from other companies wait. |
| | [9. Media is prepared once and cached forever](09-media-once.md) | Images and video are sized, compressed, dimensioned and cached for a year. |
| Safe | [10. Nothing ships without a gate](10-gates.md) | Build checks, fact-checks and a two-person launch check stop the mistakes memory misses. |

The list of AI crawlers and what each one does is in [ai-crawlers.md](ai-crawlers.md).

## How to read a law

Every law has the same parts:

- **The law**, in one sentence, and what it means in practice.
- **Why it matters**, with the public source behind each claim.
- **Checks.** Each check has a number (`1.3`), says where it runs (a live URL, the code, or the content), gives a default severity, and says what evidence proves a finding.
- **Fixes**, with short examples in plain HTML and Next.js.
- **Exceptions**: when breaking the law is the right call.

## Who says so

Every statement in these pages is one of three kinds, and the text says which.

| Label | What it means |
|---|---|
| **Google says**, **web.dev says**, or a vendor's name | Official guidance, linked to the page it comes from. When the guidance changed recently, the date of the update is given, for example *Google update, 8 May 2026*. |
| **Study** | Third-party research, named and dated. Useful evidence, not a rule. |
| **Our rule** | A threshold or a practice we recommend from running marketing sites. No search engine requires it. Adjust it when you have a reason, and write the reason down. |

Every number in a check (a size, a count, a length, a number of days) is our rule unless the text attributes it to someone else. So is every default severity, and every fix.

## Severity

| Severity | Meaning |
|---|---|
| **Blocker** | Can remove pages from search, lose traffic that exists today, or publish something false. Fix before the next release. |
| **Fix soon** | Costs rankings, speed or trust in a way you can measure. Plan it this month. |
| **Polish** | Hygiene. Worth doing when you are in the file anyway. |

A check that cannot be run with what you have is reported as **not verified**, with the command or the data that would settle it. It is never guessed.

## What the laws do not promise

Following the laws removes the reasons a page fails. It does not guarantee rankings, AI citations or traffic: those depend on demand, competition and the quality of what you publish. Where a practice has no confirmed effect, the law says so.
