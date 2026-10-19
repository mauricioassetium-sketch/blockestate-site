# Store badges

Two files, both from Wikimedia Commons, both declared public domain there. They are used as **images, not
links**, because there is no app to download yet: the footer says so, and Release 1 has no native app.

| File | What it is | Source | Licence | Notes |
|---|---|---|---|---|
| `appstore.svg` | "Download on the App Store", English | https://commons.wikimedia.org/wiki/File:Download_on_the_App_Store_Badge.svg | Public domain (trademark of Apple Inc.) | 135 x 40 vector |
| `googleplay.svg` | "Get it on Google Play", English | https://commons.wikimedia.org/wiki/File:Google_Play_Store_badge_EN.svg | Public domain (trademark of Google LLC) | 180 x 53 vector |

| `appgallery.svg` | "Explore it on AppGallery", English | https://commons.wikimedia.org/wiki/File:Huawei_AppGallery_Badge_Black_EN.svg | Public domain (trademark of Huawei) | 564 x 168 vector |

Both were checked by their first bytes (`<?xml`, SVG) before being referenced: a failed download leaves an HTML
error page with an image extension, and the browser then shows nothing and reports nothing.
