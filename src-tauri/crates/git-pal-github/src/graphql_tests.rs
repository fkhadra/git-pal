use std::env;

use crate::github::Client;

#[tokio::test]
async fn it_load_profile() -> Result<(), Box<dyn std::error::Error>> {
    let token = env::var("GIT_PAL_TEST_TOKEN").expect("token is missing");
    let mut client = Client::new(Some(token));

    let res = client.load_user_profile().await?;

    print!("Response: {:?}", res.data);

    Ok(())
}

#[tokio::test]
async fn it_fetches_prs() -> Result<(), Box<dyn std::error::Error>> {
    let token = env::var("GIT_PAL_TEST_TOKEN").expect("token is missing");
    let client = Client::new(Some(token));

    let res = client.homepage().await?;

    print!("Response: {:?}", res.data);

    Ok(())
}
