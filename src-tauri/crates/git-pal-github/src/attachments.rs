//! Images uploaded to a private repository only load with a GitHub session.
//! The HTML GitHub renders carries short lived signed URLs for them instead.

use std::{collections::HashMap, sync::LazyLock};

use regex::{Captures, Regex};

static ATTACHMENT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"https://github\.com/user-attachments/assets/([0-9a-f-]{36})")
        .expect("valid attachment regex")
});

// the file name ends with the attachment id, e.g. `/1/2-<id>.png?jwt=…`
static SIGNED: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"https://private-user-images\.githubusercontent\.com/[^"\s]*?([0-9a-f-]{36})\.[A-Za-z0-9]+\?jwt=[^"\s]+"#,
    )
    .expect("valid signed url regex")
});

/// `markdown` with its attachment links swapped for the signed URLs found in `html`.
pub fn sign_attachments(markdown: &str, html: &str) -> String {
    let signed: HashMap<&str, &str> = SIGNED
        .captures_iter(html)
        .filter_map(|c| Some((c.get(1)?.as_str(), c.get(0)?.as_str())))
        .collect();

    ATTACHMENT
        .replace_all(markdown, |c: &Captures| {
            signed
                .get(&c[1])
                .map_or(c[0].to_string(), |url| url.to_string())
        })
        .into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    const ID: &str = "ad1e4ab5-1498-4d52-8cce-74ef21899490";

    #[test]
    fn swaps_attachments_for_signed_urls() {
        let markdown = format!(
            "Before\n<img alt=\"old\" src=\"https://github.com/user-attachments/assets/{ID}\" />\n![x](https://github.com/user-attachments/assets/{ID})"
        );
        let signed = format!(
            "https://private-user-images.githubusercontent.com/127/6523-{ID}.png?jwt=abc.def-ghi"
        );
        let html = format!("<p><img alt=\"old\" src=\"{signed}\"></p>");

        let result = sign_attachments(&markdown, &html);

        assert_eq!(result.matches(&signed).count(), 2);
        assert!(!result.contains("user-attachments"));
    }

    #[test]
    fn keeps_links_without_signed_url() {
        let markdown = format!("![x](https://github.com/user-attachments/assets/{ID})");

        assert_eq!(sign_attachments(&markdown, "<p></p>"), markdown);
    }
}
