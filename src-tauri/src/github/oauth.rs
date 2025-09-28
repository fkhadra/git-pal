use anyhow::{anyhow, Context};
use oauth2::basic::BasicClient;

use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, EndpointNotSet, EndpointSet,
    PkceCodeChallenge, PkceCodeVerifier, RedirectUrl, Scope, TokenResponse, TokenUrl,
};
use url::Url;

const CLIENT_ID: &str = "Ov23liM8AmuuLbQqhdUf";

// https://docs.github.com/en/enterprise-cloud@latest/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app#client-secrets
const CLIENT_SECRET: &str = "2c283461887cb1fd83664d5291b84834e638e8e4";

pub struct OAuth2Client {
    client: BasicClient<EndpointSet, EndpointNotSet, EndpointNotSet, EndpointNotSet, EndpointSet>,
    pkce_verifier: Option<PkceCodeVerifier>,
    csrf_token: Option<CsrfToken>,
}

pub struct OAuthCredentials {
    pub access_token: String,
    pub scope: Vec<String>,
}

impl OAuth2Client {
    pub fn new() -> Self {
        let client = BasicClient::new(ClientId::new(CLIENT_ID.to_string()))
            .set_auth_uri(
                AuthUrl::new("https://github.com/login/oauth/authorize".to_string()).unwrap(),
            )
            .set_client_secret(ClientSecret::new(CLIENT_SECRET.to_string()))
            .set_token_uri(
                TokenUrl::new("https://github.com/login/oauth/access_token".to_string()).unwrap(),
            )
            .set_redirect_uri(
                RedirectUrl::new("git-pal://github/auth-callback".to_string()).unwrap(),
            );

        Self {
            client: client,
            pkce_verifier: None,
            csrf_token: None,
        }
    }

    pub fn start_auth_flow(self: &mut Self) -> anyhow::Result<()> {
        let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

        self.pkce_verifier = Some(pkce_verifier);

        let (auth_url, csrf_token) = self
            .client
            .authorize_url(CsrfToken::new_random)
            .add_scope(Scope::new("repo".to_string()))
            .add_scope(Scope::new("read:org".to_string()))
            .add_scope(Scope::new("gist".to_string()))
            .add_scope(Scope::new("read:user".to_string()))
            .add_scope(Scope::new("user:email".to_string()))
            .set_pkce_challenge(pkce_challenge)
            .url();

        self.csrf_token = Some(csrf_token);

        log::debug!("Auth url {}", auth_url.as_str());

        tauri_plugin_opener::open_url(auth_url, None::<&str>)
            .with_context(|| format!("Failed to open default browser"))?;

        Ok(())
    }

    pub async fn exchange_code(
        self: &mut Self,
        callback_url: Url,
    ) -> anyhow::Result<OAuthCredentials> {
        let code = callback_url
            .query_pairs()
            .find(|(k, _)| k == "code")
            .map(|(_, v)| AuthorizationCode::new(v.into_owned()))
            .ok_or(anyhow!("No code found in callback URL"))?;
        let state = callback_url
            .query_pairs()
            .find(|(k, _)| k == "state")
            .map(|(_, v)| v.to_string())
            .ok_or(anyhow!("No state found in callback URL"))?;
        let pkce_code_verifier = self
            .pkce_verifier
            .take()
            .ok_or(anyhow!("Code verifier missing"))?;
        let csrf_token = self
            .csrf_token
            .take()
            .ok_or(anyhow!("Csrf token missing"))?
            .into_secret();

        if state != csrf_token {
            anyhow::bail!("State mismatch");
        }

        let http_client = reqwest::ClientBuilder::new()
            .redirect(reqwest::redirect::Policy::none())
            .build()
            .expect("Client should build");

        let token_result = self
            .client
            .exchange_code(code)
            .set_pkce_verifier(pkce_code_verifier)
            .request_async(&http_client)
            .await
            .with_context(|| format!("Failed to get token"))?;

        Ok(OAuthCredentials {
            access_token: token_result.access_token().to_owned().into_secret(),
            scope: token_result
                .scopes()
                .map(|v| v.iter().map(|s| s.to_string()).collect::<Vec<_>>())
                .unwrap_or_default(),
        })
    }
}
