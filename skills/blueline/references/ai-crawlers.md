<!-- Generated from laws/ai-crawlers.md by scripts/build.mjs. Edit the source, not this copy. -->

# AI crawlers: who they are and what they do

A reference for [law 1](01-first-html.md) (checks 1.6 and 1.7) and [law 10](10-gates.md) (check 10.2). Vendors add and rename agents often. This list was checked against each vendor's own documentation on **30 September 2026**. Check the source pages before relying on a detail.

## Three kinds of agents

| Kind | What it does | What blocking it costs you |
|---|---|---|
| **Training** | Collects pages that may be used to train models | Nothing in search. Your content stays out of future training data. |
| **Search** | Indexes pages so an AI assistant can find, quote and link them | Visibility and citations in that assistant's answers |
| **User-triggered** | Fetches one page because a person asked the assistant to read it | The assistant cannot read your page for that person |

Some names are **tokens, not crawlers**: rules for them in `robots.txt` control how data collected by the vendor's normal crawler may be used, but no crawler with that name ever visits.

## The agents

| Vendor | Token | Kind | What it does | Follows robots.txt |
|---|---|---|---|---|
| OpenAI | `GPTBot` | Training | Crawls content that may be used to train its models | Yes |
| OpenAI | `OAI-SearchBot` | Search | Indexes pages for search results in ChatGPT | Yes. Changes take about 24 hours |
| OpenAI | `ChatGPT-User` | User-triggered | Fetches a page when a user asks | May not apply, says OpenAI |
| OpenAI | `OAI-AdsBot` | Other | Checks the landing pages of ads shown in ChatGPT. Not used for training | See the vendor page |
| Anthropic | `ClaudeBot` | Training | Collects content that may be used for training | Yes |
| Anthropic | `Claude-SearchBot` | Search | Indexes content to improve search results | Yes |
| Anthropic | `Claude-User` | User-triggered | Fetches a page when a user asks | Yes, including this one |
| Perplexity | `PerplexityBot` | Search | Indexes pages for Perplexity's search results. Not used to train foundation models | Yes. Changes take up to 24 hours |
| Perplexity | `Perplexity-User` | User-triggered | Fetches a page when a user asks | Generally ignores it |
| Google | `Googlebot` | Search | Google Search, including AI Overviews and AI Mode | Yes |
| Google | `Google-Extended` | Token | Controls whether content crawled by Google trains future Gemini models and grounds answers in Gemini Apps and Vertex AI. No effect on Google Search or AI Overviews | Token only |
| Google | `Google-Agent` | User-triggered | Agents on Google's infrastructure that browse and act on a user's request | Generally ignores it |
| Apple | `Applebot` | Search | Apple's search features, such as Siri and Spotlight. May render pages | Yes |
| Apple | `Applebot-Extended` | Token | Controls whether content Applebot crawled may train Apple's foundation models. Blocking it does not remove you from Apple's search | Token only |
| Common Crawl | `CCBot` | Training | Builds a free, open archive of the web that anyone can use, including to train models. Does not run JavaScript | Yes |
| Meta | `Meta-ExternalAgent` | Training | Indexes content to train foundation AI models | Yes |
| Meta | `Meta-WebIndexer` | Search | Improves the quality of Meta AI search results | Yes |
| Meta | `Meta-ExternalFetcher` | User-triggered | Fetches individual links at a user's request | May bypass it |

**User-triggered fetchers are not crawlers.** Most vendors treat them like a person's browser. `robots.txt` may not stop them, and blocking them only prevents people from asking the assistant about your page.

## Controls beyond robots.txt

- **Google Search Console, Search generative AI setting.** It removes a site from AI Overviews, AI Mode and the generative AI features of Discover. The default is to include the site, and the setting is not a ranking signal. Training is controlled separately, with `Google-Extended`.
- **`noindex`, `nosnippet` and `max-snippet`** limit what Google shows, AI features included. Apple also honors `nosnippet` for AI answers in Siri and Search.
- **Links and titles can still appear.** Pages disallowed for OpenAI's crawlers can still appear in ChatGPT, and its Atlas browser, as a link with its title. To prevent that, OpenAI says to allow the crawler and serve `noindex`.

## JavaScript

Crawlers that do not run JavaScript see only the first HTML response ([law 1](01-first-html.md)).

**What the vendors say:**

- **Googlebot** renders pages with a recent Chromium. Google adds that not every bot can run JavaScript.
- **Applebot** may render pages in a browser.
- **CCBot** does not execute JavaScript.
- **OpenAI, Anthropic, Perplexity and Meta** do not say, as of this check.

**What a study found.** In an analysis of crawler traffic by Vercel and MERJ (December 2024), none of OpenAI's crawlers, ClaudeBot, Meta-ExternalAgent, Bytespider or PerplexityBot executed JavaScript. Some of them downloaded script files without running them. This is a third-party study, and it is the most recent primary data we found.

## A starting point for robots.txt

**Our rule**, not a vendor's. Search engines and AI search crawlers are allowed by the `*` group. The training crawlers are named in their own group, so the decision about them is visible and easy to reverse.

```txt
User-agent: *
Allow: /
Disallow: /api/

# Training crawlers and tokens: allowed on this site. Change Allow to Disallow to opt out.
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: CCBot
User-agent: Meta-ExternalAgent
User-agent: Google-Extended
User-agent: Applebot-Extended
Allow: /
Disallow: /api/

Sitemap: https://www.example.com/sitemap.xml
```

A crawler obeys the group that names it and ignores the `*` group, so every named group repeats the `Disallow` rules it should respect.

## Sources

Checked on 30 September 2026.

- OpenAI: [Overview of OpenAI crawlers](https://developers.openai.com/api/docs/bots)
- OpenAI: [Publishers and developers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- Anthropic: [Does Anthropic crawl data from the web, and how can site owners block the crawler?](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- Perplexity: [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- Google: [Google's common crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- Google: [Google's user-triggered fetchers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-user-triggered-fetchers)
- Google: [Search generative AI control](https://support.google.com/webmasters/answer/16908024), in Search Console Help
- Apple: [About Applebot](https://support.apple.com/en-us/119829)
- Common Crawl: [CCBot](https://commoncrawl.org/ccbot) and [FAQ](https://commoncrawl.org/faq)
- Meta: [Meta web crawlers](https://developers.facebook.com/documentation/sharing/webmasters/web-crawlers)
- Vercel and MERJ: [The rise of the AI crawler](https://vercel.com/blog/the-rise-of-the-ai-crawler), December 2024 (third-party study)
- IETF: [RFC 9309, Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)
