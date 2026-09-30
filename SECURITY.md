# Security

## Report a vulnerability

Open the repository's **Security** tab and choose **Report a vulnerability**. Keep vulnerability reports private. Reports about the latest release take priority.

## Requests and limits

The scripts send read-only GET and HEAD requests, one at a time. The crawl, sitemap sample and 404 test wait between requests. They submit no forms, sign in nowhere, keep no cookies and put no credentials in URLs.

A crawl stops at 100 pages by default and 500 at most. A sitemap sample stops at 100 URLs. The scripts do not apply `robots.txt`, because the review was requested. Use blueline only on sites you own or have permission to review.

Requests include the site's pages and the files they load, including assets hosted on other servers. The agent may fetch other sites for a comparison you request. Check 8.1 can query the CrUX API for real-user speed data with a key supplied through the `CRUX_API_KEY` environment variable.

## Agent instructions

The skills instruct the agent to treat fetched content as data, never as instructions. This includes pages, sitemaps, `robots.txt`, comments and structured data.

When reviewing a repository, the agent must report the presence and location of a secret without printing its value. These are instructions to the agent, not a guarantee about its behavior.

## Scope

In scope: the scripts in `tools/`, their copies in `skills/`, and skill instructions that could lead an agent beyond a read-only review.

Out of scope: the behavior of the agent running the skills and the sites under review.
