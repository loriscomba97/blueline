# Law 4. Every fact has one source

**The law.** A fact that appears in more than one place is stored once, and every place that shows it reads from there. This covers, among others:

- prices, plans and billing periods;
- system requirements and feature lists;
- FAQ answers;
- author details, dates, contact details and URLs.

The store is a constant in the code or a field in the CMS. The page, the metadata and the structured data are not copies, so they cannot disagree.

## Why it matters

- **Copies drift.** Somebody updates the price on the pricing page and forgets the FAQ, the product page and the structured data. The site now says two things, and AI answers may quote either one.
- **Structured data must describe what is visible on the page.** **Google says** it plainly: "Don't mark up content that is not visible to readers of the page" ([General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)).
- **"Harmonizing" breaks facts.** When one fact is typed into many places, the tempting fix is to make them all match. If products really differ (requirements, prices, billing), matching them publishes something false.

## Checks

### 4.1 Structured data says what the page says

**Where:** live URL · **Default severity:** blocker for prices, requirements and dates; fix soon otherwise

Parse every JSON-LD block on the page and compare each value with the visible text:

| Structured data | Must match |
|---|---|
| `FAQPage` questions and answers | The visible FAQ, word for word (whitespace aside) |
| `Offer.price`, `priceCurrency` | The visible price and currency |
| `author.name` | The visible byline |
| `headline` | The H1 (or a faithful shortening) |
| `datePublished`, `dateModified` | The visible dates |
| `Organization.sameAs` | The social profiles the site links to |

Report every mismatch with both values.

### 4.2 No markup for content that is not there

**Where:** live URL · **Default severity:** fix soon

Report:

- `FAQPage` on a page with no visible FAQ;
- reviews or ratings with no visible review;
- products or offers the page does not show.

Markup for content the reader cannot see is exactly what the guidelines forbid. There is no longer a reward to chase either:

- **Google update, 8 August 2023:** FAQ rich results were limited to "well-known, authoritative government and health websites" ([Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes)).
- **Google update, 8 May 2026:** Google deprecated the FAQ rich result. It "will no longer appear in Google Search starting May 7, 2026" ([Latest documentation updates](https://developers.google.com/search/updates)).

**Our rule:** use `FAQPage` only to describe a FAQ that is really on the page.

### 4.3 The same fact is not typed twice in the code

**Where:** code · **Default severity:** fix soon

Search the repository for literal values that should come from one place. Report each value that appears as a literal in more than one file, with the file and line of each copy:

- prices and currencies (`€29`, `$19/month`);
- version and system requirements (`Windows 11`, `Android 14`);
- plan names, trial lengths, discount percentages;
- support emails and phone numbers.

### 4.4 Facts that differ by product stay different

**Where:** code, content · **Default severity:** blocker when a value is wrong for a product

Requirements, prices, billing periods and feature lists often differ between products or plans. Check that each product reads its own values. Report a shared constant or a copied block that makes two products claim the same thing when their documentation says otherwise.

**Our rule:** never fix a mismatch by making every product match. Confirm the right value for each product with its owner.

### 4.5 Bylines, author pages and schema read one record

**Where:** code, live URL · **Default severity:** fix soon

These all come from the same author entry:

- the visible byline;
- the author's page;
- the author in the structured data.

Report a byline typed separately from the author data, or an article whose structured data names someone the page does not show.

### 4.6 One date, everywhere

**Where:** live URL, code · **Default severity:** polish

These all come from one field:

- the "Updated" date shown on a page;
- its `dateModified`;
- its sitemap `lastmod`.

Report dates that disagree.

## Fixes

- **Keep shared facts in typed modules.** Hold routes, prices, FAQ groups, authors and stats in typed constants or CMS fields. Every component, metadata builder and structured data builder imports them. Nobody retypes a value.
- **Build structured data from the objects that render the page**, in the same request.
- **For FAQ, render the visible list and the `FAQPage` from the same array**, or extract the markup from the rendered HTML.

Next.js example:

```ts
// lib/faq.ts: the only place these answers are written
export const PRICING_FAQ = [
  {
    q: 'Can I cancel at any time?',
    a: 'Yes. Cancel from the billing page and your plan stays active until the end of the period.',
  },
  {
    q: 'Do you offer a free trial?',
    a: 'Yes. Every plan starts with a 14-day trial, no card required.',
  },
] as const;

export function faqSchema(items: readonly { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
```

The pricing page renders `PRICING_FAQ` as `<details>` elements and emits `faqSchema(PRICING_FAQ)` as JSON-LD: one source, two outputs.

## Exceptions

- **Legal texts** (terms, privacy policy) can restate facts in their own wording. Link them to the source values when they change.
- **A historical record**, such as a changelog entry or an old announcement, keeps the value it had at the time. Mark it with its date.

## Sources

Checked on 30 September 2026.

- Google Search Central: [General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- Google Search Central: [Latest documentation updates](https://developers.google.com/search/updates), 8 May 2026: "Deprecating the FAQ rich result feature"
- Google Search Central blog: [Changes to HowTo and FAQ rich results](https://developers.google.com/search/blog/2023/08/howto-faq-changes), August 2023
- Google Search Central: [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
