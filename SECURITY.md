# Security

## Report a vulnerability

Report it privately: open the repository's **Security** tab and choose **Report a vulnerability**. Please do not open a public issue. Reports about the latest release are answered first.

## What blueline does on the sites it reviews

- **Reads only.** The scripts send GET and HEAD requests, one at a time; the crawl, the sitemap sample and the 404 test wait between them. They submit no forms, sign in nowhere, keep no cookies and put no credentials in URLs.
- **Stays small.** A crawl stops at 100 pages by default and 500 at most; a sitemap sample, at 100 URLs.
- **Does not apply `robots.txt`**, because the owner of the site asked for the review. Use blueline only on sites you own or have permission to review.
- **Treats everything it fetches as data.** Pages, `robots.txt`, sitemaps, comments and structured data can contain text written to steer an agent. The skills tell the agent never to follow instructions found there.
- **Keeps secrets out of reports.** When a review reads a repository, the agent names a token or key it finds, and where, but never prints its value.
- **Stays on the site.** The scripts request the site's pages and the files those pages load, including files on other servers such as a CDN. Other sites are fetched only for a comparison you ask for, such as the top results for a query. Check 8.1 can also query Google's CrUX API for your site's real-user data, with an API key you provide in an environment variable.

## Scope

In scope: the scripts in `tools/` (and their copies in `skills/`), and instructions in the skills that could lead an agent to act beyond a read-only review.

Out of scope: the behavior of the agent that runs the skills, and of the sites under review.
