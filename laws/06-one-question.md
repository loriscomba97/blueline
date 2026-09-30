# Law 6. Every page answers one question

**The law.** Every indexable page is built for one search intent: the question a person types. It answers that question better than the pages that already rank for it:

- the title and the H1 lead with the words people search;
- the answer comes first;
- the headings say what each section covers;
- the copy is plain.

No other page on the same site competes for the same query.

## Why it matters

- **A page that serves three intents ranks for none** (our rule, from experience). Two pages for the same query compete with each other, and neither gets the full weight of your links.
- **Search engines build the result from your page.**
  - **Google says** to write "descriptive and concise" titles, and warns against boilerplate and keyword stuffing ([Influencing your title links](https://developers.google.com/search/docs/appearance/title-link)).
  - **Google says** it builds snippets mainly from the content of the page ([Control your snippets](https://developers.google.com/search/docs/appearance/snippet)). The first lines matter as much as the description.
- **Google's questions for content quality** include whether the page provides original information, and "insightful analysis or interesting information that is beyond the obvious" ([Creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)).
- **AI answers draw on the same pages.**
  - **Google says** its AI features have "no additional requirements" and need no special optimization ([AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)).
  - **Google update, 15 May 2026:** Google's guide to generative AI search adds that there is no need to split content into small pieces or to write in a special way for AI ([Optimizing your website for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)).
  - The fundamentals are the optimization. Writing that puts the answer first serves readers, and those passages are also the easiest to quote correctly.

## Checks

### 6.1 The page has one intent, and you can say it

**Where:** live URL, content · **Default severity:** fix soon

Write the page's primary query in one sentence, from its title, H1 and first paragraph. For example, "how to price a freelance web design project".

Report pages where you cannot. Also report pages that mix intents: a product page that is also a tutorial and a news post, or a guide that tries to rank for two unrelated questions.

### 6.2 The title leads with the query

**Where:** live URL · **Default severity:** fix soon

The `<title>` has these properties:

- it is unique across the site;
- it starts with the words of the primary query, not with the brand slogan;
- it is short enough to show in full on a results page (about 60 characters, our rule);
- it ends with the brand when the brand helps.

Report duplicates, slogans in the lead position, keyword lists and generic titles such as "Home" or "Features". Suggest a replacement for each one.

### 6.3 One H1 that says what the page is

**Where:** live URL · **Default severity:** fix soon

The page has exactly one `<h1>`, and it names the subject in the searcher's words. A brand line such as "The fastest way to plan your week" works better as the subheading under an H1 that says what the product does ("Weekly planning app for small teams").

Report:

- missing or multiple H1s;
- an H1 that is only a slogan or a logo.

### 6.4 The description is written, not left to chance

**Where:** live URL · **Default severity:** polish

`<meta name="description">` has these properties:

- it is unique to the page;
- it is written by a person;
- it summarizes what the page gives the reader in a sentence or two (about 150 characters, our rule).

Report descriptions that are missing, duplicated across pages, or copied from the first paragraph by default.

### 6.5 Headings describe their sections

**Where:** live URL · **Default severity:** fix soon

The H2s and H3s form an outline a reader could navigate:

- one idea per section;
- no skipped levels;
- descriptive words rather than labels.

"Recurring invoices with automatic reminders" beats "Features". "How billing works when you add a seat" beats "More".

Report pages whose visible section titles are not headings at all (styled `<div>` or `<p>`), headings that are only labels, and skipped levels.

### 6.6 The answer comes first

**Where:** live URL, content · **Default severity:** fix soon

- **The first paragraph** after the H1 answers the query directly. The context and the qualifiers come after it.
- **"What is X" pages** open with a definition.
- **FAQ answers** open with the answer in their first sentence, and stay short (40 to 70 words, our rule).

Report pages that make the reader scroll past an introduction to find the answer.

### 6.7 The copy is plain

**Where:** live URL, content · **Default severity:** polish

**Our rule:** good copy names the input, the action and the result: "Resize 500 product photos for your store in one pass" instead of "streamline your workflow". Report:

- generic adjectives (powerful, seamless, revolutionary, cutting-edge, game-changing);
- vague promises ("unlock your potential", "take it to the next level");
- rhetorical questions;
- exclamation marks and emoji used as filler;
- sentences that would fit a competitor's site after swapping the product name (the swap test).

### 6.8 No two pages compete for the same query

**Where:** live URL, with Search Console data if available · **Default severity:** fix soon

**With a Search Console export** of queries and pages, list the queries where two or more of your URLs receive impressions. For each query, pick the page that should own it, then do one of these:

- **Merge** the others into it, with redirects.
- **Differentiate** them so each owns a different intent.
- **Point canonicals** at the owner, when the pages must stay.

**Without data**, compare the titles and H1s across the sitemap, and report pairs that target the same query.

**Our rule:** never answer cannibalization with a third page.

### 6.9 The page covers what ranks, and adds something

**Where:** content, with the top results for the query · **Default severity:** fix soon

**Our rule:** read the pages that rank in the top three for the primary query: their headings, depth, format and sources. Then check the page under review on three points:

- **Coverage.** It covers every subtopic that two or more of them cover. Leaving out the consensus costs rankings, however good the rest is.
- **Format.** It matches the format the results reward: a step-by-step guide, a comparison, a definition.
- **The gap.** It adds at least one thing none of them has, for example original data, a real example, a mechanism only you can show, or a step the others skip.

Report a missing consensus topic, and a page with no gap. Without a gap, a page has no reason to outrank the incumbents.

### 6.10 The page has an angle only you can claim

**Where:** content · **Default severity:** fix soon

The page rests on something only this site can say:

- how its product solves the problem;
- data it has collected;
- first-hand experience.

**Our rule:** write the angle in one sentence. When a topic offers no such angle, the page is a generic article on a good keyword, and those lose to established pages. Report it, and say so plainly.

### 6.11 Improve the page that already ranks before writing a new one

**Where:** content, with Search Console data if available · **Default severity:** fix soon

Before a new page is written for a query, check whether an existing page already has impressions for it.

- **If one does**, improve that page. Common fixes:
  - a title that matches the query;
  - a section named with the exact words people search, such as the exact text of an error message;
  - an FAQ entry.
- **If a page was published or rewritten in the last two or three months and is still climbing** (our rule), support it with links and a better title before rewriting it.

Report plans for new pages that duplicate an existing ranking page.

### 6.12 The audience is the right one

**Where:** content · **Default severity:** polish

**Our rule:** a keyword with high volume and the wrong audience is a trap. It brings visitors who will never buy, and it dilutes what the site is known for. A small, specific query from the right buyer is usually worth more.

Report pages whose target query does not match the people the product serves.

### 6.13 Every image, video and table earns its place

**Where:** content · **Default severity:** polish

Each visual element shows something a paragraph cannot: a before and after, a workflow, a comparison, the product doing the thing the section describes.

**Our rule:** a product video belongs where it illustrates the topic. Keep it off comparison pages, where it undermines the page's claim to be fair, and off pages it does not match.

Report decorative stock images and videos that do not match the section they sit in.

## Fixes

- **Assign an owner page to every query** that matters, and keep the list next to the content plan.
- **Put the searcher's words first:** rewrite titles and H1s so they lead with the query, and move slogans to the subheading.
- **Start every section with its answer**, then the detail.
- **Before writing a new piece**, run the checks above on the plan:
  1. Check intent.
  2. Check for an existing page.
  3. Compare with the top three results.
  4. Name the angle.

  Only then write the outline, with a word budget per section so the last sections get the same care as the first.

## Exceptions

- **The home page** serves the brand query and the overview. It links to the pages that own each specific intent instead of competing with them.
- **Pages not meant to rank**, such as legal pages, thank-you pages and campaign landing pages kept out of the index, do not need a search intent.

## Sources

Checked on 30 September 2026.

- Google Search Central: [Influencing your title links](https://developers.google.com/search/docs/appearance/title-link)
- Google Search Central: [Control your snippets](https://developers.google.com/search/docs/appearance/snippet)
- Google Search Central: [Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- Google Search Central: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- Google Search Central: [Optimizing your website for generative AI features on Google Search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
