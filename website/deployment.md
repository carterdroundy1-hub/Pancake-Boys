# pancak3boys.com deployment

Keep the custom domain. Root `CNAME` contains `pancak3boys.com`; GitHub Pages publishes the root on `main` via its automatic Pages workflow. Root HTML loads maintained `website/` scripts and assets.

On October 1, 2026, apex DNS pointed to GoDaddy forwarding addresses `13.248.243.5` and `76.223.105.230`. HTTPS returned an empty GoDaddy response. The GitHub Pages address redirects to this domain, also producing a blank page. No DNS records were changed by this task.

Replace the apex parking/forwarding A records with:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | carterdroundy1-hub.github.io |

Disable conflicting GoDaddy forwarding. Preserve unrelated MX/TXT/email records. Check for stale apex AAAA or conflicting www records. The www target must not include a repository path.

In repository Settings → Pages, keep custom domain `pancak3boys.com`. After verification and certificate provisioning, enable Enforce HTTPS. DNS propagation and HTTPS availability can take up to 24 hours. Follow [GitHub's official custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

A successful Pages build does not mean the public domain works. HTTP origin checks using a temporary DNS override verify deployed files without changing DNS. Normal public HTTPS needs correct DNS and a valid GitHub certificate; certificate checks must not be bypassed.
